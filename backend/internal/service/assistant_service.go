package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/config"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/repository"
	"github.com/shree2698/goflow/backend/internal/service/assistant"
	"github.com/shree2698/goflow/backend/pkg/eventbus"
)

type assistantService struct {
	assistantRepo repository.AssistantRepository
	taskRepo      repository.TaskRepository
	projectRepo   repository.ProjectRepository
	userRepo      domain.UserRepository
	eventBus      eventbus.EventBus
	intentEngine  *assistant.IntentEngine
	llmClient     assistant.LLMClient
}

func NewAssistantService(
	cfg config.AIConfig,
	assistantRepo repository.AssistantRepository,
	taskRepo repository.TaskRepository,
	projectRepo repository.ProjectRepository,
	userRepo domain.UserRepository,
	eventBus eventbus.EventBus,
) domain.AssistantService {
	return &assistantService{
		assistantRepo: assistantRepo,
		taskRepo:      taskRepo,
		projectRepo:   projectRepo,
		userRepo:      userRepo,
		eventBus:      eventBus,
		intentEngine:  assistant.NewIntentEngine(),
		llmClient:     assistant.NewLLMClient(cfg),
	}
}

func (s *assistantService) ProcessMessage(
	ctx context.Context,
	user *domain.User,
	req *domain.AssistantRequest,
) (*domain.AssistantResponse, error) {
	now := time.Now()
	isAdmin := user.Role == "admin"

	// 1. Determine tool call and intent via LLM or IntentEngine
	var detected assistant.DetectedIntent
	var llmDirectReply string

	if s.llmClient.IsConfigured() {
		systemPrompt := fmt.Sprintf(
			"You are GoFlow's AI Task Assistant. Current user is %s (%s, role: %s). Current timestamp: %s. "+
				"You help users manage and interact with their tasks using natural language. "+
				"Always call one of the provided tools (search_tasks, create_task, update_task) when user requests task actions.",
			user.FullName, user.Email, user.Role, now.Format(time.RFC3339),
		)
		dt, reply, err := s.llmClient.DetectToolCall(ctx, req.Message, req.History, systemPrompt)
		if err == nil && dt != nil {
			detected = *dt
			llmDirectReply = reply
		} else {
			// Fallback to local IntentEngine if LLM call failed or timed out
			detected = s.intentEngine.Detect(req.Message, req.Context, now)
		}
	} else {
		detected = s.intentEngine.Detect(req.Message, req.Context, now)
	}

	toolCallID := fmt.Sprintf("call_%d", time.Now().UnixNano())
	toolCalls := []domain.ToolCall{}
	toolResults := []domain.ToolResult{}

	if detected.ToolName != "" {
		toolCalls = append(toolCalls, domain.ToolCall{
			ID:        toolCallID,
			Name:      detected.ToolName,
			Arguments: detected.Arguments,
		})
	}

	resp := &domain.AssistantResponse{
		Intent:      string(detected.Type),
		ToolCalls:   toolCalls,
		ToolResults: toolResults,
		Timestamp:   time.Now(),
	}

	// 2. Execute the detected tool against TMS API and PostgreSQL
	switch detected.ToolName {
	case "search_tasks":
		return s.handleSearchTasks(ctx, user, isAdmin, req, detected, toolCallID, resp)

	case "create_task":
		return s.handleCreateTask(ctx, user, isAdmin, req, detected, toolCallID, resp, now)

	case "update_task":
		return s.handleUpdateTask(ctx, user, isAdmin, req, detected, toolCallID, resp, now)

	default:
		// General chat or help query
		if llmDirectReply != "" {
			resp.Reply = llmDirectReply
		} else {
			resp.Reply = s.formatHelpReply(user)
		}
		return resp, nil
	}
}

