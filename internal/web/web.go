package web

import (
	"net/http"

	"github.com/gorilla/websocket"
)

type WsChatServer interface {
	Test(w http.ResponseWriter, r *http.Request)
}
type wsServer struct {
	wsUpgrader *websocket.Upgrader
}

func NewWsServer() (WsChatServer, error) {
	return &wsServer{
		wsUpgrader: &websocket.Upgrader{},
	}, nil
}

func (ws *wsServer) Test(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello Guys"))
}

func (ws *wsServer) TcpHandShakeForWs(w http.ResponseWriter, r *http.Request) {
	con, err := ws.wsUpgrader.Upgrade(w, r, nil)
}
