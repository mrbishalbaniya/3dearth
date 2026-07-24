-- Orbit Earth — initial schema (portable; no PostGIS required)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash   TEXT,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    role            TEXT NOT NULL DEFAULT 'pilot' CHECK (role IN ('pilot','admin','moderator')),
    oauth_provider  TEXT,
    oauth_subject   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ,
    UNIQUE (oauth_provider, oauth_subject)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  TEXT,
    ip          INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pilot_profiles (
    user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    callsign          TEXT UNIQUE,
    home_airport_icao CHAR(4),
    flight_hours      DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_distance_nm DOUBLE PRECISION NOT NULL DEFAULT 0,
    landings          INT NOT NULL DEFAULT 0,
    preferences       JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airports (
    icao        CHAR(4) PRIMARY KEY,
    iata        CHAR(3),
    name        TEXT NOT NULL,
    city        TEXT,
    country     TEXT,
    elev_m      DOUBLE PRECISION NOT NULL DEFAULT 0,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS airports_iata_idx ON airports (iata);
CREATE INDEX IF NOT EXISTS airports_lat_lng_idx ON airports (lat, lng);

CREATE TABLE IF NOT EXISTS runways (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_icao CHAR(4) NOT NULL REFERENCES airports(icao) ON DELETE CASCADE,
    ident        TEXT NOT NULL,
    heading_deg  DOUBLE PRECISION NOT NULL,
    length_m     DOUBLE PRECISION NOT NULL,
    width_m      DOUBLE PRECISION NOT NULL DEFAULT 45,
    surface      TEXT,
    UNIQUE (airport_icao, ident)
);

CREATE TABLE IF NOT EXISTS aircraft_defs (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    class            TEXT NOT NULL,
    mass_kg          DOUBLE PRECISION NOT NULL,
    wing_area_m2     DOUBLE PRECISION NOT NULL,
    max_thrust_n     DOUBLE PRECISION NOT NULL,
    fuel_capacity_kg DOUBLE PRECISION NOT NULL,
    cruise_speed_ms  DOUBLE PRECISION NOT NULL,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO aircraft_defs (id, name, class, mass_kg, wing_area_m2, max_thrust_n, fuel_capacity_kg, cruise_speed_ms)
VALUES
 ('cirrus_sr22', 'SkyTrainer SR', 'sep', 1400, 13.5, 4200, 140, 72),
 ('baron_b58', 'TwinStar B', 'tep', 2400, 17.5, 7800, 280, 95),
 ('citation_cj', 'Horizon CJ', 'business_jet', 5600, 22, 22000, 1200, 180)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS flights (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aircraft_id  TEXT NOT NULL REFERENCES aircraft_defs(id),
    dep_icao     CHAR(4) REFERENCES airports(icao),
    dest_icao    CHAR(4) REFERENCES airports(icao),
    altn_icao    CHAR(4) REFERENCES airports(icao),
    status       TEXT NOT NULL DEFAULT 'planned'
                 CHECK (status IN ('planned','active','completed','crashed','aborted')),
    started_at   TIMESTAMPTZ,
    ended_at     TIMESTAMPTZ,
    max_alt_m    DOUBLE PRECISION NOT NULL DEFAULT 0,
    distance_nm  DOUBLE PRECISION NOT NULL DEFAULT 0,
    fuel_used_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    landing_fpm  DOUBLE PRECISION,
    route        JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flights_user_idx ON flights (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS flight_positions (
    id          BIGSERIAL PRIMARY KEY,
    flight_id   UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    alt_m       DOUBLE PRECISION NOT NULL,
    hdg_deg     DOUBLE PRECISION NOT NULL,
    tas_ms      DOUBLE PRECISION NOT NULL,
    vs_ms       DOUBLE PRECISION NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS flight_positions_flight_time_idx ON flight_positions (flight_id, recorded_at);

CREATE TABLE IF NOT EXISTS flight_plans (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dep_icao     CHAR(4) NOT NULL REFERENCES airports(icao),
    dest_icao    CHAR(4) NOT NULL REFERENCES airports(icao),
    altn_icao    CHAR(4) REFERENCES airports(icao),
    cruise_alt_m DOUBLE PRECISION NOT NULL DEFAULT 3000,
    waypoints    JSONB NOT NULL DEFAULT '[]'::jsonb,
    distance_nm  DOUBLE PRECISION NOT NULL DEFAULT 0,
    ete_sec      INT,
    fuel_req_kg  DOUBLE PRECISION,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions_mp (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callsign     TEXT NOT NULL,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lat          DOUBLE PRECISION,
    lng          DOUBLE PRECISION,
    alt_m        DOUBLE PRECISION,
    hdg_deg      DOUBLE PRECISION,
    room         TEXT NOT NULL DEFAULT 'global'
);

CREATE TABLE IF NOT EXISTS achievements (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id),
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS weather_samples (
    id            BIGSERIAL PRIMARY KEY,
    lat           DOUBLE PRECISION NOT NULL,
    lng           DOUBLE PRECISION NOT NULL,
    observed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    wind_from_deg DOUBLE PRECISION,
    wind_speed_ms DOUBLE PRECISION,
    temp_c        DOUBLE PRECISION,
    pressure_hpa  DOUBLE PRECISION,
    visibility_m  DOUBLE PRECISION,
    clouds_octas  INT,
    provider      TEXT NOT NULL DEFAULT 'synthetic',
    raw           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    actor_id   UUID,
    action     TEXT NOT NULL,
    resource   TEXT,
    meta       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed sample airports (VNKT, EGLL, KJFK)
INSERT INTO airports (icao, iata, name, city, country, elev_m, lat, lng) VALUES
 ('VNKT', 'KTM', 'Tribhuvan Intl', 'Kathmandu', 'Nepal', 1338, 27.6966, 85.3591),
 ('EGLL', 'LHR', 'London Heathrow', 'London', 'United Kingdom', 25, 51.4700, -0.4619),
 ('KJFK', 'JFK', 'John F Kennedy Intl', 'New York', 'United States', 4, 40.6413, -73.7789)
ON CONFLICT DO NOTHING;

INSERT INTO runways (airport_icao, ident, heading_deg, length_m, width_m) VALUES
 ('VNKT', '02/20', 20, 3050, 45),
 ('EGLL', '27L/09R', 270, 3902, 50),
 ('KJFK', '04L/22R', 40, 3682, 60)
ON CONFLICT DO NOTHING;
