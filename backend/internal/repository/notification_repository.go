package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type notificationRepository struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) domain.NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	query := `
		INSERT INTO notifications (id, user_id, type, title, message, data, is_read, read_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		RETURNING id, created_at
	`
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}

	return r.db.QueryRow(
		ctx,
		query,
		n.ID,
		n.UserID,
		n.Type,
		n.Title,
		n.Message,
		n.Data,
		n.IsRead,
		n.ReadAt,
	).Scan(&n.ID, &n.CreatedAt)
}

func (r *notificationRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*domain.Notification, int64, error) {
	countQuery := `SELECT COUNT(*) FROM notifications WHERE user_id = $1`
	var total int64
	err := r.db.QueryRow(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, user_id, type, title, message, data, is_read, read_at, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	notifications := []*domain.Notification{}
	for rows.Next() {
		n := &domain.Notification{}
		err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.Type,
			&n.Title,
			&n.Message,
			&n.Data,
			&n.IsRead,
			&n.ReadAt,
			&n.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		notifications = append(notifications, n)
	}

	return notifications, total, nil
}

func (r *notificationRepository) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	query := `
		UPDATE notifications
		SET is_read = true, read_at = NOW()
		WHERE id = $1 AND user_id = $2
	`
	res, err := r.db.Exec(ctx, query, id, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return errors.New("notification not found")
	}
	return nil
}

func (r *notificationRepository) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE notifications
		SET is_read = true, read_at = NOW()
		WHERE user_id = $1 AND is_read = false
	`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *notificationRepository) CountUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	query := `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`
	var count int64
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

type notificationPreferenceRepository struct {
	db *pgxpool.Pool
}

func NewNotificationPreferenceRepository(db *pgxpool.Pool) domain.NotificationPreferenceRepository {
	return &notificationPreferenceRepository{db: db}
}

func (r *notificationPreferenceRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.NotificationPreference, error) {
	query := `
		SELECT id, user_id, type, in_app, email, created_at, updated_at
		FROM notification_preferences
		WHERE user_id = $1
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	prefs := []*domain.NotificationPreference{}
	for rows.Next() {
		p := &domain.NotificationPreference{}
		err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Type,
			&p.InApp,
			&p.Email,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		prefs = append(prefs, p)
	}

	return prefs, nil
}

func (r *notificationPreferenceRepository) GetByUserIDAndType(ctx context.Context, userID uuid.UUID, nType domain.NotificationType) (*domain.NotificationPreference, error) {
	query := `
		SELECT id, user_id, type, in_app, email, created_at, updated_at
		FROM notification_preferences
		WHERE user_id = $1 AND type = $2
	`
	p := &domain.NotificationPreference{}
	err := r.db.QueryRow(ctx, query, userID, nType).Scan(
		&p.ID,
		&p.UserID,
		&p.Type,
		&p.InApp,
		&p.Email,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return p, nil
}

func (r *notificationPreferenceRepository) Upsert(ctx context.Context, pref *domain.NotificationPreference) error {
	query := `
		INSERT INTO notification_preferences (id, user_id, type, in_app, email, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (user_id, type) DO UPDATE
		SET in_app = EXCLUDED.in_app, email = EXCLUDED.email, updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	if pref.ID == uuid.Nil {
		pref.ID = uuid.New()
	}

	return r.db.QueryRow(
		ctx,
		query,
		pref.ID,
		pref.UserID,
		pref.Type,
		pref.InApp,
		pref.Email,
	).Scan(&pref.ID, &pref.CreatedAt, &pref.UpdatedAt)
}
