package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/service"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type WorkflowHandler struct {
	workflowService service.WorkflowService
}

func NewWorkflowHandler(ws service.WorkflowService) *WorkflowHandler {
	return &WorkflowHandler{workflowService: ws}
}

func (h *WorkflowHandler) Create(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		response.Error(w, domain.ErrUnauthorized)
		return
	}
	creatorID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	var req domain.CreateWorkflowInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, domain.NewBadRequest("Invalid request payload"))
		return
	}

	wf, err := h.workflowService.Create(r.Context(), creatorID, &req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, wf)
}

func (h *WorkflowHandler) ListByProject(w http.ResponseWriter, r *http.Request) {
	projectIDStr := chi.URLParam(r, "projectId")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid project ID"))
		return
	}

	workflows, err := h.workflowService.ListByProject(r.Context(), projectID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, workflows, nil)
}

func (h *WorkflowHandler) ToggleActive(w http.ResponseWriter, r *http.Request) {
	workflowIDStr := chi.URLParam(r, "id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid workflow ID"))
		return
	}

	wf, err := h.workflowService.ToggleActive(r.Context(), workflowID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, wf, nil)
}

func (h *WorkflowHandler) ListExecutions(w http.ResponseWriter, r *http.Request) {
	workflowIDStr := chi.URLParam(r, "id")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid workflow ID"))
		return
	}

	executions, err := h.workflowService.ListExecutions(r.Context(), workflowID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, executions, nil)
}
