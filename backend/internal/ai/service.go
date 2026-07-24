package ai

// Service hosts server-side AI traffic scheduling hooks.
// Browser sim runs local LOD AI; this package is for authoritative
// schedules, conflicts, and cross-region handoff later.
type Service struct{}

func New() *Service { return &Service{} }

type ScheduleRequest struct {
	DepICAO  string
	DestICAO string
	Category string
}

func (s *Service) EnqueueFlight(_ ScheduleRequest) error {
	// Wire to Asynq / world workers
	return nil
}
