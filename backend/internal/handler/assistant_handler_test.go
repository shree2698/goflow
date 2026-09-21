package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
)

type mockAssistantService struct {
	processFunc func(ctx context.Context, user *domain.User, req *domain.AssistantRequest) (*domain.AssistantResponse, error)
	suggestFunc func(ctx context.Context, user *domain.User) ([]domain.AssistantSuggestion, error)
}

func (m *mockAssistantService) ProcessMessage(ctx context.Context, user *domain.User, req *domain.AssistantRequest) (*domain.AssistantResponse, error) {
	if m.processFunc != nil {
		return m.processFunc(ctx, user, req)
	}
	return &domain.AssistantResponse{
		Reply:     "Mock reply",
		Intent:    "search_tasks",
		Timestamp: time.Now(),
	}, nil
}

func (m *mockAssistantService) GetSuggestions(ctx context.Context, user *domain.User) ([]domain.AssistantSuggestion, error) {
	if m.suggestFunc != nil {
		return m.suggestFunc(ctx, user)
	}
	return []domain.AssistantSuggestion{
		{Title: "Test", Prompt: "Test prompt"},
	}, nil
}

type mockUserRepoForAssistant struct {
	user *domain.User
}

func (m *mockUserRepoForAssistant) Create(user *domain.User) error                 { return nil }
func (m *mockUserRepoForAssistant) GetByID(id uuid.UUID) (*domain.User, error)     { return m.user, nil }
func (m *mockUserRepoForAssistant) GetByEmail(email string) (*domain.User, error)  { return m.user, nil }
func (m *mockUserRepoForAssistant) ListAll() ([]*domain.User, error)               { return []*domain.User{m.user}, nil }
func (m *mockUserRepoForAssistant) Update(user *domain.User) error                 { return nil }
func (m *mockUserRepoForAssistant) Delete(id uuid.UUID) error                      { return nil }

func TestAssistantHandler_ProcessMessage(t *testing.T) {
	userID := uuid.New()
	testUser := &domain.User{
		ID:       userID,
		Email:    "test@goflow.com",
		FullName: "Test User",
		Role:     "employee",
	}

	as := &mockAssistantService{
		processFunc: func(ctx context.Context, user *domain.User, req *domain.AssistantRequest) (*domain.AssistantResponse, error) {
			if req.Message != "Show me all overdue tasks assigned to me." {
				t.Errorf("Unexpected message: %s", req.Message)
			}
			return &domain.AssistantResponse{
				Reply:     "You have 2 overdue tasks.",
				Intent:    "search_tasks",
				Timestamp: time.Now(),
			}, nil
		},
	}
	ur := &mockUserRepoForAssistant{user: testUser}
	h := NewAssistantHandler(as, ur)

	payload := domain.AssistantRequest{
		Message: "Show me all overdue tasks assigned to me.",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/api/v1/ai/assistant", bytes.NewBuffer(body))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.ProcessMessage(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var res struct {
		Success bool                     `json:"success"`
		Data    domain.AssistantResponse `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if res.Data.Reply != "You have 2 overdue tasks." {
		t.Errorf("Unexpected reply: %s", res.Data.Reply)
	}
}

func TestAssistantHandler_GetSuggestions(t *testing.T) {
	userID := uuid.New()
	testUser := &domain.User{
		ID:       userID,
		Email:    "test@goflow.com",
		FullName: "Test User",
		Role:     "employee",
	}

	as := &mockAssistantService{}
	ur := &mockUserRepoForAssistant{user: testUser}
	h := NewAssistantHandler(as, ur)

	req := httptest.NewRequest("GET", "/api/v1/ai/assistant/suggestions", nil)
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.GetSuggestions(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", rr.Code)
	}
}
