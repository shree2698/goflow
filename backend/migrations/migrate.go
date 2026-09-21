package migrations

import (
	"context"
	"embed"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
)

//go:embed *.up.sql
var MigrationFiles embed.FS

// Run executes all *.up.sql migrations in ascending alphanumeric order.
func Run(ctx context.Context, db *pgxpool.Pool, log zerolog.Logger) error {
	entries, err := MigrationFiles.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read embedded migrations directory: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)

	for _, file := range files {
		content, err := MigrationFiles.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", file, err)
		}

		log.Info().Str("file", file).Msg("Applying database migration...")
		if _, err := db.Exec(ctx, string(content)); err != nil {
			return fmt.Errorf("failed executing migration %s: %w", file, err)
		}
	}

	log.Info().Int("count", len(files)).Msg("All database migrations applied successfully")
	return nil
}
