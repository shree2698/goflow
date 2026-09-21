package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
	"github.com/shree2698/goflow/backend/internal/repository"
	"github.com/shree2698/goflow/backend/pkg/eventbus"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type ProjectHandler struct {
	projectRepo repository.ProjectRepository
	taskRepo    repository.TaskRepository
	userRepo    domain.UserRepository
	eventBus    eventbus.EventBus
}

func NewProjectHandler(
	projectRepo repository.ProjectRepository,
	taskRepo repository.TaskRepository,
	userRepo domain.UserRepository,
	eventBus eventbus.EventBus,
) *ProjectHandler {
	return &ProjectHandler{
		projectRepo: projectRepo,
		taskRepo:    taskRepo,
		userRepo:    userRepo,
		eventBus:    eventBus,
	}
}

func getUserID(r *http.Request) (uuid.UUID, error) {
	val := r.Context().Value(middleware.UserIDKey)
	switch v := val.(type) {
	case uuid.UUID:
		return v, nil
	case string:
		return uuid.Parse(v)
	default:
		return uuid.Nil, domain.ErrUnauthorized
	}
}

// ListProjects handles GET /api/v1/projects
func (h *ProjectHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err == nil && user != nil && user.Role == "admin" {
		// Admin sees all projects
		projects, err := h.projectRepo.ListByUser(r.Context(), userID)
		if err != nil {
			response.Error(w, err)
			return
		}
		response.JSON(w, http.StatusOK, projects, nil)
		return
	}

	projects, err := h.projectRepo.ListByUser(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, projects, nil)
}

// GetProject handles GET /api/v1/projects/{id}
func (h *ProjectHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid project ID"))
		return
	}

	project, err := h.projectRepo.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, project, nil)
}

// CreateProject handles POST /api/v1/projects
func (h *ProjectHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, domain.NewBadRequest("Invalid request body"))
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		response.Error(w, domain.NewBadRequest("Project name is required"))
		return
	}

	if req.Color == "" {
		req.Color = "#6366F1"
	}

	p := &domain.Project{
		ID:          uuid.New(),
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		Status:      domain.ProjectStatusActive,
		OwnerID:     userID,
	}

	if err := h.projectRepo.Create(r.Context(), p); err != nil {
		response.Error(w, err)
		return
	}

	// Add creator as member with role OWNER
	_ = h.projectRepo.AddMember(r.Context(), &domain.ProjectMember{
		ProjectID: p.ID,
		UserID:    userID,
		Role:      domain.ProjectRoleOwner,
	})

	response.Created(w, p)
}

// ListTasks handles GET /api/v1/projects/{id}/tasks
func (h *ProjectHandler) ListTasks(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	projectID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid project ID"))
		return
	}

	tasks, err := h.taskRepo.ListByProject(r.Context(), projectID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, tasks, nil)
}

// CreateTask handles POST /api/v1/projects/{id}/tasks
func (h *ProjectHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	projectIDStr := chi.URLParam(r, "id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid project ID"))
		return
	}

	var req struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Status      string   `json:"status"`
		Priority    string   `json:"priority"`
		AssigneeID  *string  `json:"assignee_id"`
		Tags        []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, domain.NewBadRequest("Invalid request body"))
		return
	}

	if strings.TrimSpace(req.Title) == "" {
		response.Error(w, domain.NewBadRequest("Task title is required"))
		return
	}

	if req.Status == "" {
		req.Status = "TODO"
	}
	if req.Priority == "" {
		req.Priority = "medium"
	}

	var assigneeUUID *uuid.UUID
	if req.AssigneeID != nil && *req.AssigneeID != "" {
		parsed, err := uuid.Parse(*req.AssigneeID)
		if err == nil {
			assigneeUUID = &parsed
		}
	}

	task := &domain.Task{
		ID:          uuid.New(),
		ProjectID:   projectID,
		Title:       req.Title,
		Description: req.Description,
		Status:      domain.TaskStatus(req.Status),
		Priority:    domain.TaskPriority(req.Priority),
		CreatorID:   &userID,
		AssigneeID:  assigneeUUID,
		Tags:        req.Tags,
	}

	if err := h.taskRepo.Create(r.Context(), task); err != nil {
		response.Error(w, err)
		return
	}

	if h.eventBus != nil {
		h.eventBus.Publish(domain.Event{
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

	response.Created(w, task)
}

// UpdateTask handles PATCH /api/v1/tasks/{id}
func (h *ProjectHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	taskIDStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(taskIDStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid task ID"))
		return
	}

	var req struct {
		Title       *string  `json:"title"`
		Description *string  `json:"description"`
		Status      *string  `json:"status"`
		Priority    *string  `json:"priority"`
		AssigneeID  *string  `json:"assignee_id"`
		Tags        []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, domain.NewBadRequest("Invalid request body"))
		return
	}

	task, err := h.taskRepo.GetByID(r.Context(), taskID)
	if err != nil {
		response.Error(w, err)
		return
	}

	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = *req.Description
	}
	if req.Status != nil {
		task.Status = domain.TaskStatus(*req.Status)
	}
	if req.Priority != nil {
		task.Priority = domain.TaskPriority(*req.Priority)
	}
	if req.Tags != nil {
		task.Tags = req.Tags
	}
	if req.AssigneeID != nil {
		if *req.AssigneeID == "" {
			task.AssigneeID = nil
		} else if parsed, err := uuid.Parse(*req.AssigneeID); err == nil {
			task.AssigneeID = &parsed
		}
	}

	if err := h.taskRepo.Update(r.Context(), task); err != nil {
		response.Error(w, err)
		return
	}

	if req.Status != nil {
		_ = h.taskRepo.UpdateStatus(r.Context(), taskID, *req.Status)
	}

	if h.eventBus != nil {
		h.eventBus.Publish(domain.Event{
			ID:        uuid.New(),
			Type:      "TASK_UPDATED",
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

	response.JSON(w, http.StatusOK, task, nil)
}

// DeleteTask handles DELETE /api/v1/tasks/{id}
func (h *ProjectHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	taskIDStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(taskIDStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid task ID"))
		return
	}

	task, _ := h.taskRepo.GetByID(r.Context(), taskID)

	if err := h.taskRepo.Delete(r.Context(), taskID); err != nil {
		response.Error(w, err)
		return
	}

	if h.eventBus != nil && task != nil {
		h.eventBus.Publish(domain.Event{
			ID:        uuid.New(),
			Type:      "TASK_DELETED",
			ProjectID: task.ProjectID,
			Payload: map[string]any{
				"task_id": taskID.String(),
			},
			Timestamp: time.Now(),
		})
	}

	response.NoContent(w)
}
