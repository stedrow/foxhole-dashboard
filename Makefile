# Foxhole Dashboard Makefile

IMAGE_NAME = foxhole-dashboard
GHCR_IMAGE = ghcr.io/stedrow/foxhole-dashboard
PORT = 3000

.PHONY: help
help:
	@echo "Development:"
	@echo "  make dev          - Build and run development environment"
	@echo "  make dev-logs     - Follow dev logs"
	@echo "  make dev-down     - Stop dev environment"
	@echo ""
	@echo "Production:"
	@echo "  make up           - Run production (pulls image)"
	@echo "  make down         - Stop production"
	@echo "  make logs         - Follow production logs"
	@echo ""
	@echo "Build & Publish:"
	@echo "  make build        - Build local image"
	@echo "  make publish      - Build and push to GHCR (requires login)"
	@echo ""
	@echo "Utilities:"
	@echo "  make shell        - Open shell in container"
	@echo "  make clean        - Remove containers and images"

# Development
.PHONY: dev
dev:
	docker-compose -f docker-compose.dev.yml up -d --build

.PHONY: dev-logs
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

.PHONY: dev-down
dev-down:
	docker-compose -f docker-compose.dev.yml down

# Production
.PHONY: up
up:
	docker-compose up -d

.PHONY: down
down:
	docker-compose down

.PHONY: logs
logs:
	docker-compose logs -f

# Build & Publish
.PHONY: build
build:
	docker build -t $(IMAGE_NAME) .

.PHONY: publish
publish:
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--tag $(GHCR_IMAGE):latest \
		--push \
		.

# Utilities
.PHONY: shell
shell:
	docker exec -it $(IMAGE_NAME) sh

.PHONY: clean
clean:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down
	docker rmi $(IMAGE_NAME) $(GHCR_IMAGE) || true

.DEFAULT_GOAL := help
