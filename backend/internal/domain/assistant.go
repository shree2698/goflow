package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AssistantTask is an enriched task representation for AI Assistant responses
type AssistantTask struct {
	ID           uuid.UUID    `json:"id"`
	ProjectID    uuid.UUID    `json:"project_id"`
	ProjectName  string       `json:"project_name"`
	Title        string       `json:"title"`
	Description  string       `json:"description"`
	Status       TaskStatus   `json:"status"`
	Priority     TaskPriority `json:"priority"`
	DueDate      *time.Time   `json:"due_date"`
	AssigneeID   *uuid.UUID   `json:"assignee_id,omitempty"`
	AssigneeName string       `json:"assignee_name"`
	Tags         []string     `json:"tags"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
	IsOverdue    bool         `json:"is_overdue"`
}

// AssistantMessage represents a chat message in the conversation history
type AssistantMessage struct {
	Role      string      `json:"role"` // "user", "assistant", "system", "tool"
	Content   string      `json:"content"`
	ToolCalls []ToolCall  `json:"tool_calls,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
}

// AssistantContext provides environmental context (active project, user timezone, etc.)
type AssistantContext struct {
	ActiveProjectID   *uuid.UUID `json:"active_project_id,omitempty"`
	ActiveProjectName string     `json:"active_project_name,omitempty"`
	Timezone          string     `json:"timezone,omitempty"`
}

// AssistantRequest is the payload sent by the user to the assistant
type AssistantRequest struct {
	Message string             `json:"message" validate:"required"`
	History []AssistantMessage `json:"history,omitempty"`
	Context *AssistantContext  `json:"context,omitempty"`
}

// ToolCall represents a tool invocation triggered by intent detection or LLM
type ToolCall struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments"`
}

// ToolResult represents the output of an executed tool
type ToolResult struct {
	ToolCallID string `json:"tool_call_id"`
	ToolName   string `json:"tool_name"`
	Success    bool   `json:"success"`
	Output     any    `json:"output,omitempty"`
	Error      string `json:"error,omitempty"`
}

// BatchSummary summarizes bulk operations (e.g. moving tasks)
type BatchSummary struct {
	Count        int    `json:"count"`
	ProjectName  string `json:"project_name"`
	SourceStatus string `json:"source_status"`
	TargetStatus string `json:"target_status"`
}

// AssistantResponse is the unified response returned by the assistant
type AssistantResponse struct {
	Reply        string          `json:"reply"`
	Intent       string          `json:"intent"`
	ToolCalls    []ToolCall      `json:"tool_calls,omitempty"`
	ToolResults  []ToolResult    `json:"tool_results,omitempty"`
	Tasks        []AssistantTask `json:"tasks,omitempty"`
	CreatedTask  *AssistantTask  `json:"created_task,omitempty"`
	BatchSummary *BatchSummary   `json:"batch_summary,omitempty"`
	Timestamp    time.Time       `json:"timestamp"`
}

// AssistantSuggestion represents a sample prompt suggested to the user
type AssistantSuggestion struct {
	Title       string `json:"title"`
	Prompt      string `json:"prompt"`
	Category    string `json:"category"` // "search", "work", "create", "batch"
	Description string `json:"description"`
}

// AssistantService defines the business logic for AI Task Assistant
type AssistantService interface {
	ProcessMessage(ctx context.Context, user *User, req *AssistantRequest) (*AssistantResponse, error)
	GetSuggestions(ctx context.Context, user *User) ([]AssistantSuggestion, error)
}