func (s *assistantService) handleSearchTasks(
	ctx context.Context,
	user *domain.User,
	isAdmin bool,
	req *domain.AssistantRequest,
	detected assistant.DetectedIntent,
	toolCallID string,
	resp *domain.AssistantResponse,
) (*domain.AssistantResponse, error) {
	args := detected.Arguments
	filter := repository.AssistantTaskFilter{
		UserID:  user.ID,
		IsAdmin: isAdmin,
		Limit:   20,
	}

	// Assignee filter
	if assignee, ok := args["assignee"].(string); ok {
		if assignee == "me" || strings.ToLower(assignee) == strings.ToLower(user.FullName) {
			filter.AssigneeID = &user.ID
		} else if parsedUUID, err := uuid.Parse(assignee); err == nil {
			filter.AssigneeID = &parsedUUID
		}
	}

	// Project filter
	if projName, ok := args["project_name"].(string); ok && projName != "" {
		proj, err := s.assistantRepo.FindProjectByName(ctx, projName, user.ID, isAdmin)
		if err == nil && proj != nil {
			filter.ProjectID = &proj.ID
		}
	} else if req.Context != nil && req.Context.ActiveProjectID != nil {
		filter.ProjectID = req.Context.ActiveProjectID
	}

	// Overdue filter
	if overdue, _ := args["overdue"].(bool); overdue {
		filter.OverdueOnly = true
	}

	// Prioritize today / what to work on
	if prioToday, _ := args["prioritize_today"].(bool); prioToday {
		filter.SortByPriority = true
		filter.ExcludeStatus = []string{"done", "completed", "archived"}
	}

	// Status filter
	if status, ok := args["status"].(string); ok && status != "" {
		filter.Status = status
	}

	// Priority filter
	if priority, ok := args["priority"].(string); ok && priority != "" {
		filter.Priority = priority
	}

	// Query
	if q, ok := args["query"].(string); ok && q != "" {
		filter.SearchQuery = q
	}

	// Limit
	if l, ok := args["limit"].(float64); ok && l > 0 {
		filter.Limit = int(l)
	}

	tasks, err := s.assistantRepo.FindTasks(ctx, filter)
	if err != nil {
		resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
			ToolCallID: toolCallID,
			ToolName:   "search_tasks",
			Success:    false,
			Error:      err.Error(),
		})
		resp.Reply = "I encountered an issue searching for tasks: " + err.Error()
		return resp, nil
	}

	resp.Tasks = tasks
	resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
		ToolCallID: toolCallID,
		ToolName:   "search_tasks",
		Success:    true,
		Output: map[string]any{
			"count": len(tasks),
			"tasks": tasks,
		},
	})

	// Format conversational natural reply
	if filter.OverdueOnly {
		if len(tasks) == 0 {
			resp.Reply = "🎉 Great news! You have no overdue tasks assigned to you right now."
		} else {
			resp.Reply = fmt.Sprintf("⚠️ You have **%d overdue task%s** assigned to you:", len(tasks), plural(len(tasks)))
		}
	} else if detected.Type == assistant.IntentPrioritize {
		if len(tasks) == 0 {
			resp.Reply = "🌟 Your plate is completely clear! No active pending tasks assigned to you today. Take a breather or create a new task!"
		} else {
			var sb strings.Builder
			sb.WriteString(fmt.Sprintf("📋 Here is your recommended work focus today (**%d active task%s** prioritized):\n\n", len(tasks), plural(len(tasks))))
			resp.Reply = sb.String()
		}
	} else {
		if len(tasks) == 0 {
			resp.Reply = "I couldn't find any tasks matching your criteria."
		} else {
			resp.Reply = fmt.Sprintf("Found **%d task%s** matching your request:", len(tasks), plural(len(tasks)))
		}
	}

	return resp, nil
}

