package service

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type searchService struct {
	db *pgxpool.Pool
}

func NewSearchService(db *pgxpool.Pool) domain.SearchService {
	return &searchService{db: db}
}

func (s *searchService) SearchTasks(ctx context.Context, params domain.SearchParams) (*domain.SearchResult, error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.Limit <= 0 || params.Limit > 100 {
		params.Limit = 20
	}
	offset := (params.Page - 1) * params.Limit

	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if params.Query != "" {
		whereClause += fmt.Sprintf(" AND (title ILIKE $%d OR description ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+params.Query+"%")
		argIdx++
	}

	if params.Status != "" {
		whereClause += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, params.Status)
		argIdx++
	}

	if params.Priority != "" {
		whereClause += fmt.Sprintf(" AND priority = $%d", argIdx)
		args = append(args, params.Priority)
		argIdx++
	}

	if params.ProjectID != "" {
		whereClause += fmt.Sprintf(" AND project_id = $%d", argIdx)
		args = append(args, params.ProjectID)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM tasks %s", whereClause)
	var total int64
	err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	sortCol := "created_at"
	if params.SortBy == "due_date" || params.SortBy == "priority" || params.SortBy == "title" {
		sortCol = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" || params.SortOrder == "ASC" {
		sortOrder = "ASC"
	}

	query := fmt.Sprintf(`
		SELECT id, project_id, title, description, status, priority, due_date, created_at, updated_at
		FROM tasks
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortCol, sortOrder, argIdx, argIdx+1)

	args = append(args, params.Limit, offset)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := []interface{}{}
	for rows.Next() {
		var id, projectID, title, description, status, priority string
		var dueDate, createdAt, updatedAt interface{}
		if err := rows.Scan(&id, &projectID, &title, &description, &status, &priority, &dueDate, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, map[string]interface{}{
			"id":          id,
			"project_id":  projectID,
			"title":       title,
			"description": description,
			"status":      status,
			"priority":    priority,
			"due_date":    dueDate,
			"created_at":  createdAt,
			"updated_at":  updatedAt,
		})
	}

	totalPages := int((total + int64(params.Limit) - 1) / int64(params.Limit))

	return &domain.SearchResult{
		Data:       tasks,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}
