package domain

import (
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID        uuid.UUID      `json:"id"`
	Type      string         `json:"type"` // e.g., TASK_CREATED, TASK_UPDATED
	ProjectID uuid.UUID      `json:"project_id"`
	Payload   map[string]any `json:"payload"`
	Timestamp time.Time      `json:"timestamp"`
}
