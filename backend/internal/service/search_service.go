package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/service/assistant"
)

type searchService struct {
	db        *pgxpool.Pool
	llmClient assistant.LLMClient
}

func NewSearchService(db *pgxpool.Pool, llmClient assistant.LLMClient) domain.SearchService {
	return &searchService{db: db, llmClient: llmClient}
}

func (s *searchService) SearchTasks(ctx context.Context, params domain.SearchParams) (*domain.SearchResult, error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.Limit <= 0 || params.Limit > 100 {
		params.Limit = 20
	}
	offset := (params.Page - 1) * params.Limit

	whereClause := "WHERE deleted_at IS NULL"
	args := []interface{}{}
	argIdx := 1

	if params.UserID != "" {
		whereClause += fmt.Sprintf(" AND project_id IN (SELECT project_id FROM project_members WHERE user_id = $%d)", argIdx)
		args = append(args, params.UserID)
		argIdx++
	}

	var queryEmbedding []float32
	var isSemantic bool

	if params.Query != "" {
		if s.llmClient.IsConfigured() && len(strings.Split(params.Query, " ")) > 2 {
			emb, err := s.llmClient.GenerateEmbedding(ctx, params.Query)
			if err == nil && len(emb) > 0 {
				queryEmbedding = emb
				isSemantic = true
			}
		}

		if !isSemantic {
			whereClause += fmt.Sprintf(" AND (search_vector @@ plainto_tsquery('english', $%d) OR title ILIKE $%d OR description ILIKE $%d)", argIdx, argIdx+1, argIdx+1)
			args = append(args, params.Query, "%"+params.Query+"%")
			argIdx += 2
		} else {
			// still filter by query in some way? No, semantic search is the filter.
			// pgvector can just sort by distance.
			// optionally we can add a distance threshold in WHERE, but let's just order by it.
		}
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

	if isSemantic {
		embStrs := make([]string, len(queryEmbedding))
		for i, v := range queryEmbedding {
			embStrs[i] = fmt.Sprintf("%f", v)
		}
		vectorStr := "[" + strings.Join(embStrs, ",") + "]"

		sortCol = fmt.Sprintf("task_embedding <-> $%d", argIdx)
		sortOrder = ""
		args = append(args, vectorStr)
		argIdx++
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

	var aiAnswer string
	if isSemantic && len(tasks) > 0 {
		ans, err := s.llmClient.SummarizeTasks(ctx, params.Query, tasks)
		if err == nil {
			aiAnswer = ans
		}
	}

	return &domain.SearchResult{
		Data:       tasks,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
		AIAnswer:   aiAnswer,
	}, nil
}
