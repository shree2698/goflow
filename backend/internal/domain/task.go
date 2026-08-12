package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type TaskStatus string
type TaskPriority string

const (
	TaskStatusTodo       TaskStatus = "todo"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusInReview   TaskStatus = "in_review"
	TaskStatusDone       TaskStatus = "done"

	TaskPriorityLow    TaskPriority = "low"
	TaskPriorityMedium TaskPriority = "medium"
	TaskPriorityHigh   TaskPriority = "high"
	TaskPriorityUrgent TaskPriority = "urgent"
)

type Task struct {
	ID          uuid.UUID      `json:"id" db:"id"`
	ProjectID   uuid.UUID      `json:"project_id" db:"project_id"`
	Title       string         `json:"title" db:"title"`
	Description string         `json:"description" db:"description"`
	Status      TaskStatus     `json:"status" db:"status"`
	Priority    TaskPriority   `json:"priority" db:"priority"`
	DueDate     *time.Time     `json:"due_date" db:"due_date"`
	CreatorID   uuid.UUID      `json:"creator_id" db:"creator_id"`
	AssigneeID  *uuid.UUID     `json:"assignee_id" db:"assignee_id"`
	Tags        pq.StringArray `json:"tags" db:"tags"`
	CompletedAt *time.Time     `json:"completed_at" db:"completed_at"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time     `json:"deleted_at,omitempty" db:"deleted_at"`
}

type Subtask struct {
	ID          uuid.UUID `json:"id" db:"id"`
	TaskID      uuid.UUID `json:"task_id" db:"task_id"`
	Title       string    `json:"title" db:"title"`
	IsCompleted bool      `json:"is_completed" db:"is_completed"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type Comment struct {
	ID        uuid.UUID `json:"id" db:"id"`
	TaskID    uuid.UUID `json:"task_id" db:"task_id"`
	AuthorID  uuid.UUID `json:"author_id" db:"author_id"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateTaskInput struct {
	ProjectID   uuid.UUID      `json:"project_id" validate:"required"`
	Title       string         `json:"title" validate:"required,min=1,max=255"`
	Description string         `json:"description"`
	Priority    TaskPriority   `json:"priority"`
	DueDate     *time.Time     `json:"due_date"`
	AssigneeID  *uuid.UUID     `json:"assignee_id"`
	Tags        pq.StringArray `json:"tags"`
}

type UpdateTaskInput struct {
	Title       *string         `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	Description *string         `json:"description,omitempty"`
	Status      *TaskStatus     `json:"status,omitempty"`
	Priority    *TaskPriority   `json:"priority,omitempty"`
	DueDate     *time.Time      `json:"due_date,omitempty"`
	AssigneeID  *uuid.UUID      `json:"assignee_id,omitempty"`
	Tags        *pq.StringArray `json:"tags,omitempty"`
}

type CreateSubtaskInput struct {
	Title string `json:"title" validate:"required,min=1,max=255"`
}

type UpdateSubtaskInput struct {
	Title       *string `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	IsCompleted *bool   `json:"is_completed,omitempty"`
}

type CreateCommentInput struct {
	Content string `json:"content" validate:"required,min=1"`
}

type UpdateCommentInput struct {
	Content *string `json:"content,omitempty" validate:"required,min=1"`
}

type TaskFilter struct {
	ProjectID  *uuid.UUID
	Status     *TaskStatus
	Priority   *TaskPriority
	AssigneeID *uuid.UUID
	Search     *string
	Tags       []string
}
