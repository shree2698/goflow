package logger

import (
	"context"
	"os"
	"time"

	"github.com/rs/zerolog"
)

type contextKey string

const loggerKey contextKey = "logger"

func New(env string) zerolog.Logger {
	zerolog.TimeFieldFormat = time.RFC3339

	var logger zerolog.Logger
	if env == "development" {
		logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}).
			Level(zerolog.DebugLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	} else {
		logger = zerolog.New(os.Stdout).
			Level(zerolog.InfoLevel).
			With().
			Timestamp().
			Caller().
			Logger()
	}

	return logger
}

func WithContext(ctx context.Context, logger zerolog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey, logger)
}

func FromContext(ctx context.Context) *zerolog.Logger {
	if logger, ok := ctx.Value(loggerKey).(zerolog.Logger); ok {
		return &logger
	}
	return nil
}
