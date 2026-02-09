package models

type UserConection struct {
	Name string `json:"Name"`
	Room int    `json:"Room"`
}

type AnswerToUser struct {
	Error string `json:"Error,omitempty"`
	Room  int    `json:"Room"`
}
