package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type Executor struct {
	// We might need dependencies like TaskService, NotificationService here eventually.
	// For now, we will mock or log the execution.
}

func NewExecutor() *Executor {
	return &Executor{}
}

func (e *Executor) Execute(ctx context.Context, actionsJSON []byte, event domain.Event) error {
	var actions []domain.Action
	if err := json.Unmarshal(actionsJSON, &actions); err != nil {
		return fmt.Errorf("failed to parse actions: %w", err)
	}

	for _, action := range actions {
		if err := e.executeAction(ctx, action, event); err != nil {
			return err
		}
	}

	return nil
}

func (e *Executor) executeAction(ctx context.Context, action domain.Action, event domain.Event) error {
	// In a real system, you would inject services (TaskService, NotificationService, etc.)
	// and call their methods. For Phase 5, simulating the execution with logs.
	log.Printf("Executing action: %s for event %s (Project: %s)\n", action.Type, event.Type, event.ProjectID)

	switch action.Type {
	case "SEND_NOTIFICATION":
		// e.g., notificationService.Send(...)
		log.Printf("Action executed: SEND_NOTIFICATION with params %v\n", action.Params)
	case "CREATE_TASK":
		log.Printf("Action executed: CREATE_TASK with params %v\n", action.Params)
	case "UPDATE_TASK_STATUS":
		log.Printf("Action executed: UPDATE_TASK_STATUS with params %v\n", action.Params)
	case "ASSIGN_USER":
		log.Printf("Action executed: ASSIGN_USER with params %v\n", action.Params)
	case "ADD_TAG":
		log.Printf("Action executed: ADD_TAG with params %v\n", action.Params)
	default:
		return fmt.Errorf("unknown action type: %s", action.Type)
	}

	return nil
}
