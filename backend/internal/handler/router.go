package handler

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/shree2698/goflow/backend/internal/config"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
)

func NewRouter(cfg *config.Config, log zerolog.Logger, db *pgxpool.Pool, redisClient *redis.Client) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(log))
	r.Use(middleware.Recovery)
	r.Use(middleware.CORS(cfg.CORS))

	healthHandler := NewHealthHandler(db, redisClient)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthHandler.HealthCheck)
	})

	return r
}
