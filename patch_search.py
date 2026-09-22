import re

with open('/home/tanushreemahato/Desktop/Tanushree/goflow/backend/internal/service/search_service.go', 'r') as f:
    content = f.read()

import_replacement = """import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/service/assistant"
)"""
content = re.sub(r'import \([\s\S]*?assistant"\n\)', import_replacement, content)

logic_replacement = """	var queryEmbedding []float32
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
	}"""
content = re.sub(r'\s*if params\.Query != "" {[\s\S]*?argIdx \+= 2\n\t}', logic_replacement, content)

sort_replacement = """	sortCol := "created_at"
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
	`, whereClause, sortCol, sortOrder, argIdx, argIdx+1)"""
content = re.sub(r'\s*sortCol := "created_at"[\s\S]*?LIMIT \$%d OFFSET \$%d\\n`[^)]*\)', sort_replacement, content)


summary_replacement = """	totalPages := int((total + int64(params.Limit) - 1) / int64(params.Limit))

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
	}, nil"""
content = re.sub(r'\s*totalPages := int\(\(total \+ int64\(params\.Limit\) - 1\) / int64\(params\.Limit\)\)[\s\S]*?}, nil', summary_replacement, content)

with open('/home/tanushreemahato/Desktop/Tanushree/goflow/backend/internal/service/search_service.go', 'w') as f:
    f.write(content)
