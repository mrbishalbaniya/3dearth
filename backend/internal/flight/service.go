package flight

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
	"github.com/mrbishalbaniya/3dearth/backend/internal/navigation"
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service { return &Service{db: db} }

type StartInput struct {
	AircraftID string `json:"aircraftId" validate:"required"`
	DepICAO    string `json:"depIcao" validate:"required,len=4"`
	DestICAO   string `json:"destIcao"`
	AltnICAO   string `json:"altnIcao"`
}

func (s *Service) Start(ctx context.Context, userID uuid.UUID, in StartInput) (*domain.Flight, error) {
	var id uuid.UUID
	now := time.Now().UTC()
	err := s.db.QueryRow(ctx, `
		INSERT INTO flights (user_id, aircraft_id, dep_icao, dest_icao, altn_icao, status, started_at)
		VALUES ($1, $2, UPPER($3), NULLIF(UPPER($4),''), NULLIF(UPPER($5),''), 'active', $6)
		RETURNING id
	`, userID, in.AircraftID, in.DepICAO, in.DestICAO, in.AltnICAO, now).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &domain.Flight{
		ID: id, UserID: userID, AircraftID: in.AircraftID,
		DepICAO: in.DepICAO, DestICAO: in.DestICAO, AltnICAO: in.AltnICAO,
		Status: domain.FlightActive, StartedAt: &now, CreatedAt: now,
	}, nil
}

type PositionInput struct {
	Lat    float64 `json:"lat" validate:"required"`
	Lng    float64 `json:"lng" validate:"required"`
	AltM   float64 `json:"altM"`
	HdgDeg float64 `json:"hdgDeg"`
	TasMs  float64 `json:"tasMs"`
	VsMs   float64 `json:"vsMs"`
}

func (s *Service) RecordPosition(ctx context.Context, userID, flightID uuid.UUID, in PositionInput) error {
	tag, err := s.db.Exec(ctx, `
		INSERT INTO flight_positions (flight_id, lat, lng, alt_m, hdg_deg, tas_ms, vs_ms)
		SELECT $1, $2, $3, $4, $5, $6, $7
		FROM flights WHERE id = $1 AND user_id = $8 AND status = 'active'
	`, flightID, in.Lat, in.Lng, in.AltM, in.HdgDeg, in.TasMs, in.VsMs, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("flight not active")
	}
	_, _ = s.db.Exec(ctx, `
		UPDATE flights SET max_alt_m = GREATEST(max_alt_m, $2),
		  distance_nm = distance_nm + ($3 * 1.94384 / 3600.0)
		WHERE id = $1
	`, flightID, in.AltM, in.TasMs)
	return nil
}

type CompleteInput struct {
	FuelUsedKg float64  `json:"fuelUsedKg"`
	LandingFpm *float64 `json:"landingFpm"`
	Crashed    bool     `json:"crashed"`
}

func (s *Service) Complete(ctx context.Context, userID, flightID uuid.UUID, in CompleteInput) error {
	status := domain.FlightCompleted
	if in.Crashed {
		status = domain.FlightCrashed
	}
	tag, err := s.db.Exec(ctx, `
		UPDATE flights SET status = $3, ended_at = now(), fuel_used_kg = $4, landing_fpm = $5
		WHERE id = $1 AND user_id = $2 AND status = 'active'
	`, flightID, userID, status, in.FuelUsedKg, in.LandingFpm)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("flight not active")
	}
	// Update pilot stats
	_, _ = s.db.Exec(ctx, `
		UPDATE pilot_profiles pp SET
		  flight_hours = flight_hours + EXTRACT(EPOCH FROM (f.ended_at - f.started_at))/3600.0,
		  total_distance_nm = total_distance_nm + f.distance_nm,
		  landings = landings + CASE WHEN $3 THEN 0 ELSE 1 END,
		  updated_at = now()
		FROM flights f
		WHERE pp.user_id = $1 AND f.id = $2
	`, userID, flightID, in.Crashed)
	return nil
}

func (s *Service) Get(ctx context.Context, userID, flightID uuid.UUID) (*domain.Flight, error) {
	var f domain.Flight
	err := s.db.QueryRow(ctx, `
		SELECT id, user_id, aircraft_id, COALESCE(dep_icao,''), COALESCE(dest_icao,''), COALESCE(altn_icao,''),
		       status, started_at, ended_at, max_alt_m, distance_nm, fuel_used_kg, landing_fpm, created_at
		FROM flights WHERE id = $1 AND user_id = $2
	`, flightID, userID).Scan(
		&f.ID, &f.UserID, &f.AircraftID, &f.DepICAO, &f.DestICAO, &f.AltnICAO,
		&f.Status, &f.StartedAt, &f.EndedAt, &f.MaxAltM, &f.DistanceNm, &f.FuelUsedKg, &f.LandingFpm, &f.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &f, nil
}

type PlanInput struct {
	DepICAO    string  `json:"depIcao" validate:"required,len=4"`
	DestICAO   string  `json:"destIcao" validate:"required,len=4"`
	AltnICAO   string  `json:"altnIcao"`
	CruiseAltM float64 `json:"cruiseAltM"`
	CruiseMs   float64 `json:"cruiseMs"`
	BurnKgH    float64 `json:"burnKgPerHour"`
}

func (s *Service) CreatePlan(ctx context.Context, userID uuid.UUID, dep, dest domain.GeoPoint, in PlanInput) (*domain.FlightPlan, error) {
	if in.CruiseMs <= 0 {
		in.CruiseMs = 120
	}
	if in.CruiseAltM <= 0 {
		in.CruiseAltM = 3000
	}
	route := navigation.GreatCircle(dep, dest, 24, in.CruiseMs)
	fuel := navigation.FuelEstimateKg(route.DistanceNm, in.BurnKgH, 40)
	wpJSON, _ := json.Marshal(route.Waypoints)
	var id uuid.UUID
	err := s.db.QueryRow(ctx, `
		INSERT INTO flight_plans (user_id, dep_icao, dest_icao, altn_icao, cruise_alt_m, waypoints, distance_nm, ete_sec, fuel_req_kg)
		VALUES ($1, UPPER($2), UPPER($3), NULLIF(UPPER($4),''), $5, $6::jsonb, $7, $8, $9)
		RETURNING id
	`, userID, in.DepICAO, in.DestICAO, in.AltnICAO, in.CruiseAltM, string(wpJSON), route.DistanceNm, route.ETESec, fuel).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &domain.FlightPlan{
		ID: id, UserID: userID, DepICAO: in.DepICAO, DestICAO: in.DestICAO, AltnICAO: in.AltnICAO,
		CruiseAltM: in.CruiseAltM, Waypoints: route.Waypoints, DistanceNm: route.DistanceNm,
		ETESec: route.ETESec, FuelReqKg: &fuel,
	}, nil
}
