package api

import "net/http"

type Handler struct {
}

func NewHandler() (*Handler, error) {
	return &Handler{}, nil
}

func (h *Handler) TODO(w http.ResponseWriter, r http.Request) {
	
}
