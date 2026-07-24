# Orbit Earth Backend

Production-oriented Go API for the global 3D Earth flight simulator.

## Stack

- **Go** + **Gin** HTTP
- **PostgreSQL** (airports / flights; lat/lng geospatial queries)
- **Redis** (cache / Asynq)
- **WebSocket** multiplayer hub (interest management + QuadTree)
- **JWT** access + refresh tokens
- **Zap** logging, **Prometheus** metrics, **Viper** config
- Docker + Kubernetes manifests

## Quick start

```bash
cd backend
cp .env.example .env
# Option A — Docker (Postgres + Redis + API)
docker compose -f docker/docker-compose.yml up -d postgres redis
# Option B — local Postgres; Redis can be REDIS_URL=memory in .env
go mod tidy
# apply schema once
psql "$DATABASE_URL" -f migrations/000001_init.sql
go run ./cmd/seed -file ../public/data/airports.json
go run ./cmd/server
```

API: `http://localhost:8080`  
Swagger UI: `http://localhost:8080/docs`  
OpenAPI YAML: `http://localhost:8080/openapi.yaml`

Frontend: set `NEXT_PUBLIC_API_URL=http://localhost:8080` in `.env.local` (Next rewrites `/api/v1/*` to the Go server).


## Key endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | no | Liveness |
| GET | `/readyz` | no | DB + Redis |
| GET | `/metrics` | no | Prometheus |
| POST | `/api/v1/auth/register` | no | Create account |
| POST | `/api/v1/auth/login` | no | Login |
| POST | `/api/v1/auth/refresh` | no | Refresh tokens |
| GET | `/api/v1/airports/search?q=` | no | Search airports |
| GET | `/api/v1/airports/nearest?lat=&lng=` | no | PostGIS nearest |
| GET | `/api/v1/navigation/great-circle?...` | no | Route + ETE |
| GET | `/api/v1/weather?lat=&lng=` | no | Weather sample |
| POST | `/api/v1/flights` | yes | Start flight |
| POST | `/api/v1/flights/:id/positions` | yes | Record pose |
| POST | `/api/v1/flights/:id/complete` | yes | Complete / crash |
| GET | `/ws/v1/multiplayer?token=&callsign=` | token | Realtime poses |

## Architecture

Modular monolith with clean package boundaries (extractable to microservices):

- `internal/auth` — JWT + refresh store
- `internal/airport` — PostGIS repository
- `internal/flight` — flights, plans, positions, stats
- `internal/navigation` — great-circle math
- `internal/weather` — provider interface + synthetic
- `internal/multiplayer` — WS hub, heartbeats, interest radius
- `internal/spatial` — QuadTree + geohash
- `cmd/worker` — Asynq background jobs

## Multiplayer protocol (JSON)

Client → server:

```json
{"type":"pose","pose":{"lat":27.7,"lng":85.3,"altM":1400,"hdgDeg":200,"tasMs":40}}
```

Server → client:

```json
{"type":"nearby","players":[...]}
```

## Security notes

- Change `JWT_*_SECRET` in production
- Restrict `WS_ALLOWED_ORIGINS`
- Prefer TLS termination at ingress
- Rate limit middleware is per-process; use Redis for multi-replica

## Future extraction

Each `internal/*` service can become its own binary + gRPC surface without rewriting domain models.
