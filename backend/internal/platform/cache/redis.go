package cache

import (
	"context"
	"fmt"
	"strings"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// NewRedis connects to Redis. Use redisURL "memory" (or empty) for an
// in-process miniredis — useful on Windows without Docker.
func NewRedis(ctx context.Context, redisURL string, log *zap.Logger) (*redis.Client, error) {
	url := strings.TrimSpace(redisURL)
	if url == "" || strings.EqualFold(url, "memory") || strings.EqualFold(url, "memory://") {
		mr, err := miniredis.Run()
		if err != nil {
			return nil, fmt.Errorf("start miniredis: %w", err)
		}
		client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
		if err := client.Ping(ctx).Err(); err != nil {
			mr.Close()
			return nil, fmt.Errorf("ping miniredis: %w", err)
		}
		log.Info("redis connected (in-memory miniredis)", zap.String("addr", mr.Addr()))
		return client, nil
	}

	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	client := redis.NewClient(opt)
	if err := client.Ping(ctx).Err(); err != nil {
		log.Warn("redis unreachable, falling back to in-memory", zap.Error(err))
		return NewRedis(ctx, "memory", log)
	}
	log.Info("redis connected")
	return client, nil
}
