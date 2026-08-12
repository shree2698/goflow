package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/service"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type NotificationHandler struct {
	notifService service.NotificationService
}

func NewNotificationHandler(ns service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifService: ns}
}

func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		response.Error(w, domain.ErrUnauthorized)
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	notifications, total, err := h.notifService.GetUserNotifications(r.Context(), userID, limit, offset)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data":   notifications,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}, nil)
}

func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		response.Error(w, domain.ErrUnauthorized)
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	notifIDStr := chi.URLParam(r, "id")
	notifID, err := uuid.Parse(notifIDStr)
	if err != nil {
		response.Error(w, domain.NewBadRequest("Invalid notification ID"))
		return
	}

	if err := h.notifService.MarkAsRead(r.Context(), notifID, userID); err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Notification marked as read"}, nil)
}

func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		response.Error(w, domain.ErrUnauthorized)
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	if err := h.notifService.MarkAllAsRead(r.Context(), userID); err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "All notifications marked as read"}, nil)
}

func (h *NotificationHandler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		response.Error(w, domain.ErrUnauthorized)
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	prefs, err := h.notifService.GetPreferences(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, prefs, nil)
}

func (h *NotificationHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value("user_id").(string)
	if !ok {
		response.Error(w, domain.ErrUnauthorized)
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.Error(w, domain.ErrUnauthorized)
		return
	}

	var req domain.NotificationPreference
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, domain.NewBadRequest("Invalid request payload"))
		return
	}

	if err := h.notifService.UpdatePreferences(r.Context(), userID, &req); err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, req, nil)
}
