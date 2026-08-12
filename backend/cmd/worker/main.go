package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/shree2698/goflow/backend/internal/worker"
	"github.com/shree2698/goflow/backend/internal/worker/handlers"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	// Connect to Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("Invalid REDIS_URL")
	}
	rdb := redis.NewClient(opts)

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		logger.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer rdb.Close()

	// Initialize Queue
	queue := worker.NewRedisQueue(rdb)

	// Initialize Worker Pool
	concurrency := 10 // Can be loaded from config
	pool := worker.NewWorkerPool(queue, &logger, concurrency)

	// Register Handlers
	workflowHandler := handlers.NewWorkflowHandler()
	remindersHandler := handlers.NewRemindersHandler()

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
