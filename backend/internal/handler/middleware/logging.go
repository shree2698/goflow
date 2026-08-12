package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/shree2698/goflow/backend/pkg/logger"
)

func Logging(log zerolog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			
			// Attach logger to request context
			reqID := GetRequestID(r.Context())
			reqLogger := log.With().Str("request_id", reqID).Logger()
			ctx := logger.WithContext(r.Context(), reqLogger)

			next.ServeHTTP(ww, r.WithContext(ctx))

			reqLogger.Info().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", ww.Status()).
				Dur("duration", time.Since(start)).
				Msg("Request processed")
		})
	}
}
