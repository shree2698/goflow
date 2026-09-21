package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type WorkflowRepository interface {
	Create(ctx context.Context, workflow *domain.Workflow) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Workflow, error)
	ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]domain.Workflow, error)
	Update(ctx context.Context, workflow *domain.Workflow) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListActiveByTrigger(ctx context.Context, triggerType string) ([]domain.Workflow, error)
	CreateExecution(ctx context.Context, execution *domain.WorkflowExecution) error
	ListExecutionsByWorkflowID(ctx context.Context, workflowID uuid.UUID) ([]domain.WorkflowExecution, error)
}

type workflowRepository struct {
	db *pgxpool.Pool
}

func NewWorkflowRepository(db *pgxpool.Pool) WorkflowRepository {
	return &workflowRepository{db: db}
}

func (r *workflowRepository) Create(ctx context.Context, workflow *domain.Workflow) error {
	query := `
		INSERT INTO workflows (project_id, creator_id, name, trigger_type, conditions, actions, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, query,
		workflow.ProjectID, workflow.CreatorID, workflow.Name,
		workflow.TriggerType, workflow.Conditions, workflow.Actions, workflow.IsActive,
	).Scan(&workflow.ID, &workflow.CreatedAt, &workflow.UpdatedAt)
}

func (r *workflowRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Workflow, error) {
	query := `
		SELECT id, project_id, creator_id, name, trigger_type, conditions, actions, is_active, created_at, updated_at
		FROM workflows WHERE id = $1`
	var w domain.Workflow
	err := r.db.QueryRow(ctx, query, id).Scan(
		&w.ID, &w.ProjectID, &w.CreatorID, &w.Name, &w.TriggerType,
		&w.Conditions, &w.Actions, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &w, nil
}

func (r *workflowRepository) ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]domain.Workflow, error) {
	query := `
		SELECT id, project_id, creator_id, name, trigger_type, conditions, actions, is_active, created_at, updated_at
		FROM workflows WHERE project_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Workflow
	for rows.Next() {
		var w domain.Workflow
		err := rows.Scan(
			&w.ID, &w.ProjectID, &w.CreatorID, &w.Name, &w.TriggerType,
			&w.Conditions, &w.Actions, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, w)
	}
	return list, nil
}

func (r *workflowRepository) Update(ctx context.Context, workflow *domain.Workflow) error {
	query := `
		UPDATE workflows
		SET name = $1, trigger_type = $2, conditions = $3, actions = $4, is_active = $5, updated_at = NOW()
		WHERE id = $6
		RETURNING updated_at`
	return r.db.QueryRow(ctx, query,
		workflow.Name, workflow.TriggerType, workflow.Conditions, workflow.Actions, workflow.IsActive, workflow.ID,
	).Scan(&workflow.UpdatedAt)
}

func (r *workflowRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM workflows WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *workflowRepository) ListActiveByTrigger(ctx context.Context, triggerType string) ([]domain.Workflow, error) {
	query := `
		SELECT id, project_id, creator_id, name, trigger_type, conditions, actions, is_active, created_at, updated_at
		FROM workflows WHERE trigger_type = $1 AND is_active = true`
	rows, err := r.db.Query(ctx, query, triggerType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Workflow
	for rows.Next() {
		var w domain.Workflow
		err := rows.Scan(
			&w.ID, &w.ProjectID, &w.CreatorID, &w.Name, &w.TriggerType,
			&w.Conditions, &w.Actions, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, w)
	}
	return list, nil
}

func (r *workflowRepository) CreateExecution(ctx context.Context, execution *domain.WorkflowExecution) error {
	query := `
		INSERT INTO workflow_executions (workflow_id, event_type, status, error_message, execution_time_ms)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, executed_at`
	return r.db.QueryRow(ctx, query,
		execution.WorkflowID, execution.EventType, execution.Status, execution.ErrorMessage, execution.ExecutionTimeMs,
	).Scan(&execution.ID, &execution.ExecutedAt)
}

func (r *workflowRepository) ListExecutionsByWorkflowID(ctx context.Context, workflowID uuid.UUID) ([]domain.WorkflowExecution, error) {
	query := `
		SELECT id, workflow_id, event_type, status, COALESCE(error_message, ''), execution_time_ms, executed_at
		FROM workflow_executions WHERE workflow_id = $1 ORDER BY executed_at DESC`
	rows, err := r.db.Query(ctx, query, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.WorkflowExecution
	for rows.Next() {
		var ex domain.WorkflowExecution
		err := rows.Scan(
			&ex.ID, &ex.WorkflowID, &ex.EventType, &ex.Status,
			&ex.ErrorMessage, &ex.ExecutionTimeMs, &ex.ExecutedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, ex)
	}
	return list, nil
}
