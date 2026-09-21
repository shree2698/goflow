package handler

import (
	"encoding/json"
	"net/http"

	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type AssistantHandler struct {
	assistantService domain.AssistantService
	userRepo         domain.UserRepository
}

func NewAssistantHandler(as domain.AssistantService, ur domain.UserRepository) *AssistantHandler {
	return &AssistantHandler{
		assistantService: as,
		userRepo:         ur,
	}
}

// ProcessMessage handles POST /api/v1/ai/assistant
func (h *AssistantHandler) ProcessMessage(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil || user == nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	var req domain.AssistantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, domain.NewBadRequest("Invalid request body"))
		return
	}

	if req.Message == "" {
		response.Error(w, domain.NewBadRequest("Message cannot be empty"))
		return
	}

	resp, err := h.assistantService.ProcessMessage(r.Context(), user, &req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, resp, nil)
}

// GetSuggestions handles GET /api/v1/ai/assistant/suggestions
func (h *AssistantHandler) GetSuggestions(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil || user == nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	suggestions, err := h.assistantService.GetSuggestions(r.Context(), user)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, suggestions, nil)
}
