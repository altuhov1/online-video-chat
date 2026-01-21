package api

type Handler struct {
}

func NewHandler() (*Handler, error) {
	return &Handler{}, nil
}
