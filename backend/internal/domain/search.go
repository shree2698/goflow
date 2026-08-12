package domain

import "context"

type SearchParams struct {
	Query     string `json:"q"`
	Status    string `json:"status"`
	Priority  string `json:"priority"`
	ProjectID string `json:"project_id"`
	SortBy    string `json:"sort_by"`
	SortOrder string `json:"sort_order"`
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
}

type SearchResult struct {
	Data       []interface{} `json:"data"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	TotalPages int           `json:"total_pages"`
}

type SearchService interface {
	SearchTasks(ctx context.Context, params SearchParams) (*SearchResult, error)
}
