package main

import (
	"log/slog"
	"my-crypto/internal/app"
	"my-crypto/internal/config"
)

func main() {
	cfg := config.MustLoad()
	logger := config.NewLogger(cfg)
	slog.SetDefault(logger)
	app := app.NewApp(cfg)
	app.Run()
}
