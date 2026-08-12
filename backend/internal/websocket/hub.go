package websocket

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

type EventType string

const (
	EventNotificationReceived EventType = "notification.received"
	EventTaskCreated          EventType = "task.created"
	EventTaskUpdated          EventType = "task.updated"
	EventWorkflowExecuted     EventType = "workflow.executed"
)

type WSEvent struct {
	Type      EventType       `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

type Client struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	Rooms    map[string]bool
	mu       sync.RWMutex
}

type Hub struct {
	clients    map[*Client]bool
	userMap    map[uuid.UUID]map[*Client]bool
	roomMap    map[string]map[*Client]bool
	broadcast  chan *WSEvent
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	logger     zerolog.Logger
}

func NewHub(logger zerolog.Logger) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		userMap:    make(map[uuid.UUID]map[*Client]bool),
		roomMap:    make(map[string]map[*Client]bool),
		broadcast:  make(chan *WSEvent, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		logger:     logger,
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if _, ok := h.userMap[client.UserID]; !ok {
				h.userMap[client.UserID] = make(map[*Client]bool)
			}
			h.userMap[client.UserID][client] = true
			h.mu.Unlock()
			h.logger.Debug().Str("user_id", client.UserID.String()).Msg("WebSocket client registered")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)

				if uClients, ok := h.userMap[client.UserID]; ok {
					delete(uClients, client)
					if len(uClients) == 0 {
						delete(h.userMap, client.UserID)
					}
				}

				client.mu.RLock()
				for room := range client.Rooms {
					if rClients, ok := h.roomMap[room]; ok {
						delete(rClients, client)
						if len(rClients) == 0 {
							delete(h.roomMap, room)
						}
					}
				}
				client.mu.RUnlock()
			}
			h.mu.Unlock()
			h.logger.Debug().Str("user_id", client.UserID.String()).Msg("WebSocket client unregistered")
		}
	}
}

func (h *Hub) SendToUser(userID uuid.UUID, event *WSEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.userMap[userID]; ok {
		for client := range clients {
			select {
			case client.Send <- data:
			default:
				close(client.Send)
				delete(h.clients, client)
			}
		}
	}
}
