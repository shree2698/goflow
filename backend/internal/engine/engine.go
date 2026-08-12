package engine

import (
	"context"
	"log"
	"time"

	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/repository"
	"github.com/shree2698/goflow/backend/pkg/eventbus"
)

type Engine struct {
	eventBus     eventbus.EventBus
	repo         repository.WorkflowRepository
	evaluator    *Evaluator
	executor     *Executor
	eventTypes   []string
}

func NewEngine(eb eventbus.EventBus, repo repository.WorkflowRepository) *Engine {
	return &Engine{
		eventBus:  eb,
		repo:      repo,
		evaluator: NewEvaluator(),
		executor:  NewExecutor(),
		eventTypes: []string{
			"TASK_CREATED", "TASK_UPDATED", "TASK_DELETED",
			"COMMENT_ADDED", "USER_JOINED",
		},
	}
}

func (e *Engine) Start(ctx context.Context) {
	log.Println("Starting Workflow Engine...")
	for _, eventType := range e.eventTypes {
		ch := e.eventBus.Subscribe(eventType)
		go e.processEvents(ctx, ch, eventType)
	}
}

func (e *Engine) processEvents(ctx context.Context, ch <-chan domain.Event, eventType string) {
	for {
		select {
		case <-ctx.Done():
			log.Printf("Stopping event processor for %s\n", eventType)
			return
		case event := <-ch:
			e.handleEvent(ctx, event)
		}
	}
}

func (e *Engine) handleEvent(ctx context.Context, event domain.Event) {
	// Find active workflows matching the event type
	workflows, err := e.repo.ListActiveByTrigger(ctx, event.Type)
	if err != nil {
		log.Printf("Failed to fetch workflows for event %s: %v\n", event.Type, err)
		return
	}

	for _, wf := range workflows {
		// Ensure workflow belongs to the same project as the event (or event is global)
		if wf.ProjectID != event.ProjectID {
			continue
		}
		
		go e.executeWorkflow(ctx, wf, event)
	}
}

func (e *Engine) executeWorkflow(ctx context.Context, wf domain.Workflow, event domain.Event) {
	start := time.Now()
	execution := &domain.WorkflowExecution{
		WorkflowID: wf.ID,
		EventType:  event.Type,
		Status:     "STARTED",
	}

	defer func() {
		execution.ExecutionTimeMs = int(time.Since(start).Milliseconds())
		if err := e.repo.CreateExecution(context.Background(), execution); err != nil {
			log.Printf("Failed to log workflow execution: %v\n", err)
		}
	}()

	// Evaluate conditions
	matched, err := e.evaluator.Evaluate(wf.Conditions, event.Payload)
	if err != nil {
		execution.Status = "FAILED"
		execution.ErrorMessage = "Condition evaluation failed: " + err.Error()
		return
	}

	if !matched {
		execution.Status = "SKIPPED"
		execution.ErrorMessage = "Conditions not met"
		return
	}

	// Execute actions
	if err := e.executor.Execute(ctx, wf.Actions, event); err != nil {
		execution.Status = "FAILED"
		execution.ErrorMessage = "Action execution failed: " + err.Error()
		return
	}

	execution.Status = "SUCCESS"
}
