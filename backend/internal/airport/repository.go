package airport

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetByICAO(ctx context.Context, icao string) (*domain.Airport, error) {
	var a domain.Airport
	err := r.db.QueryRow(ctx, `
		SELECT icao, COALESCE(iata,''), name, COALESCE(city,''), COALESCE(country,''), elev_m, lat, lng
		FROM airports WHERE icao = UPPER($1)
	`, icao).Scan(&a.ICAO, &a.IATA, &a.Name, &a.City, &a.Country, &a.ElevM, &a.Lat, &a.Lng)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *Repository) Search(ctx context.Context, q string, limit int) ([]domain.Airport, error) {
	if limit <= 0 || limit > 100 {
		limit = 40
	}
	rows, err := r.db.Query(ctx, `
		SELECT icao, COALESCE(iata,''), name, COALESCE(city,''), COALESCE(country,''), elev_m, lat, lng
		FROM airports
		WHERE $1 = '' OR icao ILIKE $1 || '%' OR iata ILIKE $1 || '%'
		   OR name ILIKE '%' || $1 || '%' OR city ILIKE '%' || $1 || '%'
		ORDER BY icao
		LIMIT $2
	`, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Airport
	for rows.Next() {
		var a domain.Airport
		if err := rows.Scan(&a.ICAO, &a.IATA, &a.Name, &a.City, &a.Country, &a.ElevM, &a.Lat, &a.Lng); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *Repository) Nearest(ctx context.Context, lat, lng float64, limit int) ([]domain.Airport, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	// Haversine approximation in SQL (works without PostGIS).
	rows, err := r.db.Query(ctx, `
		SELECT icao, COALESCE(iata,''), name, COALESCE(city,''), COALESCE(country,''), elev_m, lat, lng
		FROM airports
		ORDER BY (
			6371000 * acos(LEAST(1.0, GREATEST(-1.0,
				cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
				+ sin(radians($1)) * sin(radians(lat))
			)))
		) ASC
		LIMIT $3
	`, lat, lng, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Airport
	for rows.Next() {
		var a domain.Airport
		if err := rows.Scan(&a.ICAO, &a.IATA, &a.Name, &a.City, &a.Country, &a.ElevM, &a.Lat, &a.Lng); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *Repository) Upsert(ctx context.Context, a domain.Airport) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO airports (icao, iata, name, city, country, elev_m, lat, lng)
		VALUES (UPPER($1), NULLIF($2,''), $3, $4, $5, $6, $7, $8)
		ON CONFLICT (icao) DO UPDATE SET
		  iata = EXCLUDED.iata, name = EXCLUDED.name, city = EXCLUDED.city,
		  country = EXCLUDED.country, elev_m = EXCLUDED.elev_m, lat = EXCLUDED.lat, lng = EXCLUDED.lng
	`, a.ICAO, a.IATA, a.Name, a.City, a.Country, a.ElevM, a.Lat, a.Lng)
	return err
}

func (r *Repository) ListRunways(ctx context.Context, icao string) ([]domain.Runway, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, airport_icao, ident, heading_deg, length_m, width_m
		FROM runways WHERE airport_icao = UPPER($1) ORDER BY ident
	`, icao)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Runway
	for rows.Next() {
		var rw domain.Runway
		if err := rows.Scan(&rw.ID, &rw.AirportICAO, &rw.Ident, &rw.HeadingDeg, &rw.LengthM, &rw.WidthM); err != nil {
			return nil, err
		}
		out = append(out, rw)
	}
	return out, rows.Err()
}
