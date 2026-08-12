package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Role         string    `json:"role"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
	Timezone     string    `json:"timezone"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type UserRepository interface {
	Create(user *User) error
	GetByID(id uuid.UUID) (*User, error)
	GetByEmail(email string) (*User, error)
	ListAll() ([]*User, error)
	Update(user *User) error
	Delete(id uuid.UUID) error
}
