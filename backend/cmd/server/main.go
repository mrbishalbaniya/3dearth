package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	httpapi "github.com/mrbishalbaniya/3dearth/backend/internal/api/http"
	"github.com/mrbishalbaniya/3dearth/backend/internal/airport"
	"github.com/mrbishalbaniya/3dearth/backend/internal/auth"
	"github.com/mrbishalbaniya/3dearth/backend/internal/config"
	"github.com/mrbishalbaniya/3dearth/backend/internal/flight"
	"github.com/mrbishalbaniya/3dearth/backend/internal/multiplayer"
	"github.com/mrbishalbaniya/3dearth/backend/internal/platform/cache"
	"github.com/mrbishalbaniya/3dearth/backend/internal/platform/database"
	"github.com/mrbishalbaniya/3dearth/backend/internal/platform/logging"
	"github.com/mrbishalbaniya/3dearth/backend/internal/weather"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	log, err := logging.New(cfg.LogLevel, !cfg.IsDev())
	if err != nil {
		panic(err)
	}
	defer log.Sync() //nolint:errcheck

	ctx := context.Background()
	db, err := database.NewPool(ctx, cfg.DatabaseURL, cfg.DBMaxConns, cfg.DBMinConns, log)
	if err != nil {
		log.Fatal("database", zap.Error(err))
	}
	defer db.Close()

	rdb, err := cache.NewRedis(ctx, cfg.RedisURL, log)
	if err != nil {
		log.Fatal("redis", zap.Error(err))
	}
	defer rdb.Close()

	authSvc := auth.NewService(db, cfg.JWTAccessSecret, cfg.JWTRefreshSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)
	airports := airport.NewRepository(db)
	flights := flight.NewService(db)
	wx := weather.NewService(weather.NewSynthetic())
	hub := multiplayer.NewHub(multiplayer.HubConfig{
		InterestRadiusM: cfg.InterestRadiusM,
		MaxConnections:  cfg.MaxWSConnections,
		Heartbeat:       cfg.WSHeartbeatInterval,
		AllowedOrigins:  cfg.WSAllowedOrigins,
	}, log)

	api := httpapi.NewServer(cfg, log, db, rdb, authSvc, airports, flights, wx, hub)

	srv := &http.Server{
		Addr:         cfg.HTTPAddr,
		Handler:      api.Engine(),
		ReadTimeout:  cfg.HTTPReadTimeout,
		WriteTimeout: cfg.HTTPWriteTimeout,
	}

	go func() {
		log.Info("http listening", zap.String("addr", cfg.HTTPAddr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("listen", zap.Error(err))
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Info("shutdown complete")
}
