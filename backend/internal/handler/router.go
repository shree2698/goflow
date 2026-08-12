package handler

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/shree2698/goflow/backend/internal/config"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
	"github.com/shree2698/goflow/backend/internal/repository"
	"github.com/shree2698/goflow/backend/internal/service"
	"github.com/shree2698/goflow/backend/internal/websocket"
	"github.com/shree2698/goflow/backend/pkg/jwt"
)

func NewRouter(cfg *config.Config, log zerolog.Logger, db *pgxpool.Pool, redisClient *redis.Client, wsHub *websocket.Hub) *chi.Mux {

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(log))
	r.Use(middleware.Recovery)
	r.Use(middleware.CORS(cfg.CORS))

	healthHandler := NewHealthHandler(db, redisClient)

	// Auth dependencies
	userRepo := repository.NewUserRepository(db)
	jwtService := jwt.NewJWTService(cfg.Server.JWTSecret, 15*time.Minute, 7*24*time.Hour) // Example durations
	authService := service.NewAuthService(userRepo, jwtService)
	authHandler := NewAuthHandler(authService)

	// User dependencies
	userHandler := NewUserHandler(userRepo)

	// Notification dependencies
	notifRepo := repository.NewNotificationRepository(db)
	prefRepo := repository.NewNotificationPreferenceRepository(db)
	notifService := service.NewNotificationService(notifRepo, prefRepo)
	notifHandler := NewNotificationHandler(notifService)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthHandler.HealthCheck)

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
		})

		r.Route("/users", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Get("/me", userHandler.GetMe)
			r.Patch("/me", userHandler.UpdateMe)
			r.Get("/me/notification-preferences", notifHandler.GetPreferences)
			r.Patch("/me/notification-preferences", notifHandler.UpdatePreferences)
		})

		r.Route("/notifications", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Get("/", notifHandler.GetNotifications)
			r.Patch("/read-all", notifHandler.MarkAllAsRead)
			r.Patch("/{id}/read", notifHandler.MarkAsRead)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			wsHandler := websocket.NewHandler(wsHub)
			r.Get("/ws", wsHandler.ServeWS)
		})
	})



	return r
}
