package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
	"github.com/shree2698/goflow/backend/pkg/crypto"
)

type mockUserRepo struct {
	users map[uuid.UUID]*domain.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[uuid.UUID]*domain.User)}
}

func (m *mockUserRepo) Create(user *domain.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) GetByID(id uuid.UUID) (*domain.User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (m *mockUserRepo) GetByEmail(email string) (*domain.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) ListAll() ([]*domain.User, error) {
	var list []*domain.User
	for _, u := range m.users {
		list = append(list, u)
	}
	return list, nil
}

func (m *mockUserRepo) Update(user *domain.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) Delete(id uuid.UUID) error {
	delete(m.users, id)
	return nil
}

func TestUserHandler_GetMe(t *testing.T) {
	repo := newMockUserRepo()
	handler := NewUserHandler(repo)

	testUser := &domain.User{
		ID:       uuid.New(),
		Email:    "test@example.com",
		FullName: "Test User",
		Role:     "member",
	}
	_ = repo.Create(testUser)

	t.Run("unauthorized without context user", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/users/me", nil)
		rr := httptest.NewRecorder()
		handler.GetMe(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rr.Code)
		}
	})

	t.Run("success with authenticated context", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/users/me", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, testUser.ID)
		rr := httptest.NewRecorder()
		handler.GetMe(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}

		var resp domain.User
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.Email != testUser.Email {
			t.Errorf("expected email %s, got %s", testUser.Email, resp.Email)
		}
	})
}

func TestUserHandler_ListUsers(t *testing.T) {
	repo := newMockUserRepo()
	handler := NewUserHandler(repo)

	_ = repo.Create(&domain.User{ID: uuid.New(), Email: "u1@example.com", FullName: "U1", Role: "admin"})
	_ = repo.Create(&domain.User{ID: uuid.New(), Email: "u2@example.com", FullName: "U2", Role: "member"})

	req := httptest.NewRequest("GET", "/api/v1/users", nil)
	rr := httptest.NewRecorder()
	handler.ListUsers(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp struct {
		Success bool           `json:"success"`
		Data    []*domain.User `json:"data"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !resp.Success || len(resp.Data) != 2 {
		t.Errorf("expected success and 2 users, got %v and %d users", resp.Success, len(resp.Data))
	}
}

func TestUserHandler_CreateUser(t *testing.T) {
	repo := newMockUserRepo()
	handler := NewUserHandler(repo)

	body := map[string]string{
		"email":     "newemployee@example.com",
		"password":  "supersecret123",
		"full_name": "New Employee",
		"role":      "employee",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/users", bytes.NewReader(bodyBytes))
	rr := httptest.NewRecorder()
	handler.CreateUser(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201 Created, got %d (body: %s)", rr.Code, rr.Body.String())
	}

	created, err := repo.GetByEmail("newemployee@example.com")
	if err != nil {
		t.Fatalf("expected user to be created in repository: %v", err)
	}
	if created.FullName != "New Employee" {
		t.Errorf("expected FullName 'New Employee', got '%s'", created.FullName)
	}
}

func TestUserHandler_DeleteUser(t *testing.T) {
	repo := newMockUserRepo()
	handler := NewUserHandler(repo)

	targetID := uuid.New()
	_ = repo.Create(&domain.User{ID: targetID, Email: "del@example.com", FullName: "Delete Me", Role: "employee"})

	r := chi.NewRouter()
	r.Delete("/api/v1/users/{id}", handler.DeleteUser)

	req := httptest.NewRequest("DELETE", "/api/v1/users/"+targetID.String(), nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", rr.Code)
	}

	_, err := repo.GetByID(targetID)
	if err == nil {
		t.Error("expected user to be deleted from repo, but user still found")
	}
}

func TestUserHandler_UpdateMe(t *testing.T) {
	repo := newMockUserRepo()
	handler := NewUserHandler(repo)

	hashed, _ := crypto.HashPassword("OldPass123!")
	user := &domain.User{
		ID:           uuid.New(),
		Email:        "profile@example.com",
		PasswordHash: hashed,
		FullName:     "Original Name",
		Role:         "employee",
		Timezone:     "UTC",
	}
	_ = repo.Create(user)

	t.Run("successful profile update and password change", func(t *testing.T) {
		newName := "Updated Name"
		oldPass := "OldPass123!"
		newPass := "NewPass456!"
		body := map[string]interface{}{
			"full_name":        newName,
			"current_password": oldPass,
			"new_password":     newPass,
		}
		jsonBytes, _ := json.Marshal(body)

		req := httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader(jsonBytes))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, user.ID)
		rr := httptest.NewRecorder()

		handler.UpdateMe(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d (body: %s)", rr.Code, rr.Body.String())
		}

		updated, _ := repo.GetByID(user.ID)
		if updated.FullName != newName {
			t.Errorf("expected full name %s, got %s", newName, updated.FullName)
		}
		if !crypto.CheckPasswordHash(newPass, updated.PasswordHash) {
			t.Errorf("expected new password to match hash")
		}
	})

	t.Run("fails when current password is incorrect", func(t *testing.T) {
		body := map[string]interface{}{
			"current_password": "WrongPassword!",
			"new_password":     "NewPass456!",
		}
		jsonBytes, _ := json.Marshal(body)

		req := httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader(jsonBytes))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, user.ID)
		rr := httptest.NewRecorder()

		handler.UpdateMe(rr, req.WithContext(ctx))

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 Bad Request, got %d", rr.Code)
		}
	})
}

