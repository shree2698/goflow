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
	Timezone string
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Server.Env)
	log.Info().Msg("Starting full database seed (migrations, 10 employees, active/inactive projects, access controls, tasks, workflows, notifications)...")

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

	// 2. Seed 10 Employees (+ 1 Admin)
	log.Info().Msg("Step 2: Seeding users (Admin + 10 Employees)...")
	employees := []EmployeeSeed{
		{
			Email:    "admin@goflow.com",
			Password: "Password123!",
			FullName: "System Administrator",
			Role:     "admin",
			Timezone: "UTC",
		},
		{
			Email:    "employee1@goflow.com",
			Password: "Password123!",
			FullName: "Alice Smith",
			Role:     "employee",
			Timezone: "America/New_York",
		},
		{
			Email:    "employee2@goflow.com",
			Password: "Password123!",
			FullName: "Bob Jones",
			Role:     "employee",
			Timezone: "America/Chicago",
		},
		{
			Email:    "employee3@goflow.com",
			Password: "Password123!",
			FullName: "Charlie Brown",
			Role:     "employee",
			Timezone: "America/Los_Angeles",
		},
		{
			Email:    "employee4@goflow.com",
			Password: "Password123!",
			FullName: "Diana Prince",
			Role:     "employee",
			Timezone: "Europe/London",
		},
		{
			Email:    "employee5@goflow.com",
			Password: "Password123!",
			FullName: "Ethan Hunt",
			Role:     "employee",
			Timezone: "Europe/Berlin",
		},
		{
			Email:    "employee6@goflow.com",
			Password: "Password123!",
			FullName: "Fiona Gallagher",
			Role:     "employee",
			Timezone: "America/Toronto",
		},
		{
			Email:    "employee7@goflow.com",
			Password: "Password123!",
			FullName: "George Clark",
			Role:     "employee",
			Timezone: "Asia/Singapore",
		},
		{
			Email:    "employee8@goflow.com",
			Password: "Password123!",
			FullName: "Hannah Abbott",
			Role:     "employee",
			Timezone: "Asia/Tokyo",
		},
		{
			Email:    "employee9@goflow.com",
			Password: "Password123!",
			FullName: "Ian Malcolm",
			Role:     "employee",
			Timezone: "Australia/Sydney",
		},
		{
			Email:    "employee10@goflow.com",
			Password: "Password123!",
			FullName: "Julia Roberts",
			Role:     "employee",
			Timezone: "America/Denver",
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
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (email) DO UPDATE 
			SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role, timezone = EXCLUDED.timezone
			RETURNING id;
		`
		err = db.QueryRow(ctx, query, emp.Email, hash, emp.FullName, emp.Role, emp.Timezone).Scan(&userID)
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
	charlieID := userIDs["employee3@goflow.com"]
	dianaID := userIDs["employee4@goflow.com"]
	ethanID := userIDs["employee5@goflow.com"]
	fionaID := userIDs["employee6@goflow.com"]
	georgeID := userIDs["employee7@goflow.com"]
	hannahID := userIDs["employee8@goflow.com"]
	ianID := userIDs["employee9@goflow.com"]
	juliaID := userIDs["employee10@goflow.com"]

	// 3. Seed Projects (Active & Inactive) with Access Matrix
	log.Info().Msg("Step 3: Seeding active & inactive projects and employee accesses...")
	type ProjectMemberDef struct {
		UserID uuid.UUID
		Role   string
	}

	type ProjectDef struct {
		Name        string
		Description string
		Color       string
		Status      string
		OwnerID     uuid.UUID
		Members     []ProjectMemberDef
	}

	projects := []ProjectDef{
		// Active Projects
		{
			Name:        "Core Platform & API",
			Description: "Core backend services, database schema, Redis worker queue, and high-performance REST APIs.",
			Color:       "#6366F1",
			Status:      "active",
			OwnerID:     adminID,
			Members: []ProjectMemberDef{
				{UserID: adminID, Role: "OWNER"},
				{UserID: aliceID, Role: "ADMIN"},
				{UserID: bobID, Role: "MEMBER"},
				{UserID: ianID, Role: "MEMBER"},
				{UserID: hannahID, Role: "VIEWER"},
			},
		},
		{
			Name:        "Frontend Redesign",
			Description: "Modernizing the user interface with Next.js 14, Tailwind CSS, and Neumorphic components.",
			Color:       "#EC4899",
			Status:      "active",
			OwnerID:     aliceID,
			Members: []ProjectMemberDef{
				{UserID: aliceID, Role: "OWNER"},
				{UserID: charlieID, Role: "ADMIN"},
				{UserID: adminID, Role: "ADMIN"},
				{UserID: bobID, Role: "MEMBER"},
				{UserID: juliaID, Role: "VIEWER"},
			},
		},
		{
			Name:        "Mobile Companion App",
			Description: "Cross-platform mobile client for workflow alerts, task reviews, and offline sync.",
			Color:       "#10B981",
			Status:      "active",
			OwnerID:     georgeID,
			Members: []ProjectMemberDef{
				{UserID: georgeID, Role: "OWNER"},
				{UserID: aliceID, Role: "ADMIN"},
				{UserID: bobID, Role: "MEMBER"},
				{UserID: ethanID, Role: "MEMBER"},
				{UserID: adminID, Role: "VIEWER"},
			},
		},
		{
			Name:        "AI Workflow Automation",
			Description: "Intelligent rule evaluator, LLM intent engine, and automated task execution assistant.",
			Color:       "#8B5CF6",
			Status:      "active",
			OwnerID:     dianaID,
			Members: []ProjectMemberDef{
				{UserID: dianaID, Role: "OWNER"},
				{UserID: aliceID, Role: "ADMIN"},
				{UserID: adminID, Role: "ADMIN"},
				{UserID: fionaID, Role: "MEMBER"},
				{UserID: ethanID, Role: "MEMBER"},
			},
		},
		{
			Name:        "Customer Portal 2.0",
			Description: "Self-service client dashboard, team onboarding wizard, and usage telemetry.",
			Color:       "#06B6D4",
			Status:      "active",
			OwnerID:     juliaID,
			Members: []ProjectMemberDef{
				{UserID: juliaID, Role: "OWNER"},
				{UserID: charlieID, Role: "ADMIN"},
				{UserID: dianaID, Role: "MEMBER"},
				{UserID: hannahID, Role: "VIEWER"},
			},
		},

		// Inactive & Archived Projects
		{
			Name:        "Legacy Monolith Migration",
			Description: "Decommissioned monolithic architecture repository and database after services split.",
			Color:       "#64748B",
			Status:      "inactive",
			OwnerID:     bobID,
			Members: []ProjectMemberDef{
				{UserID: bobID, Role: "OWNER"},
				{UserID: ianID, Role: "ADMIN"},
				{UserID: aliceID, Role: "MEMBER"},
				{UserID: adminID, Role: "VIEWER"},
			},
		},
		{
			Name:        "Q1 Marketing Landing Pages",
			Description: "Completed promotional landing pages, SEO optimizations, and A/B campaign experiments.",
			Color:       "#F59E0B",
			Status:      "completed",
			OwnerID:     charlieID,
			Members: []ProjectMemberDef{
				{UserID: charlieID, Role: "OWNER"},
				{UserID: dianaID, Role: "ADMIN"},
				{UserID: aliceID, Role: "MEMBER"},
				{UserID: juliaID, Role: "VIEWER"},
			},
		},
		{
			Name:        "Security Audit & Compliance 2025",
			Description: "SOC2 Type II penetration tests, automated vulnerability scans, and access control audit.",
			Color:       "#EF4444",
			Status:      "archived",
			OwnerID:     hannahID,
			Members: []ProjectMemberDef{
				{UserID: hannahID, Role: "OWNER"},
				{UserID: adminID, Role: "ADMIN"},
				{UserID: bobID, Role: "MEMBER"},
				{UserID: ianID, Role: "MEMBER"},
			},
		},
		{
			Name:        "Data Warehouse & BI Pipeline v1",
			Description: "ClickHouse analytics ingestion and Metabase reporting pipelines (on hold pending cloud budget).",
			Color:       "#6B7280",
			Status:      "on_hold",
			OwnerID:     fionaID,
			Members: []ProjectMemberDef{
				{UserID: fionaID, Role: "OWNER"},
				{UserID: ianID, Role: "ADMIN"},
				{UserID: dianaID, Role: "MEMBER"},
				{UserID: ethanID, Role: "VIEWER"},
			},
		},
		{
			Name:        "Deprecated Kong API Gateway",
			Description: "Previous generation Kong reverse proxy and custom Lua plugins, retired in favor of Envoy.",
			Color:       "#94A3B8",
			Status:      "inactive",
			OwnerID:     ianID,
			Members: []ProjectMemberDef{
				{UserID: ianID, Role: "OWNER"},
				{UserID: bobID, Role: "ADMIN"},
				{UserID: hannahID, Role: "VIEWER"},
				{UserID: adminID, Role: "VIEWER"},
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
				VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
			`
			if _, err := db.Exec(ctx, insertProj, pID, p.Name, p.Description, p.Color, p.Status, p.OwnerID); err != nil {
				log.Error().Err(err).Str("project", p.Name).Msg("Failed to insert project")
				continue
			}
		} else {
			// Update status, description, color, owner_id if project exists
			updateProj := `
				UPDATE projects 
				SET description = $1, color = $2, status = $3, owner_id = $4, updated_at = NOW()
				WHERE id = $5
			`
			if _, err := db.Exec(ctx, updateProj, p.Description, p.Color, p.Status, p.OwnerID, pID); err != nil {
				log.Error().Err(err).Str("project", p.Name).Msg("Failed to update project")
			}
		}
		projectIDs[p.Name] = pID
		log.Info().Str("project", p.Name).Str("status", p.Status).Str("id", pID.String()).Msg("Seeded project")

		// Add project members and their accesses
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
	mobileProjID := projectIDs["Mobile Companion App"]
	aiProjID := projectIDs["AI Workflow Automation"]
	portalProjID := projectIDs["Customer Portal 2.0"]
	legacyProjID := projectIDs["Legacy Monolith Migration"]
	auditProjID := projectIDs["Security Audit & Compliance 2025"]
	dwProjID := projectIDs["Data Warehouse & BI Pipeline v1"]

	// 4. Seed Tasks across Active & Inactive Projects
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
		// Active: Core Platform & API
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
			Title:       "Cloud Infrastructure Terraform Modules",
			Description: "Provision AWS VPC, RDS Multi-AZ PostgreSQL cluster, and ElastiCache Redis replication group.",
			Status:      "IN_PROGRESS",
			Priority:    "high",
			DueDate:     &dueNext96h,
			CreatorID:   adminID,
			AssigneeID:  &ianID,
			Tags:        []string{"DevOps", "Terraform", "AWS"},
			Subtasks: []struct {
				Title     string
				Completed bool
			}{
				{Title: "Write RDS module with automated backups", Completed: true},
				{Title: "Configure security groups and IAM roles", Completed: false},
			},
		},
		{
			ProjectID:   coreProjID,
			Title:       "RBAC Role Validation Middleware Audit",
			Description: "Enforce strict ProjectRole permission checks on task deletions and workflow triggers.",
			Status:      "TODO",
			Priority:    "medium",
			DueDate:     &dueNext72h,
			CreatorID:   adminID,
			AssigneeID:  &hannahID,
			Tags:        []string{"Security", "RBAC"},
		},

		// Active: Frontend Redesign
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
			AssigneeID:  &charlieID,
			Tags:        []string{"Frontend", "UX"},
			Comments: []struct {
				AuthorID uuid.UUID
				Content  string
			}{
				{AuthorID: charlieID, Content: "Added keyboard shortcut listeners and fuzzy search ranking."},
			},
		},
		{
			ProjectID:   frontProjID,
			Title:       "Real-Time WebSocket Notifications Bell",
			Description: "Live badge indicator and dropdown for in-app notifications.",
			Status:      "TODO",
			Priority:    "medium",
			DueDate:     &dueNext96h,
			CreatorID:   aliceID,
			AssigneeID:  &charlieID,
			Tags:        []string{"Frontend", "WebSocket"},
		},

		// Active: Mobile Companion App
		{
			ProjectID:   mobileProjID,
			Title:       "Push Notification Listener & Offline Queue",
			Description: "Handle APNs / FCM push notifications and queue local mutations when device is offline.",
			Status:      "IN_PROGRESS",
			Priority:    "high",
			DueDate:     &dueNext48h,
			CreatorID:   georgeID,
			AssigneeID:  &georgeID,
			Tags:        []string{"Mobile", "Notifications", "Offline"},
		},
		{
			ProjectID:   mobileProjID,
			Title:       "E2E Detox Automated Test Suite",
			Description: "End-to-end testing pipeline for iOS simulator and Android emulator builds.",
			Status:      "TODO",
			Priority:    "medium",
			DueDate:     &dueNext72h,
			CreatorID:   georgeID,
			AssigneeID:  &ethanID,
			Tags:        []string{"QA", "Mobile", "Testing"},
		},

		// Active: AI Workflow Automation
		{
			ProjectID:   aiProjID,
			Title:       "Implement Prompt Template Routing & LLM Fallback",
			Description: "Dynamic routing between local evaluator models and remote OpenAI/Gemini providers.",
			Status:      "IN_PROGRESS",
			Priority:    "urgent",
			DueDate:     &dueNext24h,
			CreatorID:   dianaID,
			AssigneeID:  &dianaID,
			Tags:        []string{"AI", "LLM", "Orchestration"},
			Comments: []struct {
				AuthorID uuid.UUID
				Content  string
			}{
				{AuthorID: dianaID, Content: "Local fallback is functional; latency is under 120ms."},
			},
		},
		{
			ProjectID:   aiProjID,
			Title:       "Anomaly Detection on Workflow Failure Bursts",
			Description: "Statistical monitoring to alert project owners if recurring workflow triggers fail consecutively.",
			Status:      "TODO",
			Priority:    "medium",
			DueDate:     &dueNext96h,
			CreatorID:   dianaID,
			AssigneeID:  &fionaID,
			Tags:        []string{"Analytics", "AI", "Alerts"},
		},

		// Active: Customer Portal 2.0
		{
			ProjectID:   portalProjID,
			Title:       "Stripe Webhook Handlers for Subscription Lifecycle",
			Description: "Support customer subscription creation, renewal events, and payment failure retries.",
			Status:      "IN_PROGRESS",
			Priority:    "high",
			DueDate:     &dueNext48h,
			CreatorID:   juliaID,
			AssigneeID:  &juliaID,
			Tags:        []string{"Billing", "Stripe", "Portal"},
		},
		{
			ProjectID:   portalProjID,
			Title:       "User Onboarding Step Wizard & Guided Tour",
			Description: "Step-by-step product walkthrough introducing kanban boards and workflow triggers.",
			Status:      "TODO",
			Priority:    "low",
			DueDate:     &dueNext96h,
			CreatorID:   juliaID,
			AssigneeID:  &charlieID,
			Tags:        []string{"Onboarding", "UX"},
		},

		// Inactive: Legacy Monolith Migration
		{
			ProjectID:   legacyProjID,
			Title:       "Final Database Snapshot & S3 Cold Storage Archive",
			Description: "Verify all historical tables dumped and stored in encrypted S3 Glacier vault.",
			Status:      "COMPLETED",
			Priority:    "high",
			DueDate:     &duePast72h,
			CreatorID:   bobID,
			AssigneeID:  &bobID,
			Tags:        []string{"Migration", "Database", "Archived"},
			CompletedAt: &duePast48h,
		},
		{
			ProjectID:   legacyProjID,
			Title:       "Drain Traffic & Decommission Monolith EC2 Clusters",
			Description: "Shut down lingering web instances and release elastic IP addresses.",
			Status:      "COMPLETED",
			Priority:    "medium",
			DueDate:     &duePast48h,
			CreatorID:   bobID,
			AssigneeID:  &ianID,
			Tags:        []string{"Infra", "Decommission"},
			CompletedAt: &duePast24h,
		},

		// Inactive: Security Audit & Compliance 2025
		{
			ProjectID:   auditProjID,
			Title:       "Penetration Testing Remediation Report for SOC2",
			Description: "Close out open CVE vulnerabilities and generate final executive compliance summary.",
			Status:      "COMPLETED",
			Priority:    "urgent",
			DueDate:     &duePast48h,
			CreatorID:   hannahID,
			AssigneeID:  &hannahID,
			Tags:        []string{"SOC2", "Security", "Audit"},
			CompletedAt: &duePast12h,
		},

		// Inactive: Data Warehouse & BI Pipeline v1
		{
			ProjectID:   dwProjID,
			Title:       "Benchmark ClickHouse Ingestion Throughput",
			Description: "Run stress tests simulating 10,000 events/sec through Kafka topic into ClickHouse.",
			Status:      "BLOCKED",
			Priority:    "medium",
			DueDate:     &duePast12h,
			CreatorID:   fionaID,
			AssigneeID:  &fionaID,
			Tags:        []string{"ClickHouse", "DataWarehouse", "Benchmark"},
			Comments: []struct {
				AuthorID uuid.UUID
				Content  string
			}{
				{AuthorID: fionaID, Content: "Project placed on hold pending Q3 cloud budget authorization."},
			},
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
		{
			ProjectID:   aiProjID,
			CreatorID:   dianaID,
			Name:        "Alert Product Lead on AI Pipeline Failure",
			TriggerType: "TASK_STATUS_CHANGED",
			Conditions:  []map[string]any{{"field": "Status", "operator": "EQUALS", "value": "BLOCKED"}},
			Actions:     []map[string]any{{"type": "SEND_NOTIFICATION", "params": map[string]any{"title": "Pipeline Task Blocked", "message": "AI pipeline task is blocked."}}},
			Executions: []struct {
				EventType       string
				Status          string
				ExecutionTimeMs int
				ExecutedAt      time.Time
			}{
				{EventType: "TASK_STATUS_CHANGED", Status: "SUCCESS", ExecutionTimeMs: 12, ExecutedAt: now.Add(-1 * time.Hour)},
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

	// 6. Seed Notification Preferences & Notifications for all 10 employees
	log.Info().Msg("Step 6: Seeding notification preferences & notifications...")
	notificationTypes := []string{"TASK_ASSIGNED", "TASK_REMINDER", "WORKFLOW_ALERT", "COMMENT_MENTION", "PROJECT_INVITE"}
	allUserIDs := []uuid.UUID{adminID, aliceID, bobID, charlieID, dianaID, ethanID, fionaID, georgeID, hannahID, ianID, juliaID}

	for _, uID := range allUserIDs {
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
			UserID:  charlieID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'Implement Command Palette (Ctrl+K)'.",
			IsRead:  false,
		},
		{
			UserID:  dianaID,
			Type:    "PROJECT_INVITE",
			Title:   "Project Role Assigned",
			Message: "You are the OWNER of 'AI Workflow Automation'.",
			IsRead:  false,
		},
		{
			UserID:  ethanID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'E2E Detox Automated Test Suite'.",
			IsRead:  false,
		},
		{
			UserID:  fionaID,
			Type:    "TASK_REMINDER",
			Title:   "Project Status Update",
			Message: "'Data Warehouse & BI Pipeline v1' has been marked ON HOLD.",
			IsRead:  false,
		},
		{
			UserID:  georgeID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'Push Notification Listener & Offline Queue'.",
			IsRead:  false,
		},
		{
			UserID:  hannahID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'Penetration Testing Remediation Report for SOC2'.",
			IsRead:  true,
			ReadAt:  &readAt1,
		},
		{
			UserID:  ianID,
			Type:    "TASK_ASSIGNED",
			Title:   "New Task Assigned",
			Message: "You were assigned to 'Cloud Infrastructure Terraform Modules'.",
			IsRead:  false,
		},
		{
			UserID:  juliaID,
			Type:    "PROJECT_INVITE",
			Title:   "Project Role Assigned",
			Message: "You are the OWNER of 'Customer Portal 2.0'.",
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

	fmt.Println("\n================================================================================")
	fmt.Println("🚀 GoFlow Full Database Seeding Completed Successfully!")
	fmt.Println("================================================================================")
	fmt.Println("Seeded Entities:")
	fmt.Println("  • Migrations: Applied all database migrations")
	fmt.Println("  • Users:      11 accounts (1 Admin + 10 Employees)")
	fmt.Println("  • Projects:   10 projects (5 Active, 2 Inactive, 1 Completed, 1 Archived, 1 On-Hold)")
	fmt.Println("  • Accesses:   Granular ProjectRole matrix (OWNER, ADMIN, MEMBER, VIEWER)")
	fmt.Println("  • Tasks:      Comprehensive tasks with TODO, IN_PROGRESS, BLOCKED, COMPLETED")
	fmt.Println("  • Subtasks:   Granular checklists with completed states")
	fmt.Println("  • Comments:   Collaborative task activity & discussion threads")
	fmt.Println("  • Workflows:  Automated triggers and execution logs")
	fmt.Println("  • Alerts:     In-app notifications & notification preferences")
	fmt.Println("--------------------------------------------------------------------------------")
	fmt.Println("Credentials for testing login (all accounts use Password123!):")
	fmt.Println("--------------------------------------------------------------------------------")
	fmt.Println("  Admin:       admin@goflow.com       | System Administrator")
	fmt.Println("  Employee 1:  employee1@goflow.com   | Alice Smith      (Fullstack Lead)")
	fmt.Println("  Employee 2:  employee2@goflow.com   | Bob Jones        (DevOps & Backend)")
	fmt.Println("  Employee 3:  employee3@goflow.com   | Charlie Brown    (UI/UX Designer)")
	fmt.Println("  Employee 4:  employee4@goflow.com   | Diana Prince     (Product Manager)")
	fmt.Println("  Employee 5:  employee5@goflow.com   | Ethan Hunt       (QA Automation)")
	fmt.Println("  Employee 6:  employee6@goflow.com   | Fiona Gallagher  (Data Engineer)")
	fmt.Println("  Employee 7:  employee7@goflow.com   | George Clark     (Mobile Lead)")
	fmt.Println("  Employee 8:  employee8@goflow.com   | Hannah Abbott    (Security Lead)")
	fmt.Println("  Employee 9:  employee9@goflow.com   | Ian Malcolm      (Cloud Architect)")
	fmt.Println("  Employee 10: employee10@goflow.com  | Julia Roberts    (Customer Success)")
	fmt.Println("================================================================================")
}
