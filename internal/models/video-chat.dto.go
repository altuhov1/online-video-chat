package models

type UserConection struct {
	Name string `json:"name"`
	Room int    `json:"room"`
}

type AnswerToUser struct {
	Error string `json:"error,omitempty"`
	Room  int    `json:"room"`
}
