package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go.uber.org/zap"

	"github.com/mrbishalbaniya/3dearth/backend/internal/airport"
	"github.com/mrbishalbaniya/3dearth/backend/internal/config"
	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
	"github.com/mrbishalbaniya/3dearth/backend/internal/platform/database"
	"github.com/mrbishalbaniya/3dearth/backend/internal/platform/logging"
)

type seedAirport struct {
	ICAO     string  `json:"icao"`
	IATA     *string `json:"iata"`
	Name     string  `json:"name"`
	City     string  `json:"city"`
	Country  string  `json:"country"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	ElevM    float64 `json:"elevM"`
	Runways  []seedRunway `json:"runways"`
}

type seedRunway struct {
	ID         string  `json:"id"`
	HeadingDeg float64 `json:"headingDeg"`
	LengthM    float64 `json:"lengthM"`
	WidthM     float64 `json:"widthM"`
}

func main() {
	path := flag.String("file", "", "path to airports.json (defaults to ../public/data/airports.json)")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	log, err := logging.New(cfg.LogLevel, false)
	if err != nil {
		panic(err)
	}
	defer log.Sync() //nolint:errcheck

	file := *path
	if file == "" {
		candidates := []string{
			filepath.Join("..", "public", "data", "airports.json"),
			filepath.Join("..", "..", "public", "data", "airports.json"),
			filepath.Join("public", "data", "airports.json"),
		}
		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				file = c
				break
			}
		}
	}
	if file == "" {
		log.Fatal("airports.json not found; pass -file")
	}

	raw, err := os.ReadFile(file)
	if err != nil {
		log.Fatal("read airports", zap.Error(err))
	}
	var list []seedAirport
	if err := json.Unmarshal(raw, &list); err != nil {
		log.Fatal("parse airports", zap.Error(err))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	db, err := database.NewPool(ctx, cfg.DatabaseURL, cfg.DBMaxConns, cfg.DBMinConns, log)
	if err != nil {
		log.Fatal("database", zap.Error(err))
	}
	defer db.Close()

	repo := airport.NewRepository(db)
	nAirports, nRunways := 0, 0
	for _, a := range list {
		iata := ""
		if a.IATA != nil {
			iata = *a.IATA
		}
		if err := repo.Upsert(ctx, domain.Airport{
			ICAO: a.ICAO, IATA: iata, Name: a.Name, City: a.City, Country: a.Country,
			ElevM: a.ElevM, Lat: a.Lat, Lng: a.Lng,
		}); err != nil {
			log.Fatal("upsert airport", zap.String("icao", a.ICAO), zap.Error(err))
		}
		nAirports++
		for _, rw := range a.Runways {
			width := rw.WidthM
			if width <= 0 {
				width = 45
			}
			_, err := db.Exec(ctx, `
				INSERT INTO runways (airport_icao, ident, heading_deg, length_m, width_m)
				VALUES (UPPER($1), $2, $3, $4, $5)
				ON CONFLICT (airport_icao, ident) DO UPDATE SET
				  heading_deg = EXCLUDED.heading_deg,
				  length_m = EXCLUDED.length_m,
				  width_m = EXCLUDED.width_m
			`, a.ICAO, rw.ID, rw.HeadingDeg, rw.LengthM, width)
			if err != nil {
				log.Fatal("upsert runway", zap.String("icao", a.ICAO), zap.Error(err))
			}
			nRunways++
		}
	}
	fmt.Printf("seeded %d airports, %d runways from %s\n", nAirports, nRunways, file)
}
