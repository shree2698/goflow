package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type AssistantRepository interface {
	FindTasks(ctx context.Context, filter AssistantTaskFilter) ([]domain.AssistantTask, error)
	BatchUpdateStatus(ctx context.Context, projectID uuid.UUID, fromStatuses []string, toStatus string) ([]domain.AssistantTask, int, error)
	FindProjectByName(ctx context.Context, name string, userID uuid.UUID, isAdmin bool) (*domain.Project, error)
	FindTaskByTitle(ctx context.Context, title string, userID uuid.UUID, isAdmin bool) (*domain.AssistantTask, error)
	GetUserDefaultProject(ctx context.Context, userID uuid.UUID, isAdmin bool) (*domain.Project, error)
}

type AssistantTaskFilter struct {
	UserID         uuid.UUID
	IsAdmin        bool
	AssigneeID     *uuid.UUID
	ProjectID      *uuid.UUID
	Status         string
	ExcludeStatus  []string
	Priority       string
	OverdueOnly    bool
	DueTodayOnly   bool
	DueBefore      *time.Time
	SearchQuery    string
	Limit          int
	SortByPriority bool
}

type assistantRepository struct {
	db *pgxpool.Pool
}

func NewAssistantRepository(db *pgxpool.Pool) AssistantRepository {
	return &assistantRepository{db: db}
}

func (r *assistantRepository) FindTasks(ctx context.Context, filter AssistantTaskFilter) ([]domain.AssistantTask, error) {
	whereClauses := []string{"t.deleted_at IS NULL"}
	args := []any{}
	argIdx := 1

	// Access control: if not admin, user can only see tasks from assigned projects or assigned directly to them
	if !filter.IsAdmin {
		whereClauses = append(whereClauses, fmt.Sprintf(
			"(t.assignee_id = $%d OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $%d))",
			argIdx, argIdx,
		))
		args = append(args, filter.UserID)
		argIdx++
	}

	// Filter by specific assignee (e.g. "assigned to me")
	if filter.AssigneeID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("t.assignee_id = $%d", argIdx))
		args = append(args, *filter.AssigneeID)
		argIdx++
	}

	// Filter by project
	if filter.ProjectID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("t.project_id = $%d", argIdx))
		args = append(args, *filter.ProjectID)
		argIdx++
	}

	// Status filter
	if filter.Status != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("LOWER(t.status) = LOWER($%d)", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	// Exclude status
	if len(filter.ExcludeStatus) > 0 {
		placeholders := make([]string, len(filter.ExcludeStatus))
		for i, st := range filter.ExcludeStatus {
			placeholders[i] = fmt.Sprintf("LOWER($%d)", argIdx)
			args = append(args, st)
			argIdx++
		}
		whereClauses = append(whereClauses, fmt.Sprintf("LOWER(t.status) NOT IN (%s)", strings.Join(placeholders, ", ")))
	}

	// Priority filter
	if filter.Priority != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("LOWER(t.priority) = LOWER($%d)", argIdx))
		args = append(args, filter.Priority)
		argIdx++
	}

	// Overdue filter: due_date < NOW() and status not done/archived
	if filter.OverdueOnly {
		whereClauses = append(whereClauses, "t.due_date IS NOT NULL AND t.due_date < NOW()")
		whereClauses = append(whereClauses, "LOWER(t.status) NOT IN ('done', 'completed', 'archived')")
	}

	// Due today filter
	if filter.DueTodayOnly {
		whereClauses = append(whereClauses, "t.due_date IS NOT NULL AND t.due_date::date = CURRENT_DATE")
		whereClauses = append(whereClauses, "LOWER(t.status) NOT IN ('done', 'completed', 'archived')")
	}

	// Due before filter
	if filter.DueBefore != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("t.due_date IS NOT NULL AND t.due_date <= $%d", argIdx))
		args = append(args, *filter.DueBefore)
		argIdx++
	}

	// Search query in title or description
	if filter.SearchQuery != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(t.title ILIKE $%d OR t.description ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+filter.SearchQuery+"%")
		argIdx++
	}

	// Ordering
	orderBy := "t.created_at DESC"
	if filter.OverdueOnly {
		orderBy = "t.due_date ASC"
	} else if filter.SortByPriority {
		orderBy = `
			CASE LOWER(t.priority)
				WHEN 'urgent' THEN 1
				WHEN 'high' THEN 2
				WHEN 'medium' THEN 3
				WHEN 'low' THEN 4
				ELSE 5
			END ASC,
			CASE 
				WHEN t.due_date IS NOT NULL AND t.due_date < NOW() THEN 0
				WHEN t.due_date IS NOT NULL AND t.due_date::date = CURRENT_DATE THEN 1
				WHEN t.due_date IS NOT NULL THEN 2
				ELSE 3
			END ASC,
			t.created_at DESC
		`
	}

	limit := 25
	if filter.Limit > 0 && filter.Limit <= 100 {
		limit = filter.Limit
	}

	query := fmt.Sprintf(`
		SELECT 
			t.id, t.project_id, COALESCE(p.name, 'Unknown Project') as project_name,
			t.title, COALESCE(t.description, '') as description,
			t.status, t.priority, t.due_date, t.assignee_id,
			COALESCE(u.full_name, 'Unassigned') as assignee_name,
			COALESCE(t.tags, '{}') as tags, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d
	`, strings.Join(whereClauses, " AND "), orderBy, argIdx)

	args = append(args, limit)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	now := time.Now()
	var tasks []domain.AssistantTask
	for rows.Next() {
		var t domain.AssistantTask
		var statusStr, priorityStr string
		var tags []string
		err := rows.Scan(
			&t.ID, &t.ProjectID, &t.ProjectName,
			&t.Title, &t.Description,
			&statusStr, &priorityStr, &t.DueDate, &t.AssigneeID,
			&t.AssigneeName, &tags, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		t.Status = domain.TaskStatus(statusStr)
		t.Priority = domain.TaskPriority(priorityStr)
		t.Tags = tags
		if t.DueDate != nil && t.DueDate.Before(now) &&
			statusStr != "done" && statusStr != "completed" && statusStr != "archived" {
			t.IsOverdue = true
		}
		tasks = append(tasks, t)
	}

	return tasks, nil
}

