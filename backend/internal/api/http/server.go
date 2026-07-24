package httpapi

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/mrbishalbaniya/3dearth/backend/docs"
	"github.com/mrbishalbaniya/3dearth/backend/internal/airport"
	"github.com/mrbishalbaniya/3dearth/backend/internal/auth"
	"github.com/mrbishalbaniya/3dearth/backend/internal/config"
	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
	"github.com/mrbishalbaniya/3dearth/backend/internal/flight"
	"github.com/mrbishalbaniya/3dearth/backend/internal/multiplayer"
	"github.com/mrbishalbaniya/3dearth/backend/internal/navigation"
	mw "github.com/mrbishalbaniya/3dearth/backend/internal/api/http/middleware"
	"github.com/mrbishalbaniya/3dearth/backend/internal/weather"
)

type Server struct {
	cfg      *config.Config
	log      *zap.Logger
	db       *pgxpool.Pool
	rdb      *redis.Client
	auth     *auth.Service
	airports *airport.Repository
	flights  *flight.Service
	weather  *weather.Service
	hub      *multiplayer.Hub
	validate *validator.Validate
	engine   *gin.Engine
}

func NewServer(
	cfg *config.Config,
	log *zap.Logger,
	db *pgxpool.Pool,
	rdb *redis.Client,
	authSvc *auth.Service,
	airports *airport.Repository,
	flights *flight.Service,
	wx *weather.Service,
	hub *multiplayer.Hub,
) *Server {
	gin.SetMode(gin.ReleaseMode)
	if cfg.IsDev() {
		gin.SetMode(gin.DebugMode)
	}
	s := &Server{
		cfg: cfg, log: log, db: db, rdb: rdb, auth: authSvc,
		airports: airports, flights: flights, weather: wx, hub: hub,
		validate: validator.New(),
		engine:   gin.New(),
	}
	s.routes()
	return s
}

func (s *Server) Engine() *gin.Engine { return s.engine }

func (s *Server) routes() {
	r := s.engine
	r.Use(gin.Recovery(), mw.RequestID(), mw.Metrics(), mw.CORS(s.cfg.WSAllowedOrigins), mw.RateLimit(300))

	r.GET("/healthz", s.health)
	r.GET("/readyz", s.ready)
	r.GET(s.cfg.MetricsPath, gin.WrapH(promhttp.Handler()))
	docs.Mount(r)

	v1 := r.Group("/api/v1")
	{
		authG := v1.Group("/auth")
		authG.POST("/register", s.register)
		authG.POST("/login", s.login)
		authG.POST("/refresh", s.refresh)

		v1.GET("/airports/search", s.searchAirports)
		v1.GET("/airports/nearest", s.nearestAirports)
		v1.GET("/airports/:icao", s.getAirport)
		v1.GET("/airports/:icao/runways", s.listRunways)
		v1.GET("/navigation/great-circle", s.greatCircle)
		v1.GET("/weather", s.getWeather)

		sec := v1.Group("")
		sec.Use(mw.JWTAuth(s.auth))
		sec.GET("/me", s.me)
		sec.POST("/flights", s.startFlight)
		sec.POST("/flights/:id/positions", s.recordPosition)
		sec.POST("/flights/:id/complete", s.completeFlight)
		sec.GET("/flights/:id", s.getFlight)
		sec.POST("/flight-plans", s.createPlan)
		sec.GET("/multiplayer/stats", s.mpStats)
	}

	r.GET("/ws/v1/multiplayer", s.wsMultiplayer)
}

func (s *Server) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": s.cfg.AppName})
}

