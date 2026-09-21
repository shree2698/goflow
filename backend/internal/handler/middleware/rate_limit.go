package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimit creates an HTTP middleware that limits the number of requests
// per client IP over a given time window using Redis.
func RateLimit(redisClient *redis.Client, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if redisClient == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Extract client IP address
			ip := r.Header.Get("X-Forwarded-For")
			if ip != "" {
				ip = strings.Split(ip, ",")[0]
			} else if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
				ip = realIP
			} else {
				ip = r.RemoteAddr
				if idx := strings.LastIndex(ip, ":"); idx != -1 {
					ip = ip[:idx]
				}
			}
			ip = strings.TrimSpace(ip)

			key := fmt.Sprintf("rate_limit:%s:%s", r.URL.Path, ip)
			ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
			defer cancel()

			count, err := redisClient.Incr(ctx, key).Result()
			if err == nil {
				if count == 1 {
					redisClient.Expire(ctx, key, window)
				}

				if count > int64(limit) {
					ttl, _ := redisClient.TTL(ctx, key).Result()
					retryAfter := int(ttl.Seconds())
					if retryAfter <= 0 {
						retryAfter = int(window.Seconds())
					}

					w.Header().Set("Content-Type", "application/json")
					w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
					w.WriteHeader(http.StatusTooManyRequests)
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success": false,
						"error": map[string]interface{}{
							"code":        "RATE_LIMIT_EXCEEDED",
							"message":     "Too many requests. Please try again later.",
							"retry_after": retryAfter,
						},
					})
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
