package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
)

func main() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr(redisURL)},
		asynq.Config{Concurrency: 8},
	)
	mux := asynq.NewServeMux()
	mux.HandleFunc("analytics:flush", func(ctx context.Context, t *asynq.Task) error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(5 * time.Millisecond):
			return nil
		}
	})
	mux.HandleFunc("weather:refresh", func(ctx context.Context, t *asynq.Task) error {
		return nil
	})

	go func() {
		log.Println("asynq worker started")
		if err := srv.Run(mux); err != nil {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	srv.Shutdown()
}

func redisAddr(u string) string {
	u = strings.TrimPrefix(u, "redis://")
	if i := strings.IndexByte(u, '/'); i >= 0 {
		u = u[:i]
	}
	return u
}
