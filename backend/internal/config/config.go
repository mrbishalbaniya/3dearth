package config

import (
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	AppEnv   string `mapstructure:"APP_ENV"`
	AppName  string `mapstructure:"APP_NAME"`
	HTTPAddr string `mapstructure:"HTTP_ADDR"`

	HTTPReadTimeout  time.Duration `mapstructure:"HTTP_READ_TIMEOUT"`
	HTTPWriteTimeout time.Duration `mapstructure:"HTTP_WRITE_TIMEOUT"`
	PublicBaseURL    string        `mapstructure:"PUBLIC_BASE_URL"`

	DatabaseURL string `mapstructure:"DATABASE_URL"`
	DBMaxConns  int32  `mapstructure:"DB_MAX_CONNS"`
	DBMinConns  int32  `mapstructure:"DB_MIN_CONNS"`

	RedisURL string `mapstructure:"REDIS_URL"`

	JWTAccessSecret  string        `mapstructure:"JWT_ACCESS_SECRET"`
	JWTRefreshSecret string        `mapstructure:"JWT_REFRESH_SECRET"`
	JWTAccessTTL     time.Duration `mapstructure:"JWT_ACCESS_TTL"`
	JWTRefreshTTL    time.Duration `mapstructure:"JWT_REFRESH_TTL"`

	WSAllowedOrigins    []string      `mapstructure:"WS_ALLOWED_ORIGINS"`
	InterestRadiusM     float64       `mapstructure:"INTEREST_RADIUS_M"`
	MaxWSConnections    int           `mapstructure:"MAX_WS_CONNECTIONS"`
	WSHeartbeatInterval time.Duration `mapstructure:"WS_HEARTBEAT_INTERVAL"`

	R2Endpoint  string `mapstructure:"R2_ENDPOINT"`
	R2AccessKey string `mapstructure:"R2_ACCESS_KEY"`
	R2SecretKey string `mapstructure:"R2_SECRET_KEY"`
	R2Bucket    string `mapstructure:"R2_BUCKET"`

	OTELEndpoint string `mapstructure:"OTEL_EXPORTER_OTLP_ENDPOINT"`
	MetricsPath  string `mapstructure:"METRICS_PATH"`
	LogLevel     string `mapstructure:"LOG_LEVEL"`
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigFile(".env")
	v.SetConfigType("env")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	_ = v.ReadInConfig() // optional in prod (env vars)

	setDefaults(v)

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	origins := v.GetString("WS_ALLOWED_ORIGINS")
	if origins != "" {
		cfg.WSAllowedOrigins = splitCSV(origins)
	}
	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("APP_NAME", "orbit-earth-backend")
	v.SetDefault("HTTP_ADDR", ":8080")
	v.SetDefault("HTTP_READ_TIMEOUT", "15s")
	v.SetDefault("HTTP_WRITE_TIMEOUT", "30s")
	v.SetDefault("PUBLIC_BASE_URL", "http://localhost:8080")
	v.SetDefault("DATABASE_URL", "postgres://orbit:orbit@localhost:5432/orbit?sslmode=disable")
	v.SetDefault("DB_MAX_CONNS", 50)
	v.SetDefault("DB_MIN_CONNS", 5)
	v.SetDefault("REDIS_URL", "memory")
	v.SetDefault("JWT_ACCESS_SECRET", "dev-access-secret-change-in-production-32")
	v.SetDefault("JWT_REFRESH_SECRET", "dev-refresh-secret-change-in-production-32")
	v.SetDefault("JWT_ACCESS_TTL", "15m")
	v.SetDefault("JWT_REFRESH_TTL", "168h")
	v.SetDefault("WS_ALLOWED_ORIGINS", "http://localhost:3000")
	v.SetDefault("INTEREST_RADIUS_M", 50000)
	v.SetDefault("MAX_WS_CONNECTIONS", 100000)
	v.SetDefault("WS_HEARTBEAT_INTERVAL", "15s")
	v.SetDefault("METRICS_PATH", "/metrics")
	v.SetDefault("LOG_LEVEL", "info")
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (c *Config) IsDev() bool { return c.AppEnv == "development" || c.AppEnv == "dev" }
