package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/pkg/jwt"
)

type mockUserRepo struct {
	users map[uuid.UUID]*domain.User
}

func (m *mockUserRepo) Create(user *domain.User) error {
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

func TestRequireAuth(t *testing.T) {
	jwtSvc := jwt.NewJWTService("test-secret-key-1234567890123456", 15*time.Minute, 24*time.Hour)
	testUserID := uuid.New()
	validToken, _, err := jwtSvc.GenerateTokenPair(testUserID)
	if err != nil {
		t.Fatalf("failed to generate token pair: %v", err)
	}

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, ok := r.Context().Value(UserIDKey).(uuid.UUID)
		if !ok || uid != testUserID {
			t.Errorf("expected userID %v in context, got %v", testUserID, uid)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	authMiddleware := RequireAuth(jwtSvc)(nextHandler)

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
	}{
		{
			name:           "missing auth header",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "invalid format (missing Bearer prefix)",
			authHeader:     validToken,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "invalid token",
			authHeader:     "Bearer invalid.token.payload",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "valid token",
			authHeader:     "Bearer " + validToken,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/protected", nil)
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			rr := httptest.NewRecorder()
			authMiddleware.ServeHTTP(rr, req)

			if rr.Code != tc.expectedStatus {
				t.Errorf("got status %d, expected %d", rr.Code, tc.expectedStatus)
			}
		})
	}
}

func TestRequireRole(t *testing.T) {
	adminID := uuid.New()
	memberID := uuid.New()

	repo := &mockUserRepo{
		users: map[uuid.UUID]*domain.User{
			adminID: {
				ID:    adminID,
				Email: "admin@example.com",
				Role:  "admin",
			},
			memberID: {
				ID:    memberID,
				Email: "member@example.com",
				Role:  "member",
			},
		},
	}

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(string)
		if !ok || role != "admin" {
			t.Errorf("expected role admin in context, got %v", role)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	roleMiddleware := RequireRole(repo, "admin")(nextHandler)

	t.Run("unauthenticated context", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin", nil)
		rr := httptest.NewRecorder()
		roleMiddleware.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("got status %d, expected %d", rr.Code, http.StatusUnauthorized)
		}
	})

	t.Run("user not found in repository", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin", nil)
		ctx := context.WithValue(req.Context(), UserIDKey, uuid.New())
		rr := httptest.NewRecorder()
		roleMiddleware.ServeHTTP(rr, req.WithContext(ctx))

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("got status %d, expected %d", rr.Code, http.StatusUnauthorized)
		}
	})

	t.Run("insufficient permissions (member attempting admin route)", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin", nil)
		ctx := context.WithValue(req.Context(), UserIDKey, memberID)
		rr := httptest.NewRecorder()
		roleMiddleware.ServeHTTP(rr, req.WithContext(ctx))

		if rr.Code != http.StatusForbidden {
			t.Errorf("got status %d, expected %d", rr.Code, http.StatusForbidden)
		}
	})

	t.Run("authorized role (admin accessing admin route)", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin", nil)
		ctx := context.WithValue(req.Context(), UserIDKey, adminID)
		rr := httptest.NewRecorder()
		roleMiddleware.ServeHTTP(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("got status %d, expected %d", rr.Code, http.StatusOK)
		}
	})
}
