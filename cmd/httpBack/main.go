package main

<<<<<<< HEAD
import "net/http"

func TODO(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("hello\n"))
}
func main() {
	mux := http.ServeMux{}
	mux.HandleFunc("/", TODO)
	http.ListenAndServe(":8080", &mux)
=======
import "my-crypto/internal/app"

func main() {
	appObj := app.NewApp()
	appObj.AppStart()
>>>>>>> bc8429560cb868b25befd3d34bda293c4316c501
}
