package web

import "net/http"

type WsChatServer interface {
	ConnetToRoom(w http.ResponseWriter, r *http.Request)
	TcpHandShakeForWs(w http.ResponseWriter, r *http.Request)
	RootHandler(w http.ResponseWriter, r *http.Request)
}
