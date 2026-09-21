package handlers

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/shree2698/goflow/backend/internal/worker"
)

type RemindersHandler struct {
	db     *pgxpool.Pool
	logger zerolog.Logger
}

func NewRemindersHandler(db *pgxpool.Pool, logger zerolog.Logger) *RemindersHandler {
	return &RemindersHandler{
		db:     db,
		logger: logger,
	}
}

func (h *RemindersHandler) Handle(ctx context.Context, job *worker.Job) error {
	var payload worker.ScheduledRemindersPayload
	if err := json.Unmarshal(job.Payload, &payload); err != nil {
		h.logger.Error().Err(err).Msg("Failed to unmarshal scheduled reminders payload")
		return err
	}

	targetTime := payload.Timestamp
	if targetTime.IsZero() {
		targetTime = time.Now()
	}

	h.logger.Info().
		Time("target_time", targetTime).
		Msg("Processing scheduled reminders")

	if h.db == nil {
		h.logger.Warn().Msg("Database pool not configured, skipping reminder query")
		return nil
	}

	// Query tasks that are due within 24 hours and not yet completed
	query := `
		SELECT id, project_id, title, assignee_id, due_date
		FROM tasks
		WHERE due_date IS NOT NULL
		  AND due_date <= $1 + INTERVAL '24 hours'
		  AND due_date > $1
		  AND status != 'done'
		  AND deleted_at IS NULL
	`
	rows, err := h.db.Query(ctx, query, targetTime)
	if err != nil {
		h.logger.Error().Err(err).Msg("Failed to query upcoming due tasks")
		return err
	}
	defer rows.Close()

	reminderCount := 0
	for rows.Next() {
		var id, projectID string
		var title string
		var assigneeID *string
		var dueDate time.Time
		if err := rows.Scan(&id, &projectID, &title, &assigneeID, &dueDate); err != nil {
			continue
		}
		reminderCount++
		h.logger.Info().
			Str("task_id", id).
			Str("title", title).
			Time("due_date", dueDate).
			Msg("Generated upcoming task reminder notification")
	}

	h.logger.Info().Int("reminders_processed", reminderCount).Msg("Finished processing scheduled reminders")
	return nil
}

