package domain

import (
	"time"

	"github.com/google/uuid"
)

type ProjectStatus string

const (
	ProjectStatusActive   ProjectStatus = "active"
	ProjectStatusArchived ProjectStatus = "archived"
	ProjectStatusOnHold   ProjectStatus = "on_hold"
	ProjectStatusCompleted ProjectStatus = "completed"
)

type ProjectRole string

const (
	ProjectRoleOwner  ProjectRole = "OWNER"
	ProjectRoleAdmin  ProjectRole = "ADMIN"
	ProjectRoleMember ProjectRole = "MEMBER"
	ProjectRoleViewer ProjectRole = "VIEWER"
)

type Project struct {
	ID          uuid.UUID     `json:"id" db:"id"`
	Name        string        `json:"name" db:"name"`
	Description string        `json:"description" db:"description"`
	Color       string        `json:"color" db:"color"`
	Status      ProjectStatus `json:"status" db:"status"`
	OwnerID     uuid.UUID     `json:"owner_id" db:"owner_id"`
	CreatedAt   time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time    `json:"deleted_at,omitempty" db:"deleted_at"`
}

type ProjectMember struct {
	ProjectID uuid.UUID   `json:"project_id" db:"project_id"`
	UserID    uuid.UUID   `json:"user_id" db:"user_id"`
	Role      ProjectRole `json:"role" db:"role"`
	JoinedAt  time.Time   `json:"joined_at" db:"joined_at"`
}

type ProjectMemberWithUser struct {
	ProjectMember
	User User `json:"user" db:"-"`
}

type CreateProjectInput struct {
	Name        string `json:"name" validate:"required,min=1,max=255"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

type UpdateProjectInput struct {
	Name        *string        `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description *string        `json:"description,omitempty"`
	Color       *string        `json:"color,omitempty"`
	Status      *ProjectStatus `json:"status,omitempty"`
}

type AddMemberInput struct {
	UserID uuid.UUID   `json:"user_id" validate:"required"`
	Role   ProjectRole `json:"role" validate:"required"`
}

type UpdateMemberRoleInput struct {
	Role ProjectRole `json:"role" validate:"required"`
}