func (s *assistantService) handleCreateTask(
	ctx context.Context,
	user *domain.User,
	isAdmin bool,
	req *domain.AssistantRequest,
	detected assistant.DetectedIntent,
	toolCallID string,
	resp *domain.AssistantResponse,
	now time.Time,
) (*domain.AssistantResponse, error) {
	args := detected.Arguments

	title, _ := args["title"].(string)
	title = strings.TrimSpace(title)
	if title == "" {
		title = "New Task"
	}

	description, _ := args["description"].(string)
	priorityStr, _ := args["priority"].(string)
	if priorityStr == "" {
		priorityStr = "medium"
	}
	statusStr, _ := args["status"].(string)
	if statusStr == "" {
		statusStr = "todo"
	}

	// Resolve Project
	var targetProject *domain.Project
	if projName, ok := args["project_name"].(string); ok && projName != "" {
		proj, err := s.assistantRepo.FindProjectByName(ctx, projName, user.ID, isAdmin)
		if err == nil {
			targetProject = proj
		}
	} else if projIDStr, ok := args["project_id"].(string); ok && projIDStr != "" {
		if pID, err := uuid.Parse(projIDStr); err == nil {
			proj, err := s.projectRepo.GetByID(ctx, pID)
			if err == nil {
				targetProject = proj
			}
		}
	} else if req.Context != nil && req.Context.ActiveProjectID != nil {
		proj, err := s.projectRepo.GetByID(ctx, *req.Context.ActiveProjectID)
		if err == nil {
			targetProject = proj
		}
	}

	if targetProject == nil {
		// Use user's default/first available project
		defaultProj, err := s.assistantRepo.GetUserDefaultProject(ctx, user.ID, isAdmin)
		if err == nil && defaultProj != nil {
			targetProject = defaultProj
		} else {
			resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
				ToolCallID: toolCallID,
				ToolName:   "create_task",
				Success:    false,
				Error:      "No project available to create the task in",
			})
			resp.Reply = "I couldn't determine which project to add this task to. Please create a project first or specify the project name."
			return resp, nil
		}
	}

	// Parse Due Date
	var dueDate *time.Time
	if dueStr, ok := args["due_date"].(string); ok && dueStr != "" {
		if parsed, err := time.Parse(time.RFC3339, dueStr); err == nil {
			dueDate = &parsed
		} else {
			dueDate = assistant.ParseNaturalDate(dueStr, now)
		}
	} else if dueStrRaw, ok := args["due_date_str"].(string); ok && dueStrRaw != "" {
		dueDate = assistant.ParseNaturalDate(dueStrRaw, now)
	}

	// Resolve Assignee
	var assigneeID *uuid.UUID
	assigneeName := "Unassigned"
	if assigneeStr, ok := args["assignee"].(string); ok && assigneeStr != "" {
		if assigneeStr == "me" || strings.ToLower(assigneeStr) == strings.ToLower(user.FullName) {
			assigneeID = &user.ID
			assigneeName = user.FullName
		}
	} else {
		// Default to assigning to creator for convenience
		assigneeID = &user.ID
		assigneeName = user.FullName
	}

	tags := []string{}
	if rawTags, ok := args["tags"].([]any); ok {
		for _, rt := range rawTags {
			if s, ok := rt.(string); ok && s != "" {
				tags = append(tags, s)
			}
		}
	}

	task := &domain.Task{
		ID:          uuid.New(),
		ProjectID:   targetProject.ID,
		Title:       title,
		Description: description,
		Status:      domain.TaskStatus(statusStr),
		Priority:    domain.TaskPriority(priorityStr),
		DueDate:     dueDate,
		CreatorID:   &user.ID,
		AssigneeID:  assigneeID,
		Tags:        tags,
	}

	if err := s.taskRepo.Create(ctx, task); err != nil {
		resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
			ToolCallID: toolCallID,
			ToolName:   "create_task",
			Success:    false,
			Error:      err.Error(),
		})
		resp.Reply = "Failed to create task: " + err.Error()
		return resp, nil
	}

	// Publish EventBus event
	if s.eventBus != nil {
		s.eventBus.Publish(domain.Event{
			ID:        uuid.New(),
			Type:      "TASK_CREATED",
			ProjectID: task.ProjectID,
			Payload: map[string]any{
				"task_id":  task.ID.String(),
				"title":    task.Title,
				"status":   string(task.Status),
				"priority": string(task.Priority),
			},
			Timestamp: time.Now(),
		})
	}

	createdAssistantTask := &domain.AssistantTask{
		ID:           task.ID,
		ProjectID:    task.ProjectID,
		ProjectName:  targetProject.Name,
		Title:        task.Title,
		Description:  task.Description,
		Status:       task.Status,
		Priority:     task.Priority,
		DueDate:      task.DueDate,
		AssigneeID:   task.AssigneeID,
		AssigneeName: assigneeName,
		Tags:         task.Tags,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	resp.CreatedTask = createdAssistantTask
	resp.Tasks = []domain.AssistantTask{*createdAssistantTask}
	resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
		ToolCallID: toolCallID,
		ToolName:   "create_task",
		Success:    true,
		Output:     createdAssistantTask,
	})

	dueMsg := ""
	if dueDate != nil {
		dueMsg = fmt.Sprintf(", due **%s**", dueDate.Format("Monday, Jan 02"))
	}

	resp.Reply = fmt.Sprintf(
		"✅ Created task **%s** in project **%s** (Priority: `%s`%s).",
		task.Title, targetProject.Name, task.Priority, dueMsg,
	)

	return resp, nil
}

