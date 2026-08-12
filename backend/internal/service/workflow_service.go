package service

import (
	"context"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/repository"

	"github.com/google/uuid"
)

type WorkflowService interface {
	CreateWorkflow(ctx context.Context, workflow *domain.Workflow) error
	GetWorkflow(ctx context.Context, id uuid.UUID) (*domain.Workflow, error)
	ListWorkflows(ctx context.Context, projectID uuid.UUID) ([]domain.Workflow, error)
	UpdateWorkflow(ctx context.Context, workflow *domain.Workflow) error
	DeleteWorkflow(ctx context.Context, id uuid.UUID) error
	ListWorkflowExecutions(ctx context.Context, workflowID uuid.UUID) ([]domain.WorkflowExecution, error)
}

type workflowService struct {
	repo repository.WorkflowRepository
}

func NewWorkflowService(repo repository.WorkflowRepository) WorkflowService {
	return &workflowService{repo: repo}
}

func (s *workflowService) CreateWorkflow(ctx context.Context, workflow *domain.Workflow) error {
	return s.repo.Create(ctx, workflow)
}

func (s *workflowService) GetWorkflow(ctx context.Context, id uuid.UUID) (*domain.Workflow, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *workflowService) ListWorkflows(ctx context.Context, projectID uuid.UUID) ([]domain.Workflow, error) {
	return s.repo.ListByProjectID(ctx, projectID)
}

func (s *workflowService) UpdateWorkflow(ctx context.Context, workflow *domain.Workflow) error {
	return s.repo.Update(ctx, workflow)
}

func (s *workflowService) DeleteWorkflow(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *workflowService) ListWorkflowExecutions(ctx context.Context, workflowID uuid.UUID) ([]domain.WorkflowExecution, error) {
	return s.repo.ListExecutionsByWorkflowID(ctx, workflowID)
}
