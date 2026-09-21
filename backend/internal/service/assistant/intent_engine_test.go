package assistant

import (
	"testing"
	"time"
)

func TestIntentEngine_UserExamples(t *testing.T) {
	now := time.Date(2026, time.September, 21, 10, 0, 0, 0, time.UTC)
	engine := NewIntentEngine()

	// Example 1: "Show me all overdue tasks assigned to me."
	t.Run("Example 1: Overdue tasks assigned to me", func(t *testing.T) {
		query := "Show me all overdue tasks assigned to me."
		intent := engine.Detect(query, nil, now)

		if intent.ToolName != "search_tasks" {
			t.Fatalf("Expected tool search_tasks, got %s", intent.ToolName)
		}
		overdue, _ := intent.Arguments["overdue"].(bool)
		if !overdue {
			t.Errorf("Expected overdue to be true, got %v", intent.Arguments["overdue"])
		}
		assignee, _ := intent.Arguments["assignee"].(string)
		if assignee != "me" {
			t.Errorf("Expected assignee to be 'me', got %v", assignee)
		}
	})

	// Example 2: "What should I work on today?"
	t.Run("Example 2: What should I work on today", func(t *testing.T) {
		query := "What should I work on today?"
		intent := engine.Detect(query, nil, now)

		if intent.ToolName != "search_tasks" {
			t.Fatalf("Expected tool search_tasks, got %s", intent.ToolName)
		}
		if intent.Type != IntentPrioritize {
			t.Fatalf("Expected intent prioritize_tasks, got %s", intent.Type)
		}
		assignee, _ := intent.Arguments["assignee"].(string)
		if assignee != "me" {
			t.Errorf("Expected assignee to be 'me', got %v", assignee)
		}
		prioToday, _ := intent.Arguments["prioritize_today"].(bool)
		if !prioToday {
			t.Errorf("Expected prioritize_today to be true")
		}
	})

	// Example 3: "Create a task to update the payment API, high priority, due Friday."
	t.Run("Example 3: Create high priority task due Friday", func(t *testing.T) {
		query := "Create a task to update the payment API, high priority, due Friday."
		intent := engine.Detect(query, nil, now)

		if intent.ToolName != "create_task" {
			t.Fatalf("Expected tool create_task, got %s", intent.ToolName)
		}
		title, _ := intent.Arguments["title"].(string)
		if title != "Update the payment API" {
			t.Errorf("Expected title 'Update the payment API', got %q", title)
		}
		prio, _ := intent.Arguments["priority"].(string)
		if prio != "high" {
			t.Errorf("Expected priority 'high', got %q", prio)
		}
		dueDate, ok := intent.Arguments["due_date"].(string)
		if !ok || dueDate == "" {
			t.Errorf("Expected due_date to be set, got %v", intent.Arguments["due_date"])
		}
	})

	// Example 4: "Move all completed tasks from Project A to archived."
	t.Run("Example 4: Move all completed tasks from Project A to archived", func(t *testing.T) {
		query := "Move all completed tasks from Project A to archived."
		intent := engine.Detect(query, nil, now)

		if intent.ToolName != "update_task" {
			t.Fatalf("Expected tool update_task, got %s", intent.ToolName)
		}
		if intent.Type != IntentBatchUpdate {
			t.Fatalf("Expected intent batch_update_tasks, got %s", intent.Type)
		}
		proj, _ := intent.Arguments["project_name"].(string)
		if proj != "Project A" {
			t.Errorf("Expected project_name 'Project A', got %q", proj)
		}
		filterStatus, _ := intent.Arguments["filter_status"].(string)
		if filterStatus != "done" && filterStatus != "completed" {
			t.Errorf("Expected filter_status 'done' or 'completed', got %q", filterStatus)
		}
		targetStatus, _ := intent.Arguments["target_status"].(string)
		if targetStatus != "archived" {
			t.Errorf("Expected target_status 'archived', got %q", targetStatus)
		}
	})

	// Variations
	t.Run("Single task update: Mark 'Deploy to prod' as done", func(t *testing.T) {
		query := "Mark 'Deploy to prod' as done"
		intent := engine.Detect(query, nil, now)

		if intent.ToolName != "update_task" {
			t.Fatalf("Expected tool update_task, got %s", intent.ToolName)
		}
		taskTitle, _ := intent.Arguments["task_title"].(string)
		if taskTitle != "Deploy to prod" {
			t.Errorf("Expected task_title 'Deploy to prod', got %q", taskTitle)
		}
		status, _ := intent.Arguments["status"].(string)
		if status != "done" {
			t.Errorf("Expected status 'done', got %q", status)
		}
	})
}