func (s *assistantService) handleUpdateTask(
	ctx context.Context,
	user *domain.User,
	isAdmin bool,
	req *domain.AssistantRequest,
	detected assistant.DetectedIntent,
	toolCallID string,
	resp *domain.AssistantResponse,
	now time.Time,
) (*domain.AssistantResponse, error) {
	args := detected.Arguments

	isBatch, _ := args["batch"].(bool)

	// A) BATCH OPERATION: "Move all completed tasks from Project A to archived."
	if isBatch || detected.Type == assistant.IntentBatchUpdate {
		projName, _ := args["project_name"].(string)
		filterStatus, _ := args["filter_status"].(string)
		targetStatus, _ := args["target_status"].(string)

		if filterStatus == "" {
			filterStatus = "done"
		}
		if targetStatus == "" {
			targetStatus = "archived"
		}

		var project *domain.Project
		if projName != "" {
			p, err := s.assistantRepo.FindProjectByName(ctx, projName, user.ID, isAdmin)
			if err == nil {
				project = p
			}
		} else if req.Context != nil && req.Context.ActiveProjectID != nil {
			p, err := s.projectRepo.GetByID(ctx, *req.Context.ActiveProjectID)
			if err == nil {
				project = p
			}
		}

		if project == nil {
			resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
				ToolCallID: toolCallID,
				ToolName:   "update_task",
				Success:    false,
				Error:      "Target project not found",
			})
			resp.Reply = "I couldn't find the project mentioned for batch moving. Please specify an existing project name."
			return resp, nil
		}

		// Map filter status variations (e.g. 'completed' and 'done')
		sourceStatuses := []string{filterStatus}
		if filterStatus == "done" || filterStatus == "completed" {
			sourceStatuses = []string{"done", "completed"}
		}

		updatedTasks, count, err := s.assistantRepo.BatchUpdateStatus(ctx, project.ID, sourceStatuses, targetStatus)
		if err != nil {
			resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
				ToolCallID: toolCallID,
				ToolName:   "update_task",
				Success:    false,
				Error:      err.Error(),
			})
			resp.Reply = "Failed to perform batch update: " + err.Error()
			return resp, nil
		}

		for i := range updatedTasks {
			updatedTasks[i].ProjectName = project.Name
		}

		resp.BatchSummary = &domain.BatchSummary{
			Count:        count,
			ProjectName:  project.Name,
			SourceStatus: filterStatus,
			TargetStatus: targetStatus,
		}
		resp.Tasks = updatedTasks
		resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
			ToolCallID: toolCallID,
			ToolName:   "update_task",
			Success:    true,
			Output:     resp.BatchSummary,
		})

		if count == 0 {
			resp.Reply = fmt.Sprintf("ℹ️ No **%s** tasks found in project **%s** to move to **%s**.", filterStatus, project.Name, targetStatus)
		} else {
			resp.Reply = fmt.Sprintf("📦 Successfully moved **%d %s task%s** from project **%s** to **%s**.", count, filterStatus, plural(count), project.Name, targetStatus)
		}

		return resp, nil
	}

	// B) SINGLE TASK UPDATE
	var task *domain.AssistantTask
	if taskIDStr, ok := args["task_id"].(string); ok && taskIDStr != "" {
		if tID, err := uuid.Parse(taskIDStr); err == nil {
			existing, err := s.taskRepo.GetByID(ctx, tID)
			if err == nil {
				task = &domain.AssistantTask{
					ID:        existing.ID,
					ProjectID: existing.ProjectID,
					Title:     existing.Title,
					Status:    existing.Status,
					Priority:  existing.Priority,
				}
			}
		}
	} else if taskTitle, ok := args["task_title"].(string); ok && taskTitle != "" {
		found, err := s.assistantRepo.FindTaskByTitle(ctx, taskTitle, user.ID, isAdmin)
		if err == nil {
			task = found
		}
	}

	if task == nil {
		resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
			ToolCallID: toolCallID,
			ToolName:   "update_task",
			Success:    false,
			Error:      "Task not found",
		})
		resp.Reply = "I couldn't locate the specified task to update. Please provide the exact title or task ID."
		return resp, nil
	}

	if statusStr, ok := args["status"].(string); ok && statusStr != "" {
		task.Status = domain.TaskStatus(statusStr)
		_ = s.taskRepo.UpdateStatus(ctx, task.ID, statusStr)
	}

	resp.Tasks = []domain.AssistantTask{*task}
	resp.ToolResults = append(resp.ToolResults, domain.ToolResult{
		ToolCallID: toolCallID,
		ToolName:   "update_task",
		Success:    true,
		Output:     task,
	})

	resp.Reply = fmt.Sprintf("✅ Updated task **%s** (Status: `%s`).", task.Title, task.Status)
	return resp, nil
}

