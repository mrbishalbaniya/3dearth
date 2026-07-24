package analytics

import "github.com/google/uuid"

// Service aggregates pilot stats / leaderboards (CQRS read models later).
type Service struct{}

func New() *Service { return &Service{} }

type PilotStats struct {
	UserID      uuid.UUID
	FlightHours float64
	DistanceNm  float64
	Landings    int
}
