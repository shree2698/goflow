package assistant

import (
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
)

// IntentType represents detected intent
type IntentType string

const (
	IntentSearchTasks   IntentType = "search_tasks"
	IntentPrioritize    IntentType = "prioritize_tasks"
	IntentCreateTask    IntentType = "create_task"
	IntentUpdateTask    IntentType = "update_task"
	IntentBatchUpdate   IntentType = "batch_update_tasks"
	IntentHelpOrGeneral IntentType = "general_chat"
)

// DetectedIntent holds the recognized intent and extracted arguments
type DetectedIntent struct {
	Type      IntentType
	ToolName  string
	Arguments map[string]any
}

// IntentEngine detects intents and extracts arguments deterministically
type IntentEngine struct{}

func NewIntentEngine() *IntentEngine {
	return &IntentEngine{}
}

// Detect analyzes the prompt message and extracts intent and tool call arguments
func (e *IntentEngine) Detect(message string, ctx *domain.AssistantContext, now time.Time) DetectedIntent {
	text := strings.TrimSpace(message)
	lower := strings.ToLower(text)

	// 1. Batch Update: "Move all completed tasks from Project A to archived."
	// or "Archive all done tasks in Project A"
	if batchIntent, ok := e.detectBatchUpdate(text, lower); ok {
		return batchIntent
	}

	// 2. What should I work on today?
	if e.isWorkRecommendationQuery(lower) {
		return DetectedIntent{
			Type:     IntentPrioritize,
			ToolName: "search_tasks",
			Arguments: map[string]any{
				"assignee":          "me",
				"prioritize_today":  true,
				"exclude_completed": true,
				"limit":             10,
			},
		}
	}

	// 3. Create Task: "Create a task to update the payment API, high priority, due Friday."
	if createIntent, ok := e.detectCreateTask(text, lower, ctx, now); ok {
		return createIntent
	}

	// 4. Update Single Task: "Mark 'Fix login bug' as done", "Complete task X"
	if updateIntent, ok := e.detectSingleUpdate(text, lower); ok {
		return updateIntent
	}

	// 5. Search / Overdue Tasks: "Show me all overdue tasks assigned to me."
	if searchIntent, ok := e.detectSearchTasks(text, lower); ok {
		return searchIntent
	}

	// 6. Help / General Chat
	if lower == "help" || lower == "hi" || lower == "hello" || strings.Contains(lower, "what can you do") {
		return DetectedIntent{
			Type:      IntentHelpOrGeneral,
			ToolName:  "",
			Arguments: map[string]any{},
		}
	}

	// Fallback to search if query contains search keywords or just generic text
	return DetectedIntent{
		Type:     IntentSearchTasks,
		ToolName: "search_tasks",
		Arguments: map[string]any{
			"query": text,
			"limit": 10,
		},
	}
}

func (e *IntentEngine) isWorkRecommendationQuery(lower string) bool {
	patterns := []string{
		"what should i work on",
		"what to work on",
		"what should i focus on",
		"priorities today",
		"work on today",
		"tasks for today",
		"what is on my plate",
		"what's on my plate",
		"what to do today",
		"recommend tasks",
		"agenda today",
	}
	for _, p := range patterns {
		if strings.Contains(lower, p) {
			return true
		}
	}
	return false
}

func (e *IntentEngine) detectBatchUpdate(original, lower string) (DetectedIntent, bool) {
	// Pattern 1: "Move all completed tasks from Project A to archived"
	// Pattern 2: "Move done tasks in Project X to archived"
	// Pattern 3: "Archive all completed tasks from Project A"
	isBatch := strings.Contains(lower, "move all") ||
		strings.Contains(lower, "archive all") ||
		(strings.Contains(lower, "all completed tasks") && strings.Contains(lower, "to")) ||
		(strings.Contains(lower, "all done tasks") && strings.Contains(lower, "to")) ||
		(strings.Contains(lower, "move") && strings.Contains(lower, "tasks from") && strings.Contains(lower, "to"))

	if !isBatch {
		return DetectedIntent{}, false
	}

	args := map[string]any{
		"batch":         true,
		"filter_status": "done",     // default completed/done
		"target_status": "archived", // default target
	}

	// Determine filter status
	if strings.Contains(lower, "completed") || strings.Contains(lower, "done") {
		args["filter_status"] = "done"
	} else if strings.Contains(lower, "todo") {
		args["filter_status"] = "todo"
	} else if strings.Contains(lower, "in_progress") || strings.Contains(lower, "in progress") {
		args["filter_status"] = "in_progress"
	}

	// Determine target status
	if strings.Contains(lower, "to archived") || strings.Contains(lower, "archive all") || strings.Contains(lower, "as archived") {
		args["target_status"] = "archived"
	} else if strings.Contains(lower, "to done") || strings.Contains(lower, "to completed") {
		args["target_status"] = "done"
	}

	// Extract project name: "from <Project Name> to" or "in <Project Name> to"
	reFromTo := regexp.MustCompile(`(?i)(?:from|in)\s+["']?([^"'\n]+?)["']?\s+to\s+`)
	if match := reFromTo.FindStringSubmatch(original); len(match) > 1 {
		args["project_name"] = strings.TrimSpace(match[1])
	} else {
		// "Archive all completed tasks in/from Project A"
		reInFromEnd := regexp.MustCompile(`(?i)(?:from|in)\s+["']?([^"'\n\.]+)["']?$`)
		if match := reInFromEnd.FindStringSubmatch(original); len(match) > 1 {
			args["project_name"] = strings.TrimSpace(match[1])
		}
	}

	return DetectedIntent{
		Type:      IntentBatchUpdate,
		ToolName:  "update_task",
		Arguments: args,
	}, true
}

