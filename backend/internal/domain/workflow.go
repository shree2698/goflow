package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Condition struct {
	Field    string `json:"field"`
	Operator string `json:"operator"` // EQUALS, NOT_EQUALS, CONTAINS, IN, IS_EMPTY
	Value    any    `json:"value"`
}

type LogicalGroup struct {
	Logic      string         `json:"logic"` // AND, OR
	Conditions []Condition    `json:"conditions,omitempty"`
	Groups     []LogicalGroup `json:"groups,omitempty"`
}

type Action struct {
	Type   string         `json:"type"` // SEND_NOTIFICATION, CREATE_TASK, UPDATE_TASK_STATUS, ASSIGN_USER, ADD_TAG
	Params map[string]any `json:"params"`
}

type Workflow struct {
	ID          uuid.UUID       `json:"id" db:"id"`
	ProjectID   uuid.UUID       `json:"project_id" db:"project_id"`
	CreatorID   uuid.UUID       `json:"creator_id" db:"creator_id"`
	Name        string          `json:"name" db:"name"`
	TriggerType string          `json:"trigger_type" db:"trigger_type"`
	Conditions  json.RawMessage `json:"conditions" db:"conditions"`
	Actions     json.RawMessage `json:"actions" db:"actions"`
	IsActive    bool            `json:"is_active" db:"is_active"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at" db:"updated_at"`
}

type WorkflowExecution struct {
	ID              uuid.UUID `json:"id" db:"id"`
	WorkflowID      uuid.UUID `json:"workflow_id" db:"workflow_id"`
	EventType       string    `json:"event_type" db:"event_type"`
	Status          string    `json:"status" db:"status"`
	ErrorMessage    string    `json:"error_message,omitempty" db:"error_message"`
	ExecutionTimeMs int       `json:"execution_time_ms" db:"execution_time_ms"`
	ExecutedAt      time.Time `json:"executed_at" db:"executed_at"`
}
