package websocket

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/internal/handler/middleware"
	"github.com/shree2698/goflow/backend/pkg/jwt"
	"github.com/shree2698/goflow/backend/pkg/response"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev
	},
}

type Handler struct {
	hub        *Hub
	jwtService jwt.TokenService
}

func NewHandler(hub *Hub, jwtService jwt.TokenService) *Handler {
	return &Handler{
		hub:        hub,
		jwtService: jwtService,
	}
}

func (h *Handler) ServeWS(w http.ResponseWriter, r *http.Request) {
	var userID uuid.UUID

	// 1. Try from context if middleware already authenticated
	if uid, ok := r.Context().Value(middleware.UserIDKey).(uuid.UUID); ok {
		userID = uid
	} else {
		// 2. Try query parameter ?token=...
		token := r.URL.Query().Get("token")
		if token == "" {
			// 3. Try Authorization header Bearer ...
			authHeader := r.Header.Get("Authorization")
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
			}
		}

		if token == "" {
			response.Error(w, domain.NewUnauthorized("Authentication token required"))
			return
		}

		claims, err := h.jwtService.ValidateToken(token, "access")
		if err != nil {
			response.Error(w, domain.NewUnauthorized("Invalid or expired token"))
			return
		}
		userID = claims.UserID
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		ID:     uuid.New(),
		UserID: userID,
		Hub:    h.hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		Rooms:  make(map[string]bool),
	}

	h.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
