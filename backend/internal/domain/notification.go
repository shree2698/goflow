package domain

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type NotificationType string

const (
	NotificationTypeTaskAssigned   NotificationType = "TASK_ASSIGNED"
	NotificationTypeTaskReminder   NotificationType = "TASK_REMINDER"
	NotificationTypeWorkflowAlert  NotificationType = "WORKFLOW_ALERT"
	NotificationTypeCommentMention NotificationType = "COMMENT_MENTION"
	NotificationTypeProjectInvite  NotificationType = "PROJECT_INVITE"
)

type Notification struct {
	ID        uuid.UUID       `json:"id" db:"id"`
	UserID    uuid.UUID       `json:"user_id" db:"user_id"`
	Type      NotificationType `json:"type" db:"type"`
	Title     string          `json:"title" db:"title"`
	Message   string          `json:"message" db:"message"`
	Data      json.RawMessage `json:"data" db:"data"`
	IsRead    bool            `json:"is_read" db:"is_read"`
	ReadAt    *time.Time      `json:"read_at,omitempty" db:"read_at"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
}

type NotificationPreference struct {
	ID        uuid.UUID        `json:"id" db:"id"`
	UserID    uuid.UUID        `json:"user_id" db:"user_id"`
	Type      NotificationType `json:"type" db:"type"`
	InApp     bool             `json:"in_app" db:"in_app"`
	Email     bool             `json:"email" db:"email"`
	CreatedAt time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt time.Time        `json:"updated_at" db:"updated_at"`
}

type NotificationRepository interface {
	Create(ctx context.Context, notification *Notification) error
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*Notification, int64, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	CountUnread(ctx context.Context, userID uuid.UUID) (int64, error)
}

type NotificationPreferenceRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]*NotificationPreference, error)
	GetByUserIDAndType(ctx context.Context, userID uuid.UUID, nType NotificationType) (*NotificationPreference, error)
	Upsert(ctx context.Context, pref *NotificationPreference) error
}

