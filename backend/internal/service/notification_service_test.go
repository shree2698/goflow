package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type mockNotifRepo struct{}

func (m *mockNotifRepo) Create(ctx context.Context, notification *domain.Notification) error {
	return nil
}

func (m *mockNotifRepo) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*domain.Notification, int64, error) {
	return []*domain.Notification{}, 0, nil
}

func (m *mockNotifRepo) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return nil
}

func (m *mockNotifRepo) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return nil
}

func (m *mockNotifRepo) CountUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return 0, nil
}

type mockPrefRepo struct{}

func (m *mockPrefRepo) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.NotificationPreference, error) {
	return []*domain.NotificationPreference{}, nil
}

func (m *mockPrefRepo) GetByUserIDAndType(ctx context.Context, userID uuid.UUID, nType domain.NotificationType) (*domain.NotificationPreference, error) {
	return &domain.NotificationPreference{InApp: true}, nil
}

func (m *mockPrefRepo) Upsert(ctx context.Context, pref *domain.NotificationPreference) error {
	return nil
}

func TestNotificationService_SendNotification(t *testing.T) {
	s := NewNotificationService(&mockNotifRepo{}, &mockPrefRepo{})
	n := &domain.Notification{
		ID:     uuid.New(),
		UserID: uuid.New(),
		Type:   domain.NotificationTypeTaskAssigned,
		Title:  "Test",
	}

	err := s.SendNotification(context.Background(), n)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}