func (s *assistantService) GetSuggestions(ctx context.Context, user *domain.User) ([]domain.AssistantSuggestion, error) {
	return []domain.AssistantSuggestion{
		{
			Title:       "Check Overdue Tasks",
			Prompt:      "Show me all overdue tasks assigned to me.",
			Category:    "search",
			Description: "Quickly view urgent tasks that have passed their deadline",
		},
		{
			Title:       "Today's Priority Agenda",
			Prompt:      "What should I work on today?",
			Category:    "work",
			Description: "Get an intelligent prioritized focus list for today",
		},
		{
			Title:       "Create High Priority Task",
			Prompt:      "Create a task to update the payment API, high priority, due Friday.",
			Category:    "create",
			Description: "Quick natural language task creation with priority and due date",
		},
		{
			Title:       "Archive Completed Tasks",
			Prompt:      "Move all completed tasks from Core Platform & API to archived.",
			Category:    "batch",
			Description: "Perform batch status transitions across an entire project",
		},
	}, nil
}

func (s *assistantService) formatHelpReply(user *domain.User) string {
	return fmt.Sprintf(
		"Hello %s! 🤖 I'm your **GoFlow AI Task Assistant**.\n\n"+
			"You can interact with your tasks and projects in plain English! Here are a few examples you can try:\n\n"+
			"- 🚨 `Show me all overdue tasks assigned to me.`\n"+
			"- 🎯 `What should I work on today?`\n"+
			"- ➕ `Create a task to update the payment API, high priority, due Friday.`\n"+
			"- 📦 `Move all completed tasks from Project A to archived.`\n\n"+
			"Just type a question or command below!",
		user.FullName,
	)
}

func plural(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}
