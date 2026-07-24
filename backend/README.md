# Orbit Earth — Go Backend

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/openapi.yaml](docs/openapi.yaml).

```bash
cp .env.example .env
# Local Postgres (no Docker/Redis required — REDIS_URL=memory)
# Schema: psql ... -f migrations/000001_init.sql
go mod tidy
go run ./cmd/seed -file ../public/data/airports.json
go run ./cmd/server
```

Or with Docker: `docker compose -f docker/docker-compose.yml up -d`

Swagger UI: http://localhost:8080/docs
