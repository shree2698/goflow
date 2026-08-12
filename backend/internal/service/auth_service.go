package service

import (
	"context"
	"errors"
	"time"

	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/pkg/crypto"
	"github.com/shree2698/goflow/backend/pkg/jwt"
)

type authService struct {
	userRepo   domain.UserRepository
	jwtService jwt.TokenService
}

func NewAuthService(userRepo domain.UserRepository, jwtService jwt.TokenService) domain.AuthService {
	return &authService{
		userRepo:   userRepo,
		jwtService: jwtService,
	}
}

func (s *authService) Register(ctx context.Context, req *domain.RegisterRequest) (*domain.User, *domain.TokenPair, error) {
	// Check if user exists
	existingUser, err := s.userRepo.GetByEmail(req.Email)
	if err != nil && !errors.Is(err, domain.ErrUserNotFound) {
		return nil, nil, err
	}
	if existingUser != nil {
		return nil, nil, domain.ErrUserAlreadyExists
	}

	// Hash password
	hashedPassword, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, nil, err
	}

	timezone := "UTC"
	if req.Timezone != "" {
		timezone = req.Timezone
	}

	user := &domain.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FullName:     req.FullName,
		Role:         "employee",
		Timezone:     timezone,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, nil, err
	}

	// Generate tokens
	accessToken, refreshToken, err := s.jwtService.GenerateTokenPair(user.ID)
	if err != nil {
		return nil, nil, err
	}

	tokens := &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	return user, tokens, nil
}

func (s *authService) Login(ctx context.Context, req *domain.LoginRequest) (*domain.User, *domain.TokenPair, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, nil, domain.ErrInvalidCredentials
		}
		return nil, nil, err
	}

	if !crypto.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, nil, domain.ErrInvalidCredentials
	}

	accessToken, refreshToken, err := s.jwtService.GenerateTokenPair(user.ID)
	if err != nil {
		return nil, nil, err
	}

	tokens := &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	return user, tokens, nil
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*domain.TokenPair, error) {
	claims, err := s.jwtService.ValidateToken(refreshToken, "refresh")
	if err != nil {
		return nil, domain.ErrInvalidToken
	}

	// Optionally check if user still exists
	_, err = s.userRepo.GetByID(claims.UserID)
	if err != nil {
		return nil, err
	}

	access, refresh, err := s.jwtService.GenerateTokenPair(claims.UserID)
	if err != nil {
		return nil, err
	}

	return &domain.TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
	}, nil
}

func (s *authService) Logout(ctx context.Context, accessToken string) error {
	// In a complete implementation, this might add the token to a blacklist in Redis
	return nil
}