func (r *assistantRepository) BatchUpdateStatus(
	ctx context.Context,
	projectID uuid.UUID,
	fromStatuses []string,
	toStatus string,
) ([]domain.AssistantTask, int, error) {
	lowerStatuses := make([]string, len(fromStatuses))
	for i, s := range fromStatuses {
		lowerStatuses[i] = strings.ToLower(strings.TrimSpace(s))
	}

	query := `
		UPDATE tasks
		SET status = $1,
			updated_at = NOW(),
			completed_at = CASE 
				WHEN $1 IN ('done', 'completed') THEN NOW() 
				WHEN $1 = 'archived' AND completed_at IS NULL THEN NOW()
				ELSE completed_at 
			END
		WHERE project_id = $2
		  AND LOWER(status) = ANY($3)
		  AND deleted_at IS NULL
		RETURNING id, project_id, title, status, priority, due_date, assignee_id, created_at, updated_at
	`

	rows, err := r.db.Query(ctx, query, toStatus, projectID, lowerStatuses)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var updated []domain.AssistantTask
	for rows.Next() {
		var t domain.AssistantTask
		var statusStr, priorityStr string
		err := rows.Scan(
			&t.ID, &t.ProjectID, &t.Title, &statusStr, &priorityStr,
			&t.DueDate, &t.AssigneeID, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		t.Status = domain.TaskStatus(statusStr)
		t.Priority = domain.TaskPriority(priorityStr)
		updated = append(updated, t)
	}

	return updated, len(updated), nil
}

func (r *assistantRepository) FindProjectByName(
	ctx context.Context,
	name string,
	userID uuid.UUID,
	isAdmin bool,
) (*domain.Project, error) {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return nil, domain.ErrNotFound
	}

	// 1. Exact case-insensitive match
	query := `
		SELECT p.id, p.name, p.description, p.color, p.status, p.owner_id, p.created_at, p.updated_at, p.deleted_at
		FROM projects p
		WHERE p.deleted_at IS NULL
		  AND LOWER(p.name) = LOWER($1)
	`
	if !isAdmin {
		query += ` AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2)`
	}
	query += ` LIMIT 1`

	var p domain.Project
	var err error
	if isAdmin {
		err = r.db.QueryRow(ctx, query, cleanName).Scan(
			&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		)
	} else {
		err = r.db.QueryRow(ctx, query, cleanName, userID).Scan(
			&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		)
	}

	if err == nil {
		return &p, nil
	}

	// 2. Partial / ILIKE match
	queryFuzzy := `
		SELECT p.id, p.name, p.description, p.color, p.status, p.owner_id, p.created_at, p.updated_at, p.deleted_at
		FROM projects p
		WHERE p.deleted_at IS NULL
		  AND p.name ILIKE $1
	`
	if !isAdmin {
		queryFuzzy += ` AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2)`
	}
	queryFuzzy += ` ORDER BY LENGTH(p.name) ASC LIMIT 1`

	fuzzyPattern := "%" + cleanName + "%"
	if isAdmin {
		err = r.db.QueryRow(ctx, queryFuzzy, fuzzyPattern).Scan(
			&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		)
	} else {
		err = r.db.QueryRow(ctx, queryFuzzy, fuzzyPattern, userID).Scan(
			&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		)
	}

	if err != nil {
		return nil, domain.ErrNotFound
	}
	return &p, nil
}

