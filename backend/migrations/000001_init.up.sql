-- Migration commands are managed by golang-migrate
-- Example: migrate -path migrations -database "postgres://user:pass@localhost:5432/db?sslmode=disable" up

CREATE TABLE IF NOT EXISTS schema_migrations (
    version bigint NOT NULL PRIMARY KEY,
    dirty boolean NOT NULL
);
