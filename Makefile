NAME = ft_transcendence

# ANSI colors
GREEN  = \033[1;32m
BLUE   = \033[1;34m
YELLOW = \033[1;33m
RED    = \033[1;31m
CYAN  := \033[1;96m	
RESET  = \033[0m

COMPOSE_FILE := ./docker-compose.yml

all: help 

up:  ## Start the containers in detached mode
	@echo "[$(shell date +%T)] $(YELLOW)[+] Starting containers in background...$(RESET)"
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "[$(shell date +%T)] $(CYAN)[✓] Containers are up and running.$(RESET)"
	@echo "[$(shell date +%T)] $(YELLOW)[+] Waiting for ngrok tunnel to be ready...$(RESET)"
	@timeout=30; while [ $$timeout -gt 0 ]; do \
		if curl -s http://localhost:4040/api/tunnels >/dev/null 2>&1; then \
			break; \
		fi; \
		sleep 1; \
		timeout=$$((timeout-1)); \
	done
	@sleep 3 >/dev/null 2>&1
	@if curl -s http://localhost:4040/api/tunnels >/dev/null 2>&1; then \
		URL=$$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -n1 | cut -d'"' -f4); \
		if [ -n "$$URL" ]; then \
			echo "[$(shell date +%T)] $(GREEN)[✓] ngrok tunnel URL: $$URL$(RESET)"; \
		else \
			echo "[$(shell date +%T)] $(RED)[!] Could not extract tunnel URL$(RESET)"; \
		fi; \
	else \
		echo "[$(shell date +%T)] $(RED)[!] ngrok API not accessible at http://localhost:4040$(RESET)"; \
	fi

run: build up  ## Build and start containers
	@echo "[$(shell date +%T)] $(GREEN)[✓] Application is ready. Use 'make logs' to view output.$(RESET)"

down:  ## Stop and remove containers, networks
	@echo "[$(shell date +%T)] $(RED)[x] Stopping and removing containers...$(RESET)"
	docker compose -f $(COMPOSE_FILE) down
	@echo "[$(shell date +%T)]  $(CYAN)[✓] Environment torn down.$(RESET)"

stop:  ## Stop containers without removing them
	@echo "[$(shell date +%T)] $(RED)[x] Stopping containers...$(RESET)"
	docker compose -f $(COMPOSE_FILE) stop
	@echo "[$(shell date +%T)] $(CYAN)[✓] Containers stopped.$(RESET)"

start:  ## Start previously stopped containers
	@echo "[$(shell date +%T)] $(YELLOW)[+] Starting previously stopped containers...$(RESET)"
	docker compose -f $(COMPOSE_FILE) start
	@echo "[$(shell date +%T)] $(CYAN)[✓] Containers started.$(RESET)"

build:  ## Build images without using cache
	@echo "[$(shell date +%T)] $(YELLOW)[+] Building images (no cache)...$(RESET)"
	docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "[$(shell date +%T)] $(CYAN)[✓] Build complete.$(RESET)"

re: fclean run  ## Fully clean and restart containers from fresh build
	@echo "[$(shell date +%T)] $(CYAN)[!] Full rebuild from clean environment initiated...$(RESET)"

status:  ## Show running containers
	@echo "[$(shell date +%T)] $(GREEN)[+] Displaying running containers...$(RESET)"
	@docker ps

clean:  ## Stop and remove containers (keep volumes)
	@echo "[$(shell date +%T)] $(RED)[x] Cleaning containers...$(RESET)"
	docker compose -f $(COMPOSE_FILE) stop
	docker compose -f $(COMPOSE_FILE) rm -f
	@echo "[$(shell date +%T)] $(CYAN)[✓] Containers cleaned.$(RESET)"

fclean:  ## Full clean: remove containers, volumes, orphans
	@echo "[$(shell date +%T)] $(RED)[x] Performing full cleanup...$(RESET)"
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f --volumes
		@if [ -d "./frontend/node_modules" ]; then \
		echo "[$(shell date +%T)] $(RED)[x] Removing frontend/node_modules...$(RESET)"; \
		rm -rf ./frontend/node_modules; \
	fi
	@if [ -d "./backend/node_modules" ]; then \
		echo "[$(shell date +%T)] $(RED)[x] Removing backend/node_modules...$(RESET)"; \
		rm -rf ./backend/node_modules; \
	fi
	@echo "[$(shell date +%T)] $(CYAN)[✓] Full cleanup completed.$(RESET)"

logs:  ## Follow logs from all services
	@echo "[$(shell date +%T)] $(BLUE)[+] Tailing container logs (ctrl-C to stop)...$(RESET)"
	docker compose -f $(COMPOSE_FILE) logs -f --tail=100

help:  ## Show this help message
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(lastword $(MAKEFILE_LIST))

.PHONY: all up down stop start build re clean fclean status logs help ngrok-url
