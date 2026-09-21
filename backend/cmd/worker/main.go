package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/shree2698/goflow/backend/internal/config"
	"github.com/shree2698/goflow/backend/internal/repository"
	"github.com/shree2698/goflow/backend/internal/worker"
	"github.com/shree2698/goflow/backend/internal/worker/handlers"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	cfg, _ := config.Load()

	// Connect to Database if config is available
	var workflowRepo repository.WorkflowRepository
	if cfg != nil {
		db, err := config.NewPostgresPool(cfg.Database, logger)
		if err == nil {
			defer db.Close()
			workflowRepo = repository.NewWorkflowRepository(db)
		} else {
			logger.Warn().Err(err).Msg("Database connection optional in worker, continuing...")
		}
	}

	// Connect to Redis
	var rdb *redis.Client
	if cfg != nil {
		var err error
		rdb, err = config.NewRedisClient(cfg.Redis, logger)
		if err != nil {
			logger.Fatal().Err(err).Msg("Failed to connect to Redis using config")
		}
	} else {
		redisURL := os.Getenv("REDIS_URL")
		if redisURL == "" {
			redisURL = "redis://localhost:6379/0"
		}
		opts, err := redis.ParseURL(redisURL)
		if err != nil {
			logger.Fatal().Err(err).Msg("Invalid REDIS_URL")
		}
		rdb = redis.NewClient(opts)
		if err := rdb.Ping(context.Background()).Err(); err != nil {
			logger.Fatal().Err(err).Msg("Failed to connect to Redis")
		}
	}
	defer rdb.Close()

	// Initialize Queue
	queue := worker.NewRedisQueue(rdb)

	// Initialize Worker Pool
	concurrency := 10 // Can be loaded from config
	pool := worker.NewWorkerPool(queue, &logger, concurrency)

	// Register Handlers
	workflowHandler := handlers.NewWorkflowHandler(workflowRepo, logger)
	remindersHandler := handlers.NewRemindersHandler(nil, logger)
	if cfg != nil {
		if db, err := config.NewPostgresPool(cfg.Database, logger); err == nil {
			defer db.Close()
			remindersHandler = handlers.NewRemindersHandler(db, logger)
		}
	}

	pool.RegisterHandler(worker.JOB_WORKFLOW_EXECUTE, workflowHandler.Handle)
	pool.RegisterHandler(worker.JOB_SCHEDULED_REMINDERS, remindersHandler.Handle)

	// Start pool
	pool.Start()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info().Msg("Gracefully shutting down worker process...")
	pool.Stop()
	logger.Info().Msg("Worker process exiting")
}
