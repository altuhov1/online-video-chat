package config

import (
	"log/slog"
	"os"
)

const levelEarlyLogger string = "info"

func NewEarlyLogger() *slog.Logger {

	level := getLogLevelFromString(levelEarlyLogger)
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
}
