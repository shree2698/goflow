package domain

import (
	"context"
)

type AnalyticsSummary struct {
	TotalTasks        int64   `json:"total_tasks"`
	CompletedTasks    int64   `json:"completed_tasks"`
	PendingTasks      int64   `json:"pending_tasks"`
	OverdueTasks      int64   `json:"overdue_tasks"`
	BlockedTasks      int64   `json:"blocked_tasks"`
	CompletionRate    float64 `json:"completion_rate"`
	TotalProjects     int64   `json:"total_projects"`
	TotalWorkflows    int64   `json:"total_workflows"`
	WorkflowExecutions int64  `json:"workflow_executions"`
}

type ProjectAnalytics struct {
	ProjectID      string  `json:"project_id"`
	ProjectName    string  `json:"project_name"`
	TotalTasks     int64   `json:"total_tasks"`
	CompletedTasks int64   `json:"completed_tasks"`
	ProgressPct    float64 `json:"progress_pct"`
}

type ProductivityMetrics struct {
	Completed7Days  int64 `json:"completed_7_days"`
	Completed30Days int64 `json:"completed_30_days"`
	VelocityPerDay  float64 `json:"velocity_per_day"`
}

type AnalyticsService interface {
	GetSummary(ctx context.Context) (*AnalyticsSummary, error)
	GetProjectAnalytics(ctx context.Context) ([]*ProjectAnalytics, error)
	GetProductivityMetrics(ctx context.Context) (*ProductivityMetrics, error)
}
