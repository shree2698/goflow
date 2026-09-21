package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/engine"
	"github.com/shree2698/goflow/backend/internal/repository"
	"github.com/shree2698/goflow/backend/internal/worker"
)

type WorkflowHandler struct {
	workflowRepo repository.WorkflowRepository
	evaluator    *engine.Evaluator
	executor     *engine.Executor
	logger       zerolog.Logger
}

func NewWorkflowHandler(workflowRepo repository.WorkflowRepository, logger zerolog.Logger) *WorkflowHandler {
	return &WorkflowHandler{
		workflowRepo: workflowRepo,
		evaluator:    engine.NewEvaluator(),
		executor:     engine.NewExecutor(),
		logger:       logger,
	}
}

func (h *WorkflowHandler) Handle(ctx context.Context, job *worker.Job) error {
	var payload worker.WorkflowExecutePayload
	if err := json.Unmarshal(job.Payload, &payload); err != nil {
		h.logger.Error().Err(err).Msg("Failed to unmarshal workflow execute payload")
		return err
	}

	h.logger.Info().
		Str("workflow_id", payload.WorkflowID).
		Str("trigger_id", payload.TriggerID).
		Msg("Processing workflow execute job")

	if payload.WorkflowID == "" {
		return fmt.Errorf("workflow_id cannot be empty")
	}

	wfUUID, err := uuid.Parse(payload.WorkflowID)
	if err != nil {
		return fmt.Errorf("invalid workflow_id uuid: %w", err)
	}

	if h.workflowRepo == nil {
		h.logger.Warn().Msg("Workflow repository not configured, job skipped")
		return nil
	}

	wf, err := h.workflowRepo.GetByID(ctx, wfUUID)
	if err != nil {
		h.logger.Error().Err(err).Str("workflow_id", payload.WorkflowID).Msg("Failed to load workflow definition")
		return err
	}

	if !wf.IsActive {
		h.logger.Info().Str("workflow_id", payload.WorkflowID).Msg("Workflow is inactive, skipping execution")
		return nil
	}

	start := time.Now()
	execution := &domain.WorkflowExecution{
		WorkflowID: wf.ID,
		EventType:  wf.TriggerType,
		Status:     "STARTED",
	}

	defer func() {
		execution.ExecutionTimeMs = int(time.Since(start).Milliseconds())
		_ = h.workflowRepo.CreateExecution(ctx, execution)
	}()

	// Evaluate conditions
	matched, err := h.evaluator.Evaluate(wf.Conditions, payload.Data)
	if err != nil {
		execution.Status = "FAILED"
		execution.ErrorMessage = "Condition evaluation failed: " + err.Error()
		return err
	}

	if !matched {
		execution.Status = "SKIPPED"
		execution.ErrorMessage = "Conditions not met"
		return nil
	}

	// Execute actions
	evt := domain.Event{
		ID:        uuid.New(),
		Type:      wf.TriggerType,
		ProjectID: wf.ProjectID,
		Payload:   payload.Data,
		Timestamp: time.Now(),
	}

	if err := h.executor.Execute(ctx, wf.Actions, evt); err != nil {
		execution.Status = "FAILED"
		execution.ErrorMessage = "Action execution failed: " + err.Error()
		return err
	}

	execution.Status = "SUCCESS"
	h.logger.Info().
		Str("workflow_id", payload.WorkflowID).
		Int("duration_ms", execution.ExecutionTimeMs).
		Msg("Workflow job completed successfully")
	return nil
}

