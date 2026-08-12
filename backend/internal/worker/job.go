package worker

import (
	"encoding/json"
	"time"
)

const (
	JOB_WORKFLOW_EXECUTE    = "JOB_WORKFLOW_EXECUTE"
	JOB_SCHEDULED_REMINDERS = "JOB_SCHEDULED_REMINDERS"
	JOB_SEND_EMAIL          = "JOB_SEND_EMAIL"
	JOB_CLEANUP             = "JOB_CLEANUP"
)

const (
	PriorityCritical = "CRITICAL"
	PriorityDefault  = "DEFAULT"
	PriorityLow      = "LOW"
)

const (
	StatusPending   = "PENDING"
	StatusRunning   = "RUNNING"
	StatusCompleted = "COMPLETED"
	StatusFailed    = "FAILED"
	StatusRetrying  = "RETRYING"
	StatusDLQ       = "DLQ"
)

type Job struct {
	ID         string          `json:"id"`
	Type       string          `json:"type"`
	Priority   string          `json:"priority"`
	Status     string          `json:"status"`
	Payload    json.RawMessage `json:"payload"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
	MaxRetries int             `json:"max_retries"`
	Retries    int             `json:"retries"`
	LastError  string          `json:"last_error,omitempty"`
}

type WorkflowExecutePayload struct {
	WorkflowID string `json:"workflow_id"`
	TriggerID  string `json:"trigger_id"`
	Data       map[string]interface{} `json:"data"`
}

type ScheduledRemindersPayload struct {
	Timestamp time.Time `json:"timestamp"`
}

type SendEmailPayload struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type CleanupPayload struct {
	OlderThan time.Time `json:"older_than"`
}
