package web

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/rand"
	"my-crypto/internal/models"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Errors
const (
	ErrorMaxPeopleInRoom string = "Error max number of people in the room"
)

const (
	maxRoomNunber int = 100_000_000
)

type wsServer struct {
	wsUpgrader  *websocket.Upgrader
	mu          sync.Mutex
	baseOfRooms map[int]*room
}

type room struct {
	creator             string
	guest               string
	connetcionToCreator *websocket.Conn
	connetcionToGuest   *websocket.Conn
}

func NewWsServer() (WsChatServer, error) {
	return &wsServer{
		wsUpgrader:  &websocket.Upgrader{},
		mu:          sync.Mutex{},
		baseOfRooms: make(map[int]*room),
	}, nil
}

func randomRoomNumber() int {
	randNum := rand.Intn(maxRoomNunber)
	if randNum == 0 {
		randNum++
	}
	return randNum
}
func (s *wsServer) RootHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/index.html")
}
func (s *wsServer) ConnetToRoom(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	defer r.Body.Close()
	info, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("We have problen in ConnetInRoom", "err", err)
		return
	}
	UserInfo := new(models.UserConection)
	json.Unmarshal(info, UserInfo)
	if UserInfo.Room == 0 {
		UserInfo.Room = randomRoomNumber()
	}
	if UserInfo.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if val, ok := s.baseOfRooms[UserInfo.Room]; ok && val.guest != "" {
		mes, err := json.Marshal(models.AnswerToUser{
			Error: ErrorMaxPeopleInRoom,
			Room:  -1,
		})
		if err != nil {
			slog.Error("we have problem in Marshal in func ConnetToRoom.")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write(mes)
		return
	}
	mes, err := json.Marshal(models.AnswerToUser{
		Room: UserInfo.Room,
	})
	if err != nil {
		slog.Error("we have problem in Marshal in func ConnetToRoom.")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(mes)
	s.mu.Lock()
	if val, ok := s.baseOfRooms[UserInfo.Room]; !ok {
		s.baseOfRooms[UserInfo.Room] = &room{
			creator:             UserInfo.Name,
			guest:               "",
			connetcionToCreator: nil,
			connetcionToGuest:   nil,
		}
		go roomWork(s.baseOfRooms[UserInfo.Room])
	} else {
		val.guest = UserInfo.Name
		s.baseOfRooms[UserInfo.Room] = val
	}
	s.mu.Unlock()
	fmt.Println(UserInfo.Room)
}
func roomWork(r *room) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		fmt.Println(r)
		if r.connetcionToCreator != nil && r.connetcionToGuest != nil {

			go connectionProcessing(r.connetcionToCreator, r.connetcionToGuest)
			go connectionProcessing(r.connetcionToGuest, r.connetcionToCreator)
			break
		}

	}
}

func connectionProcessing(from, to *websocket.Conn) {
	fmt.Println("Тест")
	err := to.WriteMessage(websocket.BinaryMessage, []byte("ready"))
	if err != nil {
		slog.Info("we lose the connect")
		return
	}
	fmt.Println("Все заработало")
	for {
		typeMes, mes, err := from.ReadMessage()
		if err != nil {
			slog.Info("we lose the connect")
			break
		}

		err = to.WriteMessage(typeMes, mes)
		if err != nil {
			slog.Info("we lose the connect")
			break
		}

	}

}

func (s *wsServer) TcpHandShakeForWs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	roomNumStr := r.URL.Query().Get("room")
	user := r.URL.Query().Get("user")
	roomNumInt, err := strconv.Atoi(roomNumStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if _, ok := s.baseOfRooms[roomNumInt]; !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	con, err := s.wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Warn("we have a failure in the tcp handshake when connecting ws")
		return
	}
	s.mu.Lock()
	room := s.baseOfRooms[roomNumInt]
	if user == room.creator {
		room.connetcionToCreator = con
	} else {
		room.connetcionToGuest = con
	}
	s.baseOfRooms[roomNumInt] = room
	fmt.Println("Тут все сработало")
	s.mu.Unlock()
}
