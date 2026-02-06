package api

import "net/http"

type wsServer struct {
}

func NewHandler() (*wsServer, error) {
	return &wsServer{}, nil
}

func (h *wsServer) Test(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello Guys"))
}