func (s *Server) ready(c *gin.Context) {
	if err := s.db.Ping(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db_down"})
		return
	}
	if err := s.rdb.Ping(c.Request.Context()).Err(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "redis_down"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

func (s *Server) register(c *gin.Context) {
	var in auth.RegisterInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := s.validate.Struct(in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	u, tokens, err := s.auth.Register(c.Request.Context(), in)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": u, "tokens": tokens})
}

func (s *Server) login(c *gin.Context) {
	var in auth.LoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ip := c.ClientIP()
	u, tokens, err := s.auth.Login(c.Request.Context(), in, c.Request.UserAgent(), &ip)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": u, "tokens": tokens})
}

func (s *Server) refresh(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tokens, err := s.auth.Refresh(c.Request.Context(), body.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh"})
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (s *Server) me(c *gin.Context) {
	uid := c.MustGet("user_id").(uuid.UUID)
	c.JSON(http.StatusOK, gin.H{"userId": uid, "role": c.MustGet("role")})
}

func (s *Server) searchAirports(c *gin.Context) {
	list, err := s.airports.Search(c.Request.Context(), c.Query("q"), 40)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"airports": list})
}

func (s *Server) nearestAirports(c *gin.Context) {
	lat, _ := strconv.ParseFloat(c.Query("lat"), 64)
	lng, _ := strconv.ParseFloat(c.Query("lng"), 64)
	list, err := s.airports.Nearest(c.Request.Context(), lat, lng, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"airports": list})
}

func (s *Server) getAirport(c *gin.Context) {
	a, err := s.airports.GetByICAO(c.Request.Context(), c.Param("icao"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if a == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, a)
}

func (s *Server) listRunways(c *gin.Context) {
	list, err := s.airports.ListRunways(c.Request.Context(), c.Param("icao"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"runways": list})
}

func (s *Server) greatCircle(c *gin.Context) {
	fromLat, _ := strconv.ParseFloat(c.Query("fromLat"), 64)
	fromLng, _ := strconv.ParseFloat(c.Query("fromLng"), 64)
	toLat, _ := strconv.ParseFloat(c.Query("toLat"), 64)
	toLng, _ := strconv.ParseFloat(c.Query("toLng"), 64)
	spd, _ := strconv.ParseFloat(c.DefaultQuery("cruiseMs", "120"), 64)
	res := navigation.GreatCircle(
		domain.GeoPoint{Lat: fromLat, Lng: fromLng},
		domain.GeoPoint{Lat: toLat, Lng: toLng},
		24, spd,
	)
	c.JSON(http.StatusOK, res)
}

func (s *Server) getWeather(c *gin.Context) {
	lat, _ := strconv.ParseFloat(c.Query("lat"), 64)
	lng, _ := strconv.ParseFloat(c.Query("lng"), 64)
	w, err := s.weather.At(c.Request.Context(), lat, lng)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

func (s *Server) startFlight(c *gin.Context) {
	uid := c.MustGet("user_id").(uuid.UUID)
	var in flight.StartInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	f, err := s.flights.Start(c.Request.Context(), uid, in)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, f)
}

func (s *Server) recordPosition(c *gin.Context) {
	uid := c.MustGet("user_id").(uuid.UUID)
	fid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad flight id"})
		return
	}
	var in flight.PositionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := s.flights.RecordPosition(c.Request.Context(), uid, fid, in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *Server) completeFlight(c *gin.Context) {
	uid := c.MustGet("user_id").(uuid.UUID)
	fid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad flight id"})
		return
	}
	var in flight.CompleteInput
	_ = c.ShouldBindJSON(&in)
	if err := s.flights.Complete(c.Request.Context(), uid, fid, in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *Server) getFlight(c *gin.Context) {
	uid := c.MustGet("user_id").(uuid.UUID)
	fid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad flight id"})
		return
	}
	f, err := s.flights.Get(c.Request.Context(), uid, fid)
	if err != nil || f == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, f)
}

func (s *Server) createPlan(c *gin.Context) {
	uid := c.MustGet("user_id").(uuid.UUID)
	var in flight.PlanInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	dep, err := s.airports.GetByICAO(c.Request.Context(), in.DepICAO)
	dest, err2 := s.airports.GetByICAO(c.Request.Context(), in.DestICAO)
	if err != nil || err2 != nil || dep == nil || dest == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown airports"})
		return
	}
	plan, err := s.flights.CreatePlan(c.Request.Context(), uid,
		domain.GeoPoint{Lat: dep.Lat, Lng: dep.Lng},
		domain.GeoPoint{Lat: dest.Lat, Lng: dest.Lng}, in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, plan)
}

func (s *Server) mpStats(c *gin.Context) {
	c.JSON(http.StatusOK, s.hub.Stats())
}

func (s *Server) wsMultiplayer(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}
	claims, err := s.auth.ParseAccess(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	callsign := c.DefaultQuery("callsign", "PILOT")
	s.hub.ServeWS(c.Writer, c.Request, claims.UserID, callsign)
}
