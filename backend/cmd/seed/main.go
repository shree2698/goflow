package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/shree2698/goflow/backend/internal/config"
	"github.com/shree2698/goflow/backend/migrations"
	"github.com/shree2698/goflow/backend/pkg/crypto"
	"github.com/shree2698/goflow/backend/pkg/logger"
)

type EmployeeSeed struct {
	Email    string
	Password string
	FullName string
	Role     string
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Server.Env)
	log.Info().Msg("Starting full database seed (migrations, users, projects, tasks, workflows, notifications)...")

	db, err := config.NewPostgresPool(cfg.Database, log)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	ctx := context.Background()

	// 1. Ensure all migrations are applied first
	log.Info().Msg("Step 1: Running database migrations...")
	if err := migrations.Run(ctx, db, log); err != nil {
		log.Fatal().Err(err).Msg("Failed to run database migrations")
	}

	// 2. Seed Users
	log.Info().Msg("Step 2: Seeding users...")
	employees := []EmployeeSeed{
		{
			Email:    "admin@goflow.com",
			Password: "Password123!",
			FullName: "System Administrator",
			Role:     "admin",
		},
		{
			Email:    "employee1@goflow.com",
			Password: "Password123!",
			FullName: "Alice Smith",
			Role:     "employee",
		},
		{
			Email:    "employee2@goflow.com",
			Password: "Password123!",
			FullName: "Bob Jones",
			Role:     "employee",
		},
	}

	userIDs := make(map[string]uuid.UUID)
	for _, emp := range employees {
		hash, err := crypto.HashPassword(emp.Password)
		if err != nil {
			log.Error().Err(err).Str("email", emp.Email).Msg("Failed to hash password")
			continue
		}

		var userID uuid.UUID
		query := `
			INSERT INTO users (email, password_hash, full_name, role, timezone)
			VALUES ($1, $2, $3, $4, 'UTC')
			ON CONFLICT (email) DO UPDATE 
			SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role
			RETURNING id;
		`
		err = db.QueryRow(ctx, query, emp.Email, hash, emp.FullName, emp.Role).Scan(&userID)
		if err != nil {
			log.Error().Err(err).Str("email", emp.Email).Msg("Failed to upsert user")
			continue
		}
		userIDs[emp.Email] = userID
		log.Info().Str("email", emp.Email).Str("id", userID.String()).Msg("Seeded user")
	}

	adminID := userIDs["admin@goflow.com"]
	aliceID := userIDs["employee1@goflow.com"]
	bobID := userIDs["employee2@goflow.com"]

	// 3. Seed Projects
	log.Info().Msg("Step 3: Seeding projects & members...")
	type ProjectDef struct {
		Name        string
		Description string
		Color       string
		OwnerID     uuid.UUID
		Members     []struct {
			UserID uuid.UUID
			Role   string
		}
	}

	projects := []ProjectDef{
		{
			Name:        "Core Platform & API",
			Description: "Core backend services, database schema, Redis worker queue, and REST APIs.",
			Color:       "#6366F1",
			OwnerID:     adminID,
			Members: []struct {
				UserID uuid.UUID
				Role   string
			}{
				{UserID: adminID, Role: "OWNER"},
				{UserID: aliceID, Role: "ADMIN"},
				{UserID: bobID, Role: "MEMBER"},
			},
		},
		{
			Name:        "Frontend Redesign",
			Description: "Modernizing the user interface with Next.js 14, Tailwind CSS, and Neumorphic components.",
			Color:       "#EC4899",
			OwnerID:     aliceID,
			Members: []struct {
				UserID uuid.UUID
				Role   string
			}{
				{UserID: aliceID, Role: "OWNER"},
				{UserID: adminID, Role: "ADMIN"},
				{UserID: bobID, Role: "MEMBER"},
			},
		},
		{
			Name:        "Mobile Companion App",
			Description: "Cross-platform mobile client for workflow alerts, task reviews, and offline sync.",
			Color:       "#10B981",
			OwnerID:     bobID,
			Members: []struct {
				UserID uuid.UUID
				Role   string
			}{
				{UserID: bobID, Role: "OWNER"},
				{UserID: adminID, Role: "ADMIN"},
			},
		},
	}

	projectIDs := make(map[string]uuid.UUID)
	for _, p := range projects {
		var pID uuid.UUID
		err := db.QueryRow(ctx, "SELECT id FROM projects WHERE name = $1 AND deleted_at IS NULL LIMIT 1", p.Name).Scan(&pID)
		if err != nil {
			pID = uuid.New()
			insertProj := `
				INSERT INTO projects (id, name, description, color, status, owner_id, created_at, updated_at)
				VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())
			`
			if _, err := db.Exec(ctx, insertProj, pID, p.Name, p.Description, p.Color, p.OwnerID); err != nil {
				log.Error().Err(err).Str("project", p.Name).Msg("Failed to insert project")
				continue
			}
		}
		projectIDs[p.Name] = pID
		log.Info().Str("project", p.Name).Str("id", pID.String()).Msg("Seeded project")

		// Add project members
		for _, m := range p.Members {
			insertMember := `
				INSERT INTO project_members (project_id, user_id, role, joined_at)
				VALUES ($1, $2, $3, NOW())
				ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
			`
			if _, err := db.Exec(ctx, insertMember, pID, m.UserID, m.Role); err != nil {
				log.Error().Err(err).Str("project", p.Name).Msg("Failed to upsert project member")
			}
		}
	}

	coreProjID := projectIDs["Core Platform & API"]
	frontProjID := projectIDs["Frontend Redesign"]

	// 4. Seed Tasks
	log.Info().Msg("Step 4: Seeding tasks, subtasks & comments...")
	now := time.Now()
	type TaskDef struct {
		ProjectID   uuid.UUID
		Title       string
		Description string
		Status      string
		Priority    string
		DueDate     *time.Time
		CreatorID   uuid.UUID
		AssigneeID  *uuid.UUID
		Tags        []string
		CompletedAt *time.Time
		Subtasks    []struct {
			Title     string
			Completed bool
		}
		Comments []struct {
			AuthorID uuid.UUID
			Content  string
		}
	}

	duePast72h := now.Add(-72 * time.Hour)
	duePast48h := now.Add(-48 * time.Hour)
	duePast24h := now.Add(-24 * time.Hour)
	duePast12h := now.Add(-12 * time.Hour)
	dueNext24h := now.Add(24 * time.Hour)
	dueNext48h := now.Add(48 * time.Hour)
	dueNext72h := now.Add(72 * time.Hour)
	dueNext96h := now.Add(96 * time.Hour)

	tasks := []TaskDef{
		{
			ProjectID:   coreProjID,
			Title:       "Implement JWT Authentication & Refresh Flow",
			Description: "Create access and refresh token rotation with secure cookie storage and Redis blacklist.",
			Status:      "COMPLETED",
			Priority:    "high",
			DueDate:     &duePast48h,
			CreatorID:   adminID,
			AssigneeID:  &aliceID,
			Tags:        []string{"Auth", "Security", "Backend"},
			CompletedAt: &duePast24h,
			Subtasks: []struct {
				Title     string
				Completed bool
			}{
				{Title: "Define token claims structure", Completed: true},
				{Title: "Add refresh token endpoint", Completed: true},
				{Title: "Write unit tests for token expiration", Completed: true},
			},
			Comments: []struct {
				AuthorID uuid.UUID
				Content  string
			}{
				{AuthorID: adminID, Content: "Token rotation logic is approved."},
				{AuthorID: aliceID, Content: "Added Redis token blacklist for instant logout."},
			},
		},
		{
			ProjectID:   coreProjID,
			Title:       "Build Redis Worker Pool & Queue Manager",
			Description: "Background queue for email dispatches, scheduled task reminders, and automated workflow triggers.",
			Status:      "IN_PROGRESS",
			Priority:    "urgent",
			DueDate:     &dueNext48h,
			CreatorID:   adminID,
			AssigneeID:  &bobID,
			Tags:        []string{"Backend", "Redis", "Worker"},
			Subtasks: []struct {
				Title     string
				Completed bool
			}{
				{Title: "Setup Redis stream consumer group", Completed: true},
				{Title: "Implement exponential backoff retry", Completed: false},
				{Title: "Dead-letter queue handling", Completed: false},
			},
			Comments: []struct {
				AuthorID uuid.UUID
				Content  string
			}{
				{AuthorID: bobID, Content: "Testing consumer failover now."},
			},
		},
		{
			ProjectID:   coreProjID,
			Title:       "Database Schema Migrations & Full-Text Search",
			Description: "Define PostgreSQL tables, foreign key cascades, and GIN tsvector search indexes.",
			Status:      "COMPLETED",
			Priority:    "high",
			DueDate:     &duePast72h,
			CreatorID:   adminID,
			AssigneeID:  &adminID,
			Tags:        []string{"Database", "PostgreSQL", "Search"},
			CompletedAt: &duePast48h,
			Subtasks: []struct {
				Title     string
				Completed bool
			}{
				{Title: "Draft migration SQL scripts", Completed: true},
				{Title: "Configure search vector trigger", Completed: true},
			},
		},
		{
			ProjectID:   coreProjID,
			Title:       "Setup Rate Limiting Middleware",
			Description: "Implement token bucket rate limiter per client IP to prevent brute-force attacks on auth endpoints.",
			Status:      "TODO",
			Priority:    "medium",
			DueDate:     &dueNext72h,
			CreatorID:   aliceID,
			AssigneeID:  &aliceID,
			Tags:        []string{"Security", "Middleware"},
			Subtasks: []struct {
				Title     string
				Completed bool
			}{
				{Title: "Configure token bucket capacity", Completed: false},
				{Title: "Return 429 Too Many Requests response headers", Completed: false},
			},
		},
		{
			ProjectID:   coreProjID,
			Title:       "Fix Redis connection timeout in staging",
			Description: "Worker queue intermittent drops when network latency spikes.",
			Status:      "BLOCKED",
			Priority:    "urgent",
			DueDate:     &duePast12h,
			CreatorID:   bobID,
			AssigneeID:  &bobID,
			Tags:        []string{"Bug", "Infrastructure"},
			Comments: []struct {
				AuthorID uuid.UUID
				Content  string
			}{
				{AuthorID: bobID, Content: "Waiting on DevOps team to check network firewall rule."},
			},
		},
		{
			ProjectID:   frontProjID,
			Title:       "Build Interactive Kanban Board",
			Description: "Drag and drop task board with column swimlanes, status updates, and filter capabilities.",
			Status:      "COMPLETED",
			Priority:    "high",
			DueDate:     &duePast24h,
			CreatorID:   aliceID,
			AssigneeID:  &aliceID,
			Tags:        []string{"Frontend", "Kanban", "UI"},
			CompletedAt: &duePast12h,
			Subtasks: []struct {
				Title     string
				Completed bool
			}{
				{Title: "Implement HTML5 drag & drop handlers", Completed: true},
				{Title: "Filter by title and tags", Completed: true},
			},
		},
		{
			ProjectID:   frontProjID,
			Title:       "Implement Command Palette (Ctrl+K)",
			Description: "Quick search and jump modal for tasks, projects, and employee navigation.",
			Status:      "IN_PROGRESS",
			Priority:    "medium",
			DueDate:     &dueNext24h,
			CreatorID:   aliceID,
			AssigneeID:  &bobID,
			Tags:        []string{"Frontend", "UX"},
		},
		{
			ProjectID:   frontProjID,
			Title:       "Real-Time WebSocket Notifications Bell",
			Description: "Live badge indicator and dropdown for in-app notifications.",
			Status:      "TODO",
			Priority:    "medium",
			DueDate:     &dueNext96h,
			CreatorID:   aliceID,
			AssigneeID:  &aliceID,
			Tags:        []string{"Frontend", "WebSocket"},
		},
	}

	for _, t := range tasks {
		var taskID uuid.UUID
		err := db.QueryRow(ctx, "SELECT id FROM tasks WHERE project_id = $1 AND title = $2 AND deleted_at IS NULL LIMIT 1", t.ProjectID, t.Title).Scan(&taskID)
		if err != nil {
			taskID = uuid.New()
			insertTask := `
				INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, creator_id, assignee_id, tags, completed_at, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
			`
			_, err = db.Exec(ctx, insertTask, taskID, t.ProjectID, t.Title, t.Description, t.Status, t.Priority, t.DueDate, t.CreatorID, t.AssigneeID, t.Tags, t.CompletedAt)
			if err != nil {
				log.Error().Err(err).Str("title", t.Title).Msg("Failed to insert task")
				continue
			}
		}

		log.Info().Str("title", t.Title).Str("id", taskID.String()).Msg("Seeded task")

		// Subtasks
		for _, st := range t.Subtasks {
			var stID uuid.UUID
			err := db.QueryRow(ctx, "SELECT id FROM subtasks WHERE task_id = $1 AND title = $2 LIMIT 1", taskID, st.Title).Scan(&stID)
			if err != nil {
				_, _ = db.Exec(ctx, "INSERT INTO subtasks (task_id, title, is_completed, created_at) VALUES ($1, $2, $3, NOW())", taskID, st.Title, st.Completed)
			}
		}

		// Comments
		for _, cm := range t.Comments {
			var cmID uuid.UUID
			err := db.QueryRow(ctx, "SELECT id FROM comments WHERE task_id = $1 AND author_id = $2 AND content = $3 LIMIT 1", taskID, cm.AuthorID, cm.Content).Scan(&cmID)
			if err != nil {
				_, _ = db.Exec(ctx, "INSERT INTO comments (task_id, author_id, content, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())", taskID, cm.AuthorID, cm.Content)
			}
		}
	}

	// 5. Seed Workflows & Executions
	log.Info().Msg("Step 5: Seeding workflows & executions...")
	type WorkflowDef struct {
		ProjectID   uuid.UUID
		CreatorID   uuid.UUID
		Name        string
		TriggerType string
		Conditions  any
		Actions     any
		Executions  []struct {
			EventType       string
			Status          string
			ExecutionTimeMs int
			ExecutedAt      time.Time
		}
	}

	cond1 := []map[string]any{{"field": "Priority", "operator": "EQUALS", "value": "urgent"}}
	act1 := []map[string]any{{"type": "SEND_NOTIFICATION", "params": map[string]any{"title": "Urgent Task Created", "message": "An urgent task requires attention."}}}

	cond2 := []map[string]any{{"field": "Tags", "operator": "CONTAINS", "value": "API"}}
	act2 := []map[string]any{{"type": "ADD_TAG", "params": map[string]any{"tag": "Backend"}}}

	workflows := []WorkflowDef{
		{
			ProjectID:   coreProjID,
			CreatorID:   adminID,
			Name:        "Notify Assignee on Urgent Tasks",
			TriggerType: "TASK_CREATED",
			Conditions:  cond1,
			Actions:     act1,
			Executions: []struct {
				EventType       string
				Status          string
				ExecutionTimeMs int
				ExecutedAt      time.Time
			}{
				{EventType: "TASK_CREATED", Status: "SUCCESS", ExecutionTimeMs: 14, ExecutedAt: now.Add(-2 * time.Hour)},
				{EventType: "TASK_CREATED", Status: "SUCCESS", ExecutionTimeMs: 11, ExecutedAt: now.Add(-6 * time.Hour)},
			},
		},
		{
			ProjectID:   coreProjID,
			CreatorID:   aliceID,
			Name:        "Auto-tag Backend on API Tasks",
			TriggerType: "TASK_CREATED",
			Conditions:  cond2,
			Actions:     act2,
			Executions: []struct {
				EventType       string
				Status          string
				ExecutionTimeMs int
				ExecutedAt      time.Time
			}{
				{EventType: "TASK_CREATED", Status: "SUCCESS", ExecutionTimeMs: 8, ExecutedAt: now.Add(-5 * time.Hour)},
			},
		},
	}

	for _, wf := range workflows {
		var wfID uuid.UUID
		condJSON, _ := json.Marshal(wf.Conditions)
		actJSON, _ := json.Marshal(wf.Actions)

		err := db.QueryRow(ctx, "SELECT id FROM workflows WHERE project_id = $1 AND name = $2 LIMIT 1", wf.ProjectID, wf.Name).Scan(&wfID)
		if err != nil {
			wfID = uuid.New()
			insertWF := `
				INSERT INTO workflows (id, project_id, creator_id, name, trigger_type, conditions, actions, is_active, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
			`
			_, err = db.Exec(ctx, insertWF, wfID, wf.ProjectID, wf.CreatorID, wf.Name, wf.TriggerType, condJSON, actJSON)
			if err != nil {
				log.Error().Err(err).Str("workflow", wf.Name).Msg("Failed to insert workflow")
				continue
			}
		}

		log.Info().Str("workflow", wf.Name).Str("id", wfID.String()).Msg("Seeded workflow")

		// Executions
		for _, ex := range wf.Executions {
			insertEx := `
				INSERT INTO workflow_executions (workflow_id, event_type, status, execution_time_ms, executed_at)
				VALUES ($1, $2, $3, $4, $5)
			`
			_, _ = db.Exec(ctx, insertEx, wfID, ex.EventType, ex.Status, ex.ExecutionTimeMs, ex.ExecutedAt)
		}
	}

	// 6. Seed Notification Preferences & Notifications
	log.Info().Msg("Step 6: Seeding notification preferences & notifications...")
	notificationTypes := []string{"TASK_ASSIGNED", "TASK_REMINDER", "WORKFLOW_ALERT", "COMMENT_MENTION", "PROJECT_INVITE"}
	for _, uID := range []uuid.UUID{adminID, aliceID, bobID} {
		for _, nt := range notificationTypes {
			insertPref := `
				INSERT INTO notification_preferences (user_id, type, in_app, email, created_at, updated_at)
				VALUES ($1, $2, true, true, NOW(), NOW())
				ON CONFLICT (user_id, type) DO NOTHING;
			`
			_, _ = db.Exec(ctx, insertPref, uID, nt)
		}
	}

	type NotificationDef struct {
		UserID  uuid.UUID
		Type    string
		Title   string
		Message string
		IsRead  bool
		ReadAt  *time.Time
	}

	readAt1 := now.Add(-1 * time.Hour)
	notifications := []NotificationDef{
		{
			UserID:  adminID,
			Type:    "WORKFLOW_ALERT",
			Title:   "Workflow Executed",
			Message: "Workflow 'Notify Assignee on Urgent Tasks' triggered and completed successfully.",
			IsRead:  false,
		},
		{
			UserID:  adminID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'Database Schema Migrations & Full-Text Search'.",
			IsRead:  true,
			ReadAt:  &readAt1,
		},
		{
			UserID:  aliceID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'Implement JWT Authentication & Refresh Flow'.",
			IsRead:  true,
			ReadAt:  &readAt1,
		},
		{
			UserID:  aliceID,
			Type:    "PROJECT_INVITE",
			Title:   "Project Invitation",
			Message: "You were added to 'Core Platform & API' as ADMIN.",
			IsRead:  false,
		},
		{
			UserID:  bobID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'Build Redis Worker Pool & Queue Manager'.",
			IsRead:  false,
		},
		{
			UserID:  bobID,
			Type:    "TASK_REMINDER",
			Title:   "Task Overdue",
			Message: "Task 'Fix Redis connection timeout in staging' is currently overdue.",
			IsRead:  false,
		},
	}

	for _, n := range notifications {
		var nID uuid.UUID
		err := db.QueryRow(ctx, "SELECT id FROM notifications WHERE user_id = $1 AND title = $2 LIMIT 1", n.UserID, n.Title).Scan(&nID)
		if err != nil {
			insertNotif := `
				INSERT INTO notifications (user_id, type, title, message, is_read, read_at, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, NOW())
			`
			_, _ = db.Exec(ctx, insertNotif, n.UserID, n.Type, n.Title, n.Message, n.IsRead, n.ReadAt)
		}
	}

	fmt.Println("\n========================================================")
	fmt.Println("🚀 GoFlow Full Database Seeding Completed Successfully!")
	fmt.Println("========================================================")
	fmt.Println("Seeded Entities:")
	fmt.Println("  • Migrations: Applied 5 database migrations")
	fmt.Println("  • Users:      3 accounts (Admin, Alice Smith, Bob Jones)")
	fmt.Println("  • Projects:   3 projects with assigned members & roles")
	fmt.Println("  • Tasks:      8 tasks across TODO, IN_PROGRESS, BLOCKED, COMPLETED")
	fmt.Println("  • Subtasks:   Checklist items with progress status")
	fmt.Println("  • Comments:   Collaborative task comments")
	fmt.Println("  • Workflows:  2 active automated rules with execution logs")
	fmt.Println("  • Alerts:     In-app notifications & user preferences")
	fmt.Println("--------------------------------------------------------")
	fmt.Println("Credentials for testing login:")
	fmt.Println("--------------------------------------------------------")
	fmt.Println("Admin:     admin@goflow.com     / Password123!")
	fmt.Println("Employee:  employee1@goflow.com / Password123!")
	fmt.Println("Employee:  employee2@goflow.com / Password123!")
	fmt.Println("========================================================")
}
