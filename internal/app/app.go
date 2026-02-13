package app

import (
	"log/slog"
	"my-crypto/internal/config"
	"my-crypto/internal/web"
	"net/http"
	"time"
)

type AppServices struct {
	server http.Server
	cfg    config.Config
}

func NewApp(conf config.Config) *AppServices {
	webServer, err := web.NewWsServer()
	if err != nil {
		slog.Error("websocket server did not initialize", "error", err)
	}
	mux := http.NewServeMux()
	fs := http.FileServer(http.Dir("static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	mux.HandleFunc("/connect", webServer.ConnetToRoom)
	mux.HandleFunc("/ws", webServer.TcpHandShakeForWs)
	mux.HandleFunc("/", webServer.RootHandler)

	app := &AppServices{
		server: http.Server{
			Addr:    conf.Port,
			Handler: mux,
		},
		cfg: conf,
	}
	return app

}

func (a *AppServices) AppStart() {
	slog.Info("server started", "in time", time.Now())
	err := a.server.ListenAndServe()
	if err != nil {
		slog.Error("websocket server did not start", "error", err)
	}

}