func (e *IntentEngine) detectCreateTask(
	original, lower string,
	ctx *domain.AssistantContext,
	now time.Time,
) (DetectedIntent, bool) {
	isCreate := strings.HasPrefix(lower, "create a task") ||
		strings.HasPrefix(lower, "create task") ||
		strings.HasPrefix(lower, "add a task") ||
		strings.HasPrefix(lower, "add task") ||
		strings.HasPrefix(lower, "new task") ||
		strings.HasPrefix(lower, "schedule a task") ||
		strings.HasPrefix(lower, "schedule task")

	if !isCreate {
		return DetectedIntent{}, false
	}

	args := map[string]any{
		"priority": "medium",
		"status":   "todo",
	}

	// Extract Priority
	if strings.Contains(lower, "urgent") {
		args["priority"] = "urgent"
	} else if strings.Contains(lower, "high priority") || strings.Contains(lower, "priority: high") || strings.Contains(lower, "high") {
		args["priority"] = "high"
	} else if strings.Contains(lower, "low priority") || strings.Contains(lower, "priority: low") || strings.Contains(lower, "low") {
		args["priority"] = "low"
	}

	// Extract Due Date
	// Check for "due <date>" or "by <date>"
	dueRegex := regexp.MustCompile(`(?i)\b(?:due(?:\s+date)?|by)\s+([a-zA-Z0-9\/\-]+(?:\s+[a-zA-Z0-9]+)?)`)
	if match := dueRegex.FindStringSubmatch(original); len(match) > 1 {
		dueStr := strings.TrimSpace(match[1])
		// Avoid picking up "high" or "priority" if user wrote "due Friday, high priority"
		dueStr = strings.Split(dueStr, ",")[0]
		dueTime := ParseNaturalDate(dueStr, now)
		if dueTime != nil {
			args["due_date"] = dueTime.Format(time.RFC3339)
			args["due_date_str"] = match[1]
		}
	}

	// Extract Project
	projRegex := regexp.MustCompile(`(?i)(?:in|for)\s+project\s+["']?([^"',\n]+)["']?`)
	if match := projRegex.FindStringSubmatch(original); len(match) > 1 {
		args["project_name"] = strings.TrimSpace(match[1])
	} else if ctx != nil && ctx.ActiveProjectID != nil {
		args["project_id"] = ctx.ActiveProjectID.String()
		if ctx.ActiveProjectName != "" {
			args["project_name"] = ctx.ActiveProjectName
		}
	}

	// Extract Title: clean up prefix like "create a task to " / "create task: "
	clean := original
	clean = regexp.MustCompile(`(?i)^create(?:\s+a)?\s+task(?:\s+to)?(?::)?\s*`).ReplaceAllString(clean, "")
	clean = regexp.MustCompile(`(?i)^add(?:\s+a)?\s+task(?:\s+to)?(?::)?\s*`).ReplaceAllString(clean, "")
	clean = regexp.MustCompile(`(?i)^new\s+task(?::)?\s*`).ReplaceAllString(clean, "")

	// Strip priority, due date, project phrases from title
	clean = regexp.MustCompile(`(?i),?\s*\b(?:high|urgent|medium|low)\s+priority\b`).ReplaceAllString(clean, "")
	clean = regexp.MustCompile(`(?i),?\s*\b(?:due|by)\s+[a-zA-Z0-9\/\-]+(?:\s+[a-zA-Z0-9]+)?`).ReplaceAllString(clean, "")
	clean = regexp.MustCompile(`(?i),?\s*\b(?:in|for)\s+project\s+["']?[^"',\n]+["']?`).ReplaceAllString(clean, "")
	clean = strings.Trim(clean, " ,.\t\n")

	// Capitalize title
	if len(clean) > 0 {
		clean = strings.ToUpper(clean[:1]) + clean[1:]
	} else {
		clean = "New Task"
	}
	args["title"] = clean

	return DetectedIntent{
		Type:      IntentCreateTask,
		ToolName:  "create_task",
		Arguments: args,
	}, true
}

