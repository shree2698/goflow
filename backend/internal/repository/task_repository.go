package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type TaskWithAssignee struct {
	domain.Task
	AssigneeName string `json:"assignee_name"`
}

type TaskRepository interface {
	ListByProject(ctx context.Context, projectID uuid.UUID) ([]TaskWithAssignee, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Task, error)
	Create(ctx context.Context, task *domain.Task) error
	Update(ctx context.Context, task *domain.Task) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type taskRepository struct {
	db *pgxpool.Pool
}

func NewTaskRepository(db *pgxpool.Pool) TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) ListByProject(ctx context.Context, projectID uuid.UUID) ([]TaskWithAssignee, error) {
	query := `
		SELECT 
			t.id, t.project_id, t.title, COALESCE(t.description, ''), t.status, t.priority, 
			t.due_date, t.creator_id, t.assignee_id, COALESCE(t.tags, '{}'), t.completed_at, 
			t.created_at, t.updated_at, t.deleted_at,
			COALESCE(u.full_name, 'Unassigned') as assignee_name
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.project_id = $1 AND t.deleted_at IS NULL
		ORDER BY t.created_at ASC
	`
	rows, err := r.db.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []TaskWithAssignee
	for rows.Next() {
		var t TaskWithAssignee
		var statusStr, priorityStr string
		var tags []string
		err := rows.Scan(
			&t.ID, &t.ProjectID, &t.Title, &t.Description, &statusStr, &priorityStr,
			&t.DueDate, &t.CreatorID, &t.AssigneeID, &tags, &t.CompletedAt,
			&t.CreatedAt, &t.UpdatedAt, &t.DeletedAt,
			&t.AssigneeName,
		)
		if err != nil {
			return nil, err
		}
		t.Status = domain.TaskStatus(statusStr)
		t.Priority = domain.TaskPriority(priorityStr)
		t.Tags = tags
		tasks = append(tasks, t)
	}

	return tasks, nil
}

func (r *taskRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Task, error) {
	query := `
		SELECT id, project_id, title, COALESCE(description, ''), status, priority, due_date, 
		       creator_id, assignee_id, COALESCE(tags, '{}'), completed_at, created_at, updated_at, deleted_at
		FROM tasks
		WHERE id = $1 AND deleted_at IS NULL
	`
	var t domain.Task
	var statusStr, priorityStr string
	var tags []string
	err := r.db.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.ProjectID, &t.Title, &t.Description, &statusStr, &priorityStr,
		&t.DueDate, &t.CreatorID, &t.AssigneeID, &tags, &t.CompletedAt,
		&t.CreatedAt, &t.UpdatedAt, &t.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	t.Status = domain.TaskStatus(statusStr)
	t.Priority = domain.TaskPriority(priorityStr)
	t.Tags = tags
	return &t, nil
}

func (r *taskRepository) Create(ctx context.Context, task *domain.Task) error {
	if task.ID == uuid.Nil {
		task.ID = uuid.New()
	}
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	query := `
		INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, creator_id, assignee_id, tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.db.Exec(ctx, query,
		task.ID, task.ProjectID, task.Title, task.Description, string(task.Status),
		string(task.Priority), task.DueDate, task.CreatorID, task.AssigneeID,
		[]string(task.Tags), task.CreatedAt, task.UpdatedAt,
	)
	return err
}

func (r *taskRepository) Update(ctx context.Context, task *domain.Task) error {
	task.UpdatedAt = time.Now()
	query := `
		UPDATE tasks
		SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, assignee_id = $6, tags = $7, updated_at = $8
		WHERE id = $9 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query,
		task.Title, task.Description, string(task.Status), string(task.Priority),
		task.DueDate, task.AssigneeID, []string(task.Tags), task.UpdatedAt, task.ID,
	)
	return err
}

func (r *taskRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	var completedAt *time.Time
	if status == "COMPLETED" || status == "done" {
		now := time.Now()
		completedAt = &now
	}
	query := `
		UPDATE tasks
		SET status = $1, completed_at = $2, updated_at = NOW()
		WHERE id = $3 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query, status, completedAt, id)
	return err
}

func (r *taskRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE tasks SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
