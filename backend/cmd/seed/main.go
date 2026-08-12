package main

import (
	"context"
	"fmt"
	"os"

	"github.com/shree2698/goflow/backend/internal/config"
	"github.com/shree2698/goflow/backend/pkg/crypto"
	"github.com/shree2698/goflow/backend/pkg/logger"
)

type EmployeeSeed struct {
	Email    string
	Password string
	FullName string
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Server.Env)
	log.Info().Msg("Starting database seed for employees...")

	db, err := config.NewPostgresPool(cfg.Database, log)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	ctx := context.Background()

	// Ensure users table exists
	createUsersTableSQL := `
		CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255) NOT NULL,
			avatar_url VARCHAR(255),
			timezone VARCHAR(50) DEFAULT 'UTC',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	`
	if _, err := db.Exec(ctx, createUsersTableSQL); err != nil {
		log.Fatal().Err(err).Msg("Failed to ensure users table exists")
	}

	employees := []EmployeeSeed{
		{
			Email:    "admin@goflow.com",
			Password: "Password123!",
			FullName: "System Administrator",
		},
		{
			Email:    "employee1@goflow.com",
			Password: "Password123!",
			FullName: "Alice Smith",
		},
		{
			Email:    "employee2@goflow.com",
			Password: "Password123!",
			FullName: "Bob Jones",
		},
	}

	for _, emp := range employees {
		hash, err := crypto.HashPassword(emp.Password)
		if err != nil {
			log.Error().Err(err).Str("email", emp.Email).Msg("Failed to hash password")
			continue
		}

		query := `
			INSERT INTO users (email, password_hash, full_name, timezone)
			VALUES ($1, $2, $3, 'UTC')
			ON CONFLICT (email) DO UPDATE 
			SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name;
		`

		_, err = db.Exec(ctx, query, emp.Email, hash, emp.FullName)
		if err != nil {
			log.Error().Err(err).Str("email", emp.Email).Msg("Failed to seed employee user")
		} else {
			log.Info().Str("email", emp.Email).Msg("Successfully seeded employee user")
		}
	}

	fmt.Println("\n==========================================")
	fmt.Println("Employee Seeding Completed Successfully!")
	fmt.Println("Credentials for testing login:")
	fmt.Println("------------------------------------------")
	fmt.Println("Email:    admin@goflow.com")
	fmt.Println("Password: Password123!")
	fmt.Println("------------------------------------------")
	fmt.Println("Email:    employee1@goflow.com")
	fmt.Println("Password: Password123!")
	fmt.Println("------------------------------------------")
	fmt.Println("Email:    employee2@goflow.com")
	fmt.Println("Password: Password123!")
	fmt.Println("==========================================\n")
}