func (e *IntentEngine) detectSingleUpdate(original, lower string) (DetectedIntent, bool) {
	// "Mark 'X' as done", "Complete task X", "Set priority of X to high"
	if strings.HasPrefix(lower, "mark ") || strings.HasPrefix(lower, "complete ") || strings.Contains(lower, "as done") || strings.Contains(lower, "as completed") {
		args := map[string]any{}

		if strings.Contains(lower, "done") || strings.Contains(lower, "completed") || strings.HasPrefix(lower, "complete") {
			args["status"] = "done"
		} else if strings.Contains(lower, "in_progress") || strings.Contains(lower, "in progress") {
			args["status"] = "in_progress"
		} else if strings.Contains(lower, "archived") {
			args["status"] = "archived"
		}

		// Extract task title between quotes or after mark/complete
		reQuote := regexp.MustCompile(`["']([^"']+)["']`)
		if match := reQuote.FindStringSubmatch(original); len(match) > 1 {
			args["task_title"] = strings.TrimSpace(match[1])
		} else {
			clean := original
			clean = regexp.MustCompile(`(?i)^mark\s+(?:task\s+)?`).ReplaceAllString(clean, "")
			clean = regexp.MustCompile(`(?i)^complete\s+(?:task\s+)?`).ReplaceAllString(clean, "")
			clean = regexp.MustCompile(`(?i)\s+as\s+(?:done|completed|archived|in_progress|todo).*$`).ReplaceAllString(clean, "")
			clean = strings.Trim(clean, " ,.\t\n")
			if clean != "" {
				args["task_title"] = clean
			}
		}

		if _, hasTitle := args["task_title"]; hasTitle {
			return DetectedIntent{
				Type:      IntentUpdateTask,
				ToolName:  "update_task",
				Arguments: args,
			}, true
		}
	}

	return DetectedIntent{}, false
}

func (e *IntentEngine) detectSearchTasks(original, lower string) (DetectedIntent, bool) {
	args := map[string]any{
		"limit": 20,
	}

	// Check overdue
	if strings.Contains(lower, "overdue") || strings.Contains(lower, "past due") || strings.Contains(lower, "late") {
		args["overdue"] = true
	}

	// Check assignee ("assigned to me", "my tasks", "mine")
	if strings.Contains(lower, "assigned to me") || strings.Contains(lower, "my tasks") || strings.Contains(lower, "for me") || strings.Contains(lower, "mine") {
		args["assignee"] = "me"
	}

	// Check due today
	if strings.Contains(lower, "due today") || strings.Contains(lower, "today's tasks") {
		args["due_filter"] = "today"
	}

	// Status filter
	if strings.Contains(lower, "completed") || strings.Contains(lower, "done") {
		args["status"] = "done"
	} else if strings.Contains(lower, "in progress") || strings.Contains(lower, "in_progress") {
		args["status"] = "in_progress"
	} else if strings.Contains(lower, "todo") || strings.Contains(lower, "to-do") {
		args["status"] = "todo"
	}

	// Priority filter
	if strings.Contains(lower, "urgent") {
		args["priority"] = "urgent"
	} else if strings.Contains(lower, "high priority") {
		args["priority"] = "high"
	}

	// Query extraction (e.g. "search for X" or "find tasks about X")
	reSearch := regexp.MustCompile(`(?i)(?:search for|find tasks about|find tasks with|look for)\s+["']?([^"'\n\.]+)["']?`)
	if match := reSearch.FindStringSubmatch(original); len(match) > 1 {
		args["query"] = strings.TrimSpace(match[1])
	}

	// Extract project name if specified e.g. "in project X"
	reProj := regexp.MustCompile(`(?i)(?:in|from)\s+project\s+["']?([^"'\n\.,]+)["']?`)
	if match := reProj.FindStringSubmatch(original); len(match) > 1 {
		args["project_name"] = strings.TrimSpace(match[1])
	}

	isSearch := strings.Contains(lower, "show") ||
		strings.Contains(lower, "list") ||
		strings.Contains(lower, "find") ||
		strings.Contains(lower, "search") ||
		strings.Contains(lower, "overdue") ||
		strings.Contains(lower, "tasks")

	if isSearch {
		return DetectedIntent{
			Type:      IntentSearchTasks,
			ToolName:  "search_tasks",
			Arguments: args,
		}, true
	}

	return DetectedIntent{}, false
}

func StringPtr(s string) *string {
	return &s
}

func UUIDPtr(u uuid.UUID) *uuid.UUID {
	return &u
}
