.PHONY: tidy run worker seed test docker-up docker-down

tidy:
	go mod tidy

run:
	go run ./cmd/server

worker:
	go run ./cmd/worker

seed:
	go run ./cmd/seed -file ../public/data/airports.json

test:
	go test ./...

docker-up:
	docker compose -f docker/docker-compose.yml up -d --build

docker-down:
	docker compose -f docker/docker-compose.yml down -v
