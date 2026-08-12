package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type analyticsService struct {
	db *pgxpool.Pool
}

func NewAnalyticsService(db *pgxpool.Pool) domain.AnalyticsService {
	return &analyticsService{db: db}
}

func (s *analyticsService) GetSummary(ctx context.Context) (*domain.AnalyticsSummary, error) {
	summary := &domain.AnalyticsSummary{}

	queryTasks := `
		SELECT 
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'COMPLETED'),
			COUNT(*) FILTER (WHERE status IN ('TODO', 'IN_PROGRESS')),
			COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'COMPLETED'),
			COUNT(*) FILTER (WHERE status = 'BLOCKED')
		FROM tasks
	`
	err := s.db.QueryRow(ctx, queryTasks).Scan(
		&summary.TotalTasks,
		&summary.CompletedTasks,
		&summary.PendingTasks,
		&summary.OverdueTasks,
		&summary.BlockedTasks,
	)
	if err != nil {
		return nil, err
	}

	if summary.TotalTasks > 0 {
		summary.CompletionRate = (float64(summary.CompletedTasks) / float64(summary.TotalTasks)) * 100
	}

	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM projects`).Scan(&summary.TotalProjects)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM workflows`).Scan(&summary.TotalWorkflows)
	_ = s.db.QueryRow(ctx, `SELECT COUNT(*) FROM workflow_executions`).Scan(&summary.WorkflowExecutions)

	return summary, nil
}

func (s *analyticsService) GetProjectAnalytics(ctx context.Context) ([]*domain.ProjectAnalytics, error) {
	query := `
		SELECT 
			p.id, 
			p.name,
			COUNT(t.id) as total_tasks,
			COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') as completed_tasks
		FROM projects p
		LEFT JOIN tasks t ON p.id = t.project_id
		GROUP BY p.id, p.name
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*domain.ProjectAnalytics{}
	for rows.Next() {
		pa := &domain.ProjectAnalytics{}
		if err := rows.Scan(&pa.ProjectID, &pa.ProjectName, &pa.TotalTasks, &pa.CompletedTasks); err != nil {
			return nil, err
		}
		if pa.TotalTasks > 0 {
			pa.ProgressPct = (float64(pa.CompletedTasks) / float64(pa.TotalTasks)) * 100
		}
		list = append(list, pa)
	}

	return list, nil
}

func (s *analyticsService) GetProductivityMetrics(ctx context.Context) (*domain.ProductivityMetrics, error) {
	metrics := &domain.ProductivityMetrics{}

	query := `
		SELECT 
			COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days' AND status = 'COMPLETED'),
			COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '30 days' AND status = 'COMPLETED')
		FROM tasks
	`
	err := s.db.QueryRow(ctx, query).Scan(&metrics.Completed7Days, &metrics.Completed30Days)
	if err != nil {
		return nil, err
	}

	metrics.VelocityPerDay = float64(metrics.Completed7Days) / 7.0
	return metrics, nil
}