func (r *assistantRepository) FindTaskByTitle(
	ctx context.Context,
	title string,
	userID uuid.UUID,
	isAdmin bool,
) (*domain.AssistantTask, error) {
	cleanTitle := strings.TrimSpace(title)
	if cleanTitle == "" {
		return nil, domain.ErrNotFound
	}

	query := `
		SELECT 
			t.id, t.project_id, COALESCE(p.name, 'Unknown Project') as project_name,
			t.title, COALESCE(t.description, '') as description,
			t.status, t.priority, t.due_date, t.assignee_id,
			COALESCE(u.full_name, 'Unassigned') as assignee_name,
			COALESCE(t.tags, '{}') as tags, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.deleted_at IS NULL
		  AND (LOWER(t.title) = LOWER($1) OR t.title ILIKE $2)
	`
	if !isAdmin {
		query += ` AND (t.assignee_id = $3 OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $3))`
	}
	query += ` ORDER BY CASE WHEN LOWER(t.title) = LOWER($1) THEN 0 ELSE 1 END, t.created_at DESC LIMIT 1`

	var t domain.AssistantTask
	var statusStr, priorityStr string
	var tags []string
	var err error

	if isAdmin {
		err = r.db.QueryRow(ctx, query, cleanTitle, "%"+cleanTitle+"%").Scan(
			&t.ID, &t.ProjectID, &t.ProjectName,
			&t.Title, &t.Description,
			&statusStr, &priorityStr, &t.DueDate, &t.AssigneeID,
			&t.AssigneeName, &tags, &t.CreatedAt, &t.UpdatedAt,
		)
	} else {
		err = r.db.QueryRow(ctx, query, cleanTitle, "%"+cleanTitle+"%", userID).Scan(
			&t.ID, &t.ProjectID, &t.ProjectName,
			&t.Title, &t.Description,
			&statusStr, &priorityStr, &t.DueDate, &t.AssigneeID,
			&t.AssigneeName, &tags, &t.CreatedAt, &t.UpdatedAt,
		)
	}

	if err != nil {
		return nil, domain.ErrNotFound
	}
	t.Status = domain.TaskStatus(statusStr)
	t.Priority = domain.TaskPriority(priorityStr)
	t.Tags = tags
	return &t, nil
}

func (r *assistantRepository) GetUserDefaultProject(
	ctx context.Context,
	userID uuid.UUID,
	isAdmin bool,
) (*domain.Project, error) {
	query := `
		SELECT p.id, p.name, p.description, p.color, p.status, p.owner_id, p.created_at, p.updated_at, p.deleted_at
		FROM projects p
		WHERE p.deleted_at IS NULL
	`
	if !isAdmin {
		query += ` AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1)`
	}
	query += ` ORDER BY p.created_at ASC LIMIT 1`

	var p domain.Project
	var err error
	if isAdmin {
		err = r.db.QueryRow(ctx, query).Scan(
			&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		)
	} else {
		err = r.db.QueryRow(ctx, query, userID).Scan(
			&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		)
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}
