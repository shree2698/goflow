package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type HealthHandler struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func NewHealthHandler(db *pgxpool.Pool, redisClient *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redisClient,
	}
}

func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	dbStatus := "ok"
	if h.db != nil {
		if err := h.db.Ping(ctx); err != nil {
			dbStatus = "error"
		}
	} else {
		dbStatus = "not configured"
	}

	redisStatus := "ok"
	if h.redis != nil {
		if err := h.redis.Ping(ctx).Err(); err != nil {
			redisStatus = "error"
		}
	} else {
		redisStatus = "not configured"
	}

	data := map[string]interface{}{
		"status":   "healthy",
		"database": dbStatus,
		"redis":    redisStatus,
		"version":  "1.0.0",
		"uptime":   time.Since(startTime).String(),
	}

	response.JSON(w, http.StatusOK, data, nil)
}

var startTime = time.Now()
