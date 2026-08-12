package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/pkg/logger"
	"github.com/shree2698/goflow/backend/pkg/response"
)

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log := logger.FromContext(r.Context())
				if log != nil {
					log.Error().
						Interface("error", err).
						Bytes("stack", debug.Stack()).
						Msg("Panic recovered")
				}
				
				appErr := domain.NewInternal("Internal server error")
				response.Error(w, appErr)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
