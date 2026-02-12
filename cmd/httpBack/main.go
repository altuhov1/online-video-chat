package main

import (
	"log/slog"
	"my-crypto/internal/app"
	"my-crypto/internal/config"
	"os"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	slog.SetDefault(logger)
	cong := config.Config{
		Port: ":3000",
	}
	
	videoChat := app.NewApp(cong)
	videoChat.AppStart()

}
