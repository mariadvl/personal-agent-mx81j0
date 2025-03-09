# Personal AI Agent Project Makefile

# Global variables
PYTHON_VERSION := 3.11
NODE_VERSION := 18
PNPM_VERSION := 8.6.0
SHELL := /bin/bash
BACKEND_DIR := src/backend
WEB_DIR := src/web
DOCKER_COMPOSE := docker-compose
DOCKER_COMPOSE_PROD := docker-compose -f infrastructure/docker/docker-compose.prod.yml

# Declare phony targets that don't represent files
.PHONY: help setup backend-dev frontend-dev electron-dev docker-dev docker-prod lint format test-backend test-frontend test-e2e test build-backend build-frontend build-electron build-docker build clean db-init db-migrate backup restore docker-clean

# Set default goal to help
.DEFAULT_GOAL := help

# Display help information about available make commands
help:
	@echo "Personal AI Agent - Development Commands"
	@echo "========================================"
	@echo "setup            - Set up the development environment with all dependencies"
	@echo "backend-dev      - Start the backend development server"
	@echo "frontend-dev     - Start the frontend development server"
	@echo "electron-dev     - Start the Electron development environment"
	@echo "docker-dev       - Start the development environment using Docker"
	@echo "docker-prod      - Start the production environment using Docker"
	@echo "lint             - Run linting on all code"
	@echo "format           - Format all code according to project standards"
	@echo "test-backend     - Run backend tests"
	@echo "test-frontend    - Run frontend tests"
	@echo "test-e2e         - Run end-to-end tests"
	@echo "test             - Run all tests"
	@echo "build-backend    - Build the backend package"
	@echo "build-frontend   - Build the frontend application"
	@echo "build-electron   - Build the Electron desktop application"
	@echo "build-docker     - Build Docker images for all services"
	@echo "build            - Build all components"
	@echo "clean            - Clean all build artifacts"
	@echo "db-init          - Initialize the database"
	@echo "db-migrate       - Run database migrations"
	@echo "backup           - Create a backup of all data"
	@echo "restore          - Restore from a backup (usage: make restore BACKUP_FILE=path/to/backup)"
	@echo "docker-clean     - Clean Docker resources"

# Set up the development environment with all dependencies
setup:
	@echo "Setting up development environment..."
	# Install Poetry for Python dependency management
	@curl -sSL https://install.python-poetry.org | python3 -
	@cd $(BACKEND_DIR) && poetry install
	# Install pnpm for frontend dependency management
	@npm install -g pnpm@$(PNPM_VERSION)
	@cd $(WEB_DIR) && pnpm install
	# Initialize configuration directories
	@mkdir -p config/local
	@echo "Setup complete!"

# Start the backend development server
backend-dev:
	@echo "Starting backend development server..."
	@cd $(BACKEND_DIR) && poetry run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start the frontend development server
frontend-dev:
	@echo "Starting frontend development server..."
	@cd $(WEB_DIR) && pnpm dev

# Start the Electron development environment
electron-dev:
	@echo "Starting Electron development environment..."
	@cd $(WEB_DIR) && pnpm electron-dev

# Start the development environment using Docker
docker-dev:
	@echo "Starting development environment with Docker..."
	@$(DOCKER_COMPOSE) up

# Start the production environment using Docker
docker-prod:
	@echo "Starting production environment with Docker..."
	@$(DOCKER_COMPOSE_PROD) up -d

# Run linting on all code
lint:
	@echo "Linting code..."
	@cd $(BACKEND_DIR) && poetry run flake8 . && poetry run black --check . && poetry run isort --check .
	@cd $(WEB_DIR) && pnpm lint

# Format all code according to project standards
format:
	@echo "Formatting code..."
	@cd $(BACKEND_DIR) && poetry run black . && poetry run isort .
	@cd $(WEB_DIR) && pnpm format

# Run backend tests
test-backend:
	@echo "Running backend tests..."
	@cd $(BACKEND_DIR) && poetry run pytest --cov=. --cov-report=term-missing

# Run frontend tests
test-frontend:
	@echo "Running frontend tests..."
	@cd $(WEB_DIR) && pnpm test

# Run end-to-end tests
test-e2e:
	@echo "Running end-to-end tests..."
	@cd $(WEB_DIR) && pnpm test:e2e

# Run all tests
test: test-backend test-frontend test-e2e
	@echo "All tests completed!"

# Build the backend package
build-backend:
	@echo "Building backend package..."
	@cd $(BACKEND_DIR) && poetry build

# Build the frontend application
build-frontend:
	@echo "Building frontend application..."
	@cd $(WEB_DIR) && pnpm build

# Build the Electron desktop application
build-electron:
	@echo "Building Electron desktop application..."
	@cd $(WEB_DIR) && pnpm build:electron

# Build Docker images for all services
build-docker:
	@echo "Building Docker images..."
	@$(DOCKER_COMPOSE) build
	@$(DOCKER_COMPOSE_PROD) build

# Build all components
build: build-backend build-frontend build-electron
	@echo "Build completed!"

# Clean all build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@cd $(BACKEND_DIR) && rm -rf dist build .pytest_cache .coverage htmlcov __pycache__ **/__pycache__
	@cd $(WEB_DIR) && rm -rf .next out dist node_modules/.cache
	@echo "Clean completed!"

# Initialize the database
db-init:
	@echo "Initializing database..."
	@cd $(BACKEND_DIR) && poetry run python -m scripts.db_init

# Run database migrations
db-migrate:
	@echo "Running database migrations..."
	@cd $(BACKEND_DIR) && poetry run python -m scripts.db_migrate

# Create a backup of all data
backup:
	@echo "Creating backup..."
	@cd $(BACKEND_DIR) && poetry run python -m scripts.backup

# Restore from a backup
restore:
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "Error: BACKUP_FILE is required. Usage: make restore BACKUP_FILE=path/to/backup"; \
		exit 1; \
	fi
	@echo "Restoring from backup $(BACKUP_FILE)..."
	@cd $(BACKEND_DIR) && poetry run python -m scripts.restore $(BACKUP_FILE)

# Clean Docker resources
docker-clean:
	@echo "Cleaning Docker resources..."
	@$(DOCKER_COMPOSE) down -v --remove-orphans
	@$(DOCKER_COMPOSE_PROD) down -v --remove-orphans