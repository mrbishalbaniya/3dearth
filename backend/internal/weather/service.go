package weather

import (
	"context"
	"math"
	"time"

	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
)

// Provider abstracts live METAR/OWM/etc. Synthetic is the default.
type Provider interface {
	Sample(ctx context.Context, lat, lng float64) (*domain.WeatherSample, error)
}

type SyntheticProvider struct{}

func NewSynthetic() *SyntheticProvider { return &SyntheticProvider{} }

func (p *SyntheticProvider) Sample(_ context.Context, lat, lng float64) (*domain.WeatherSample, error) {
	// Deterministic pseudo-weather from lat/lng + hour
	h := float64(time.Now().UTC().Hour())
	seed := math.Sin(lat*0.17+lng*0.11+h*0.3)
	wind := 2 + math.Abs(seed)*16
	from := math.Mod(math.Abs(math.Cos(lat+lng))*360, 360)
	temp := 15 - math.Abs(lat)/6 + seed*5
	return &domain.WeatherSample{
		Lat:         lat,
		Lng:         lng,
		WindFromDeg: from,
		WindSpeedMs: wind,
		TempC:       temp,
		PressureHpa: 1013 + seed*12,
		VisibilityM: 8000 + math.Abs(seed)*7000,
		CloudsOctas: int(math.Abs(seed) * 8),
		Provider:    "synthetic",
		ObservedAt:  time.Now().UTC(),
	}, nil
}

type Service struct {
	provider Provider
}

func NewService(p Provider) *Service {
	if p == nil {
		p = NewSynthetic()
	}
	return &Service{provider: p}
}

func (s *Service) At(ctx context.Context, lat, lng float64) (*domain.WeatherSample, error) {
	return s.provider.Sample(ctx, lat, lng)
}
