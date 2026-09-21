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
	"github.com/shree2698/goflow/backend/pkg/eventbus"
	"github.com/shree2698/goflow/backend/pkg/jwt"
)

func NewRouter(cfg *config.Config, log zerolog.Logger, db *pgxpool.Pool, redisClient *redis.Client, wsHub *websocket.Hub, eb eventbus.EventBus) *chi.Mux {

	r := chi.NewRouter()

	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(log))
	r.Use(middleware.Recovery)
	r.Use(middleware.CORS(cfg.CORS))


	healthHandler := NewHealthHandler(db, redisClient)

	// Auth dependencies
	userRepo := repository.NewUserRepository(db)
	jwtService := jwt.NewJWTService(cfg.JWT.Secret, 15*time.Minute, 7*24*time.Hour) // Example durations
	authService := service.NewAuthService(userRepo, jwtService)
	authHandler := NewAuthHandler(authService)

	// User dependencies
	userHandler := NewUserHandler(userRepo)

	// Project & Task dependencies
	projectRepo := repository.NewProjectRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	projectHandler := NewProjectHandler(projectRepo, taskRepo, userRepo, eb)

	// Workflow dependencies
	workflowRepo := repository.NewWorkflowRepository(db)
	workflowService := service.NewWorkflowService(workflowRepo)
	workflowHandler := NewWorkflowHandler(workflowService)

	// Notification dependencies
	notifRepo := repository.NewNotificationRepository(db)
	prefRepo := repository.NewNotificationPreferenceRepository(db)
	notifService := service.NewNotificationService(notifRepo, prefRepo, wsHub)
	notifHandler := NewNotificationHandler(notifService)

	// Analytics dependencies
	analyticsService := service.NewAnalyticsService(db)
	analyticsHandler := NewAnalyticsHandler(analyticsService)

	// Search dependencies
	searchService := service.NewSearchService(db)
	searchHandler := NewSearchHandler(searchService)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthHandler.HealthCheck)

		r.Route("/auth", func(r chi.Router) {
			// Rate limit authentication attempts: max 15 requests per minute per IP
			r.Use(middleware.RateLimit(redisClient, 15, time.Minute))
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

			// Admin Employee Management (Restricted to admin role)
			r.Group(func(admin chi.Router) {
				admin.Use(middleware.RequireRole(userRepo, "admin"))
				admin.Get("/", userHandler.ListUsers)
				admin.Post("/", userHandler.CreateUser)
				admin.Patch("/{id}", userHandler.UpdateUser)
				admin.Delete("/{id}", userHandler.DeleteUser)
			})
		})

		r.Route("/projects", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Get("/", projectHandler.ListProjects)
			r.Post("/", projectHandler.CreateProject)
			r.Get("/{id}", projectHandler.GetProject)
			r.Get("/{id}/tasks", projectHandler.ListTasks)
			r.Post("/{id}/tasks", projectHandler.CreateTask)
			r.Get("/{projectId}/workflows", workflowHandler.ListByProject)
			r.Post("/{projectId}/workflows", workflowHandler.Create)
		})

		r.Route("/analytics", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Use(middleware.RequireRole(userRepo, "admin"))
			r.Get("/summary", analyticsHandler.GetSummary)
			r.Get("/projects", analyticsHandler.GetProjects)
			r.Get("/productivity", analyticsHandler.GetProductivity)
		})

		r.Route("/tasks", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Get("/search", searchHandler.SearchTasks)
			r.Patch("/{id}", projectHandler.UpdateTask)
			r.Delete("/{id}", projectHandler.DeleteTask)
		})

		r.Route("/workflows", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Patch("/{id}/toggle", workflowHandler.ToggleActive)
			r.Get("/{id}/executions", workflowHandler.ListExecutions)
		})

		r.Route("/notifications", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Get("/", notifHandler.GetNotifications)
			r.Patch("/read-all", notifHandler.MarkAllAsRead)
			r.Patch("/{id}/read", notifHandler.MarkAsRead)
		})


		wsHandler := websocket.NewHandler(wsHub, jwtService)
		r.Get("/ws", wsHandler.ServeWS)
	})



	return r
}
