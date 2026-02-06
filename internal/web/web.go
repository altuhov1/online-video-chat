package web

import "net/http"

type WsChatServer interface {
	Test(w http.ResponseWriter, r *http.Request)
}
type wsServer struct {
}

func NewWsServer() (WsChatServer, error) {
	return &wsServer{}, nil
}

func (h *wsServer) Test(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello Guys"))
}
