package main

import (
	"catch-up/internal/app"
	"catch-up/internal/config"
	"log/slog"
)

func main() {
	cfg := config.MustLoad()
	logger := config.NewLogger(cfg)
	slog.SetDefault(logger)
	app := app.NewApp(cfg)
	app.Run()
}
