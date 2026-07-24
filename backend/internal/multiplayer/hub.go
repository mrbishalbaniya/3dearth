package multiplayer

import (
	"encoding/json"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
	"github.com/mrbishalbaniya/3dearth/backend/internal/spatial"
)

type HubConfig struct {
	InterestRadiusM  float64
	MaxConnections   int
	Heartbeat        time.Duration
	AllowedOrigins   []string
}

type Client struct {
	ID       string
	UserID   uuid.UUID
	Callsign string
	Conn     *websocket.Conn
	Send     chan []byte
	Pose     domain.PlayerPose
	LastPing time.Time
}

type Hub struct {
	cfg      HubConfig
	log      *zap.Logger
	mu       sync.RWMutex
	clients  map[string]*Client
	upgrader websocket.Upgrader
	seq      atomic.Uint64
	connCount atomic.Int64
}

func NewHub(cfg HubConfig, log *zap.Logger) *Hub {
	origins := map[string]struct{}{}
	for _, o := range cfg.AllowedOrigins {
		origins[o] = struct{}{}
	}
	h := &Hub{
		cfg:     cfg,
		log:     log,
		clients: make(map[string]*Client),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				if len(origins) == 0 {
					return true
				}
				_, ok := origins[r.Header.Get("Origin")]
				return ok
			},
		},
	}
	go h.heartbeatLoop()
	return h
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request, userID uuid.UUID, callsign string) {
	if int(h.connCount.Load()) >= h.cfg.MaxConnections {
		http.Error(w, "capacity", http.StatusServiceUnavailable)
		return
	}
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.log.Warn("ws upgrade", zap.Error(err))
		return
	}
	c := &Client{
		ID:       uuid.NewString(),
		UserID:   userID,
		Callsign: callsign,
		Conn:     conn,
		Send:     make(chan []byte, 64),
		LastPing: time.Now(),
		Pose: domain.PlayerPose{
			UserID: userID, Callsign: callsign,
		},
	}
	h.mu.Lock()
	h.clients[c.ID] = c
	h.mu.Unlock()
	h.connCount.Add(1)

	go h.writePump(c)
	h.readPump(c)
}

func (h *Hub) readPump(c *Client) {
	defer func() {
		h.remove(c)
		_ = c.Conn.Close()
	}()
	_ = c.Conn.SetReadDeadline(time.Now().Add(h.cfg.Heartbeat * 3))
	c.Conn.SetPongHandler(func(string) error {
		c.LastPing = time.Now()
		_ = c.Conn.SetReadDeadline(time.Now().Add(h.cfg.Heartbeat * 3))
		return nil
	})
	for {
		_, data, err := c.Conn.ReadMessage()
		if err != nil {
			return
		}
		var msg struct {
			Type string             `json:"type"`
			Pose domain.PlayerPose  `json:"pose"`
		}
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}
		switch msg.Type {
		case "pose":
			msg.Pose.UserID = c.UserID
			msg.Pose.Callsign = c.Callsign
			msg.Pose.Seq = h.seq.Add(1)
			c.Pose = msg.Pose
			h.broadcastInterest(c)
		case "ping":
			c.LastPing = time.Now()
			select {
			case c.Send <- []byte(`{"type":"pong"}`):
			default:
			}
		}
	}
}

func (h *Hub) writePump(c *Client) {
	ticker := time.NewTicker(h.cfg.Heartbeat)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			_ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) broadcastInterest(src *Client) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	qt := spatial.NewQuadTree(spatial.Bounds{-90, 90, -180, 180}, 12)
	for _, c := range h.clients {
		_ = qt.Insert(spatial.QTItem{ID: c.ID, Lat: c.Pose.Lat, Lng: c.Pose.Lng, Alt: c.Pose.AltM})
	}
	var near []spatial.QTItem
	qt.QueryRadius(src.Pose.Lat, src.Pose.Lng, h.cfg.InterestRadiusM, &near)

	payload := struct {
		Type     string               `json:"type"`
		Players  []domain.PlayerPose  `json:"players"`
	}{Type: "nearby"}
	for _, it := range near {
		if it.ID == src.ID {
			continue
		}
		if cl, ok := h.clients[it.ID]; ok {
			payload.Players = append(payload.Players, cl.Pose)
		}
	}
	data, _ := json.Marshal(payload)
	select {
	case src.Send <- data:
	default:
		// backpressure: drop
	}
}

func (h *Hub) remove(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c.ID]; ok {
		delete(h.clients, c.ID)
		close(c.Send)
		h.connCount.Add(-1)
	}
	h.mu.Unlock()
}

func (h *Hub) heartbeatLoop() {
	t := time.NewTicker(h.cfg.Heartbeat)
	defer t.Stop()
	for range t.C {
		cutoff := time.Now().Add(-h.cfg.Heartbeat * 4)
		h.mu.RLock()
		var stale []*Client
		for _, c := range h.clients {
			if c.LastPing.Before(cutoff) {
				stale = append(stale, c)
			}
		}
		h.mu.RUnlock()
		for _, c := range stale {
			_ = c.Conn.Close()
			h.remove(c)
		}
	}
}

func (h *Hub) Stats() map[string]any {
	return map[string]any{
		"connections": h.connCount.Load(),
		"capacity":    h.cfg.MaxConnections,
	}
}
