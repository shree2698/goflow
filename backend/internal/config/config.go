package config

import (
	"os"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	SMTP     SMTPConfig
	CORS     CORSConfig
	AI       AIConfig
}

type AIConfig struct {
	Provider   string `env:"AI_PROVIDER" envDefault:"local"`
	APIKey     string `env:"AI_API_KEY"`
	Model      string `env:"AI_MODEL" envDefault:"gpt-4o-mini"`
	ServiceURL string `env:"AI_SERVICE_URL"`
	OpenAIKey  string `env:"OPENAI_API_KEY"`
	GeminiKey  string `env:"GEMINI_API_KEY"`
}

type ServerConfig struct {
	Port string `env:"SERVER_PORT" envDefault:"8081"`
	Env  string `env:"SERVER_ENV" envDefault:"development"`
}

type DatabaseConfig struct {
	Host     string `env:"DB_HOST" envDefault:"localhost"`
	Port     string `env:"DB_PORT" envDefault:"5432"`
	User     string `env:"DB_USER" envDefault:"postgres"`
	Password string `env:"DB_PASSWORD" envDefault:"postgres"`
	Name     string `env:"DB_NAME" envDefault:"goflow"`
	SSLMode  string `env:"DB_SSLMODE" envDefault:"disable"`
}

type RedisConfig struct {
	Host     string `env:"REDIS_HOST" envDefault:"localhost"`
	Port     string `env:"REDIS_PORT" envDefault:"6379"`
	Password string `env:"REDIS_PASSWORD"`
	DB       int    `env:"REDIS_DB" envDefault:"0"`
}

type JWTConfig struct {
	Secret     string `env:"JWT_SECRET,required"`
	AccessTTL  string `env:"JWT_ACCESS_TTL" envDefault:"15m"`
	RefreshTTL string `env:"JWT_REFRESH_TTL" envDefault:"7d"`
}

type SMTPConfig struct {
	Host     string `env:"SMTP_HOST"`
	Port     int    `env:"SMTP_PORT"`
	User     string `env:"SMTP_USER"`
	Password string `env:"SMTP_PASSWORD"`
	From     string `env:"SMTP_FROM"`
}

type CORSConfig struct {
	AllowedOrigins []string `env:"CORS_ALLOWED_ORIGINS" envSeparator:"," envDefault:"*"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()        // Load .env in current directory
	_ = godotenv.Load("../.env") // Load .env in root directory if run from backend/

	var cfg Config
	err := env.Parse(&cfg)
	if err != nil {
		return nil, err
	}

	if port := os.Getenv("PORT"); port != "" && os.Getenv("SERVER_PORT") == "" {
		cfg.Server.Port = port
	}
	if envVal := os.Getenv("ENV"); envVal != "" && os.Getenv("SERVER_ENV") == "" {
		cfg.Server.Env = envVal
	}

	return &cfg, nil
}
