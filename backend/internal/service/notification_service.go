package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type NotificationService interface {
	SendNotification(ctx context.Context, notification *domain.Notification) error
	GetUserNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*domain.Notification, int64, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)
	GetPreferences(ctx context.Context, userID uuid.UUID) ([]*domain.NotificationPreference, error)
	UpdatePreferences(ctx context.Context, userID uuid.UUID, pref *domain.NotificationPreference) error
}

type notificationService struct {
	notifRepo domain.NotificationRepository
	prefRepo  domain.NotificationPreferenceRepository
}

func NewNotificationService(
	notifRepo domain.NotificationRepository,
	prefRepo domain.NotificationPreferenceRepository,
) NotificationService {
	return &notificationService{
		notifRepo: notifRepo,
		prefRepo:  prefRepo,
	}
}

func (s *notificationService) SendNotification(ctx context.Context, n *domain.Notification) error {
	// Check user preference for this notification type
	pref, err := s.prefRepo.GetByUserIDAndType(ctx, n.UserID, n.Type)
	if err != nil {
		return err
	}

	// Default to enabling in_app delivery if no explicit preference row exists
	deliverInApp := true
	if pref != nil {
		deliverInApp = pref.InApp
	}

	if deliverInApp {
		if err := s.notifRepo.Create(ctx, n); err != nil {
			return err
		}
	}

	// Email delivery queued via background worker when enabled
	return nil
}

func (s *notificationService) GetUserNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*domain.Notification, int64, error) {
	return s.notifRepo.GetByUserID(ctx, userID, limit, offset)
}

func (s *notificationService) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return s.notifRepo.MarkAsRead(ctx, id, userID)
}

func (s *notificationService) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return s.notifRepo.MarkAllAsRead(ctx, userID)
}

func (s *notificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.notifRepo.CountUnread(ctx, userID)
}

func (s *notificationService) GetPreferences(ctx context.Context, userID uuid.UUID) ([]*domain.NotificationPreference, error) {
	return s.prefRepo.GetByUserID(ctx, userID)
}

func (s *notificationService) UpdatePreferences(ctx context.Context, userID uuid.UUID, pref *domain.NotificationPreference) error {
	pref.UserID = userID
	return s.prefRepo.Upsert(ctx, pref)
}
