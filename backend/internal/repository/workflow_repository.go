package repository

import (
	"context"
	"github.com/shree2698/goflow/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
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
	db *sqlx.DB
}

func NewWorkflowRepository(db *sqlx.DB) WorkflowRepository {
	return &workflowRepository{db: db}
}

func (r *workflowRepository) Create(ctx context.Context, workflow *domain.Workflow) error {
	query := `
		INSERT INTO workflows (project_id, creator_id, name, trigger_type, conditions, actions, is_active)
		VALUES (:project_id, :creator_id, :name, :trigger_type, :conditions, :actions, :is_active)
		RETURNING id, created_at, updated_at`
	
	rows, err := r.db.NamedQueryContext(ctx, query, workflow)
	if err != nil {
		return err
	}
	defer rows.Close()

	if rows.Next() {
		err = rows.Scan(&workflow.ID, &workflow.CreatedAt, &workflow.UpdatedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *workflowRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Workflow, error) {
	query := `SELECT * FROM workflows WHERE id = $1`
	var workflow domain.Workflow
	err := r.db.GetContext(ctx, &workflow, query, id)
	return &workflow, err
}

func (r *workflowRepository) ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]domain.Workflow, error) {
	query := `SELECT * FROM workflows WHERE project_id = $1 ORDER BY created_at DESC`
	var workflows []domain.Workflow
	err := r.db.SelectContext(ctx, &workflows, query, projectID)
	return workflows, err
}

func (r *workflowRepository) Update(ctx context.Context, workflow *domain.Workflow) error {
	query := `
		UPDATE workflows
		SET name = :name, trigger_type = :trigger_type, conditions = :conditions, actions = :actions, is_active = :is_active, updated_at = CURRENT_TIMESTAMP
		WHERE id = :id
		RETURNING updated_at`
	
	rows, err := r.db.NamedQueryContext(ctx, query, workflow)
	if err != nil {
		return err
	}
	defer rows.Close()

	if rows.Next() {
		err = rows.Scan(&workflow.UpdatedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *workflowRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM workflows WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *workflowRepository) ListActiveByTrigger(ctx context.Context, triggerType string) ([]domain.Workflow, error) {
	query := `SELECT * FROM workflows WHERE trigger_type = $1 AND is_active = true`
	var workflows []domain.Workflow
	err := r.db.SelectContext(ctx, &workflows, query, triggerType)
	return workflows, err
}

func (r *workflowRepository) CreateExecution(ctx context.Context, execution *domain.WorkflowExecution) error {
	query := `
		INSERT INTO workflow_executions (workflow_id, event_type, status, error_message, execution_time_ms)
		VALUES (:workflow_id, :event_type, :status, :error_message, :execution_time_ms)
		RETURNING id, executed_at`
	
	rows, err := r.db.NamedQueryContext(ctx, query, execution)
	if err != nil {
		return err
	}
	defer rows.Close()

	if rows.Next() {
		err = rows.Scan(&execution.ID, &execution.ExecutedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *workflowRepository) ListExecutionsByWorkflowID(ctx context.Context, workflowID uuid.UUID) ([]domain.WorkflowExecution, error) {
	query := `SELECT * FROM workflow_executions WHERE workflow_id = $1 ORDER BY executed_at DESC`
	var executions []domain.WorkflowExecution
	err := r.db.SelectContext(ctx, &executions, query, workflowID)
	return executions, err
}
