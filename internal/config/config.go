package config

import (
	"log/slog"
	"strings"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort string `env:"PORT" envDefault:"8080"`
	LaunchLoc  string `env:"LAUNCH_LOC" envDefault:"prod"`
	LogLevel   string `env:"LOG_LEVEL" envDefault:"info"`
	TgBotToken string `env:"TG_BOT_TOKEN" envDefault:""`
	TgChatIDs  string `env:"TG_CHAT_IDS" envDefault:""`
}

func getLogLevelFromString(levelStr string) slog.Level {
	switch strings.ToLower(levelStr) {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func MustLoad() *Config {

	logger := NewEarlyLogger()

	if err := godotenv.Load(); err != nil {

		logger.Debug("Failed to load .env file", "error", err)
	} else {
		logger.Info("Loaded configuration from .env file")
	}

	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		logger.Error("Failed to parse environment variables", "error", err)
		panic("configuration error: " + err.Error())
	}
	logger.Info("Application started", "mode", cfg.LaunchLoc)

	return &cfg
}

func (c *Config) GetLogLevel() slog.Level {
	return getLogLevelFromString(c.LogLevel)
}
