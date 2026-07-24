package domain

import (
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RolePilot     Role = "pilot"
	RoleAdmin     Role = "admin"
	RoleModerator Role = "moderator"
)

type User struct {
	ID           uuid.UUID
	Email        string
	EmailVerified bool
	PasswordHash string
	DisplayName  string
	AvatarURL    string
	Role         Role
	CreatedAt    time.Time
	UpdatedAt    time.Time
	LastLoginAt  *time.Time
}

type PilotProfile struct {
	UserID          uuid.UUID
	Callsign        string
	HomeAirportICAO string
	FlightHours     float64
	TotalDistanceNm float64
	Landings        int
}

type Airport struct {
	ICAO    string  `json:"icao"`
	IATA    string  `json:"iata"`
	Name    string  `json:"name"`
	City    string  `json:"city"`
	Country string  `json:"country"`
	ElevM   float64 `json:"elevM"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
}

type Runway struct {
	ID          uuid.UUID `json:"id"`
	AirportICAO string    `json:"airportIcao"`
	Ident       string    `json:"ident"`
	HeadingDeg  float64   `json:"headingDeg"`
	LengthM     float64   `json:"lengthM"`
	WidthM      float64   `json:"widthM"`
}

type FlightStatus string

const (
	FlightPlanned   FlightStatus = "planned"
	FlightActive    FlightStatus = "active"
	FlightCompleted FlightStatus = "completed"
	FlightCrashed   FlightStatus = "crashed"
	FlightAborted   FlightStatus = "aborted"
)

type Flight struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	AircraftID  string
	DepICAO     string
	DestICAO    string
	AltnICAO    string
	Status      FlightStatus
	StartedAt   *time.Time
	EndedAt     *time.Time
	MaxAltM     float64
	DistanceNm  float64
	FuelUsedKg  float64
	LandingFpm  *float64
	CreatedAt   time.Time
}

type GeoPoint struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type FlightPosition struct {
	FlightID uuid.UUID
	Lat      float64
	Lng      float64
	AltM     float64
	HdgDeg   float64
	TasMs    float64
	VsMs     float64
	At       time.Time
}

type FlightPlan struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	DepICAO     string
	DestICAO    string
	AltnICAO    string
	CruiseAltM  float64
	Waypoints   []GeoPoint
	DistanceNm  float64
	ETESec      *int
	FuelReqKg   *float64
}

type WeatherSample struct {
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	WindFromDeg float64   `json:"windFromDeg"`
	WindSpeedMs float64   `json:"windSpeedMs"`
	TempC       float64   `json:"tempC"`
	PressureHpa float64   `json:"pressureHpa"`
	VisibilityM float64   `json:"visibilityM"`
	CloudsOctas int       `json:"cloudsOctas"`
	Provider    string    `json:"provider"`
	ObservedAt  time.Time `json:"observedAt"`
}

type PlayerPose struct {
	UserID   uuid.UUID `json:"userId"`
	Callsign string    `json:"callsign"`
	Lat      float64   `json:"lat"`
	Lng      float64   `json:"lng"`
	AltM     float64   `json:"altM"`
	HdgDeg   float64   `json:"hdgDeg"`
	TasMs    float64   `json:"tasMs"`
	Seq      uint64    `json:"seq"`
}
