package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
	"github.com/shree2698/goflow/backend/internal/service"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type NotificationHandler struct {
	notifService service.NotificationService
}

func NewNotificationHandler(ns service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifService: ns}
}

func getNotificationUserID(r *http.Request) (uuid.UUID, error) {
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

func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID, err := getNotificationUserID(r)
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

	page := 1
	if limit > 0 {
		page = (offset / limit) + 1
	}

	response.JSON(w, http.StatusOK, notifications, &response.Meta{
		Total: int(total),
		Limit: limit,
		Page:  page,
	})
}

func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	userID, err := getNotificationUserID(r)
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
	userID, err := getNotificationUserID(r)
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
	userID, err := getNotificationUserID(r)
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
	userID, err := getNotificationUserID(r)
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
