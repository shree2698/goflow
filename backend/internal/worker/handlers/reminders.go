package handlers

import (
	"context"
	"encoding/json"

	"github.com/shree2698/goflow/backend/internal/worker"
)

type RemindersHandler struct {
	// Add repository/service dependencies here
}

func NewRemindersHandler() *RemindersHandler {
	return &RemindersHandler{}
}

func (h *RemindersHandler) Handle(ctx context.Context, job *worker.Job) error {
	var payload worker.ScheduledRemindersPayload
	if err := json.Unmarshal(job.Payload, &payload); err != nil {
		return err
	}

	// TODO: Query database for items due around payload.Timestamp
	// TODO: Send reminders for each item found

	return nil
}
