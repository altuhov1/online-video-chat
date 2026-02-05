package main

import "net/http"

func TODO(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("hello\n"))
}
func main() {
	mux := http.ServeMux{}
	mux.HandleFunc("/", TODO)
	http.ListenAndServe(":8080", &mux)
}
