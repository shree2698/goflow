package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type ProjectRepository interface {
	Create(ctx context.Context, project *domain.Project) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Project, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Project, error)
	Update(ctx context.Context, project *domain.Project) error
	Delete(ctx context.Context, id uuid.UUID) error
	AddMember(ctx context.Context, member *domain.ProjectMember) error
	RemoveMember(ctx context.Context, projectID, userID uuid.UUID) error
	GetMemberRole(ctx context.Context, projectID, userID uuid.UUID) (domain.ProjectRole, error)
	ListMembers(ctx context.Context, projectID uuid.UUID) ([]domain.ProjectMemberWithUser, error)
}

type projectRepository struct {
	db *pgxpool.Pool
}

func NewProjectRepository(db *pgxpool.Pool) ProjectRepository {
	return &projectRepository{db: db}
}

func (r *projectRepository) Create(ctx context.Context, project *domain.Project) error {
	query := `
		INSERT INTO projects (id, name, description, color, status, owner_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(ctx, query,
		project.ID, project.Name, project.Description, project.Color,
		project.Status, project.OwnerID, project.CreatedAt, project.UpdatedAt,
	)
	return err
}

func (r *projectRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Project, error) {
	query := `
		SELECT id, name, description, color, status, owner_id, created_at, updated_at, deleted_at
		FROM projects
		WHERE id = $1 AND deleted_at IS NULL
	`
	var p domain.Project
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *projectRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Project, error) {
	query := `
		SELECT p.id, p.name, p.description, p.color, p.status, p.owner_id, p.created_at, p.updated_at, p.deleted_at
		FROM projects p
		INNER JOIN project_members pm ON p.id = pm.project_id
		WHERE pm.user_id = $1 AND p.deleted_at IS NULL
		ORDER BY p.updated_at DESC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []domain.Project
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.Status, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *projectRepository) Update(ctx context.Context, project *domain.Project) error {
	project.UpdatedAt = time.Now()
	query := `
		UPDATE projects
		SET name = $1, description = $2, color = $3, status = $4, updated_at = $5
		WHERE id = $6 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query, project.Name, project.Description, project.Color, project.Status, project.UpdatedAt, project.ID)
	return err
}

func (r *projectRepository) Delete(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	query := `UPDATE projects SET deleted_at = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, now, id)
	return err
}

func (r *projectRepository) AddMember(ctx context.Context, member *domain.ProjectMember) error {
	query := `
		INSERT INTO project_members (project_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`
	_, err := r.db.Exec(ctx, query, member.ProjectID, member.UserID, member.Role, member.JoinedAt)
	return err
}

func (r *projectRepository) RemoveMember(ctx context.Context, projectID, userID uuid.UUID) error {
	query := `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, projectID, userID)
	return err
}

func (r *projectRepository) GetMemberRole(ctx context.Context, projectID, userID uuid.UUID) (domain.ProjectRole, error) {
	query := `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`
	var role domain.ProjectRole
	err := r.db.QueryRow(ctx, query, projectID, userID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", domain.ErrForbidden
		}
		return "", err
	}
	return role, nil
}

func (r *projectRepository) ListMembers(ctx context.Context, projectID uuid.UUID) ([]domain.ProjectMemberWithUser, error) {
	query := `
		SELECT pm.project_id, pm.user_id, pm.role, pm.joined_at, u.email, u.full_name, u.avatar_url
		FROM project_members pm
		JOIN users u ON pm.user_id = u.id
		WHERE pm.project_id = $1
	`
	rows, err := r.db.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []domain.ProjectMemberWithUser
	for rows.Next() {
		var m domain.ProjectMemberWithUser
		var avatar *string
		if err := rows.Scan(&m.ProjectID, &m.UserID, &m.Role, &m.JoinedAt, &m.User.Email, &m.User.FullName, &avatar); err != nil {
			return nil, err
		}
		if avatar != nil {
			m.User.AvatarURL = *avatar
		}
		m.User.ID = m.UserID
		members = append(members, m)
	}
	return members, nil
}
