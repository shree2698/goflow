package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
	"github.com/shree2698/goflow/backend/pkg/crypto"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type UserHandler struct {
	userRepo domain.UserRepository
}

func NewUserHandler(userRepo domain.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(middleware.UserIDKey)
	if userIDVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := userIDVal.(uuid.UUID)
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value(middleware.UserIDKey)
	if userIDVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := userIDVal.(uuid.UUID)
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get user", http.StatusInternalServerError)
		return
	}

	var req struct {
		FullName  *string `json:"full_name"`
		AvatarURL *string `json:"avatar_url"`
		Timezone  *string `json:"timezone"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.FullName != nil {
		user.FullName = *req.FullName
	}
	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}
	if req.Timezone != nil {
		user.Timezone = *req.Timezone
	}

	if err := h.userRepo.Update(user); err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "data": user})
}

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.ListAll()
	if err != nil {
		http.Error(w, "Failed to list users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    users,
	})
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
		Role     string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" {
		http.Error(w, "email, password, and full_name are required", http.StatusBadRequest)
		return
	}

	role := "employee"
	if req.Role != "" {
		role = req.Role
	}

	// Hash password
	hashedPassword, err := crypto.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	user := &domain.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FullName:     req.FullName,
		Role:         role,
		Timezone:     "UTC",
	}

	if err := h.userRepo.Create(user); err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    user,
	})
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	user, err := h.userRepo.GetByID(targetID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to find user", http.StatusInternalServerError)
		return
	}

	var req struct {
		FullName *string `json:"full_name"`
		Email    *string `json:"email"`
		Password *string `json:"password"`
		Role     *string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.FullName != nil {
		user.FullName = *req.FullName
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.Password != nil && *req.Password != "" {
		hashedPassword, err := crypto.HashPassword(*req.Password)
		if err != nil {
			http.Error(w, "Failed to process password", http.StatusInternalServerError)
			return
		}
		user.PasswordHash = hashedPassword
	}

	if err := h.userRepo.Update(user); err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    user,
	})
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.userRepo.Delete(targetID); err != nil {
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Employee deleted successfully",
	})
}
