# COMPOSE_FILE := ./pong-app/docker-compose.yml

# # Default target: builds Docker images and starts the containers
# all : build up

# # Build the containers without cache
# build:
# 	@echo "[$(shell date +%T)] Rebuilding all images (clean slate)..."
# 	docker compose -f $(COMPOSE_FILE) build --no-cache
# 	@echo "[$(shell date +%T)] Images rebuilt successfully"

# # Start the containers in detached mode
# up : 
# 	@echo "[$(shell date +%T)] Starting containers..."
# 	docker compose -f $(COMPOSE_FILE) up -d
# 	@echo "[$(shell date +%T)] Containers running. Use 'make logs' to view output"

# # Stop and remove the containers
# down : 
# 	@echo "[$(shell date +%T)] Stopping and removing containers..."
# 	docker compose -f $(COMPOSE_FILE) down
# 	@echo "[$(shell date +%T)] Environment cleaned"

# # Stop the containers
# stop : 
# 	@echo "[$(shell date +%T)] Stopping containers..."
# 	docker compose -f $(COMPOSE_FILE) stop
# 	@echo "[$(shell date +%T)] Containers stopped (still exist)"

# # Start the containers if they are not running
# start : 
# 	@echo "[$(shell date +%T)] Restarting stopped containers..."
# 	docker compose -f $(COMPOSE_FILE) start
# 	@echo "[$(shell date +%T)] Restarting stopped containers..."

# # Rebuild the containers
# rebuild: down build up

# logs:
# # Show logs for the containers
# 	@echo "Showing logs for pong-app containers..."
# 	@docker compose -f $(COMPOSE_FILE) logs -f --tail=100

# # Stop and remove containers only (no volumes or networks)
# clean:
# 	docker compose -f $(COMPOSE_FILE) stop
# 	docker compose -f $(COMPOSE_FILE) rm -f

# # Fully clean environment: stop, remove containers, networks, volumes, orphans, and unused Docker resources
# fclean:
# 	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
# 	docker system prune -f --volumes

# # Show the status of the containers
# status :
# 	@echo "[$(shell date +%T)] Container status:"
# 	@docker ps

# # Define phony targets to avoid conflicts with files of the same name
# .PHONY: all up down stop start build rebuild logs clean fclean status




# COMPOSE_FILE := ./pong-app/docker-compose.yml

# # Default target: full rebuild and run
# all:  ## Build and start all services
# 	@echo "[$(shell date +%T)] Running full build and startup sequence..."
# 	$(MAKE) build
# 	$(MAKE) up
# 	@echo "[$(shell date +%T)] Application is ready."

# # Start the containers in detached mode
# up:
# 	@echo "[$(shell date +%T)] Starting containers..."
# 	docker compose -f $(COMPOSE_FILE) up -d
# 	@echo "[$(shell date +%T)] Containers are up and running in detached mode."

# # Stop and remove all services and networks
# down:
# 	@echo "[$(shell date +%T)] Stopping and removing containers..."
# 	docker compose -f $(COMPOSE_FILE) down
# 	@echo "[$(shell date +%T)] Containers and networks removed."

# # Stop running containers without removing them
# stop:
# 	@echo "[$(shell date +%T)] Stopping containers..."
# 	docker compose -f $(COMPOSE_FILE) stop
# 	@echo "[$(shell date +%T)] Containers stopped."

# # Start containers that were previously stopped
# start:
# 	@echo "[$(shell date +%T)] Starting previously stopped containers..."
# 	docker compose -f $(COMPOSE_FILE) start
# 	@echo "[$(shell date +%T)] Containers started."

# # Build all services without using cache
# build:
# 	@echo "[$(shell date +%T)] Building images without cache..."
# 	docker compose -f $(COMPOSE_FILE) build --no-cache
# 	@echo "[$(shell date +%T)] Build completed."

# # Rebuild the environment completely
# rebuild: down build up

# # Show currently running containers
# status:
# 	@echo "[$(shell date +%T)] Listing running containers..."
# 	@docker ps

# # Clean: Stop and remove containers only (no volumes)
# clean:
# 	@echo "[$(shell date +%T)] Cleaning containers (stop and remove)..."
# 	docker compose -f $(COMPOSE_FILE) stop
# 	docker compose -f $(COMPOSE_FILE) rm -f
# 	@echo "[$(shell date +%T)] Containers cleaned."

# # Full clean: Remove containers, volumes, and dangling resources
# fclean:
# 	@echo "[$(shell date +%T)] Performing full clean..."
# 	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
# 	docker system prune -f --volumes
# 	@echo "[$(shell date +%T)] Full cleanup completed."

# # Shortcut for rebuild
# re: rebuild

# # Show logs from containers
# logs:
# 	@echo "[$(shell date +%T)] Showing container logs..."
# 	docker compose -f $(COMPOSE_FILE) logs -f --tail=100

# # Exec into a container (update with actual container name)
# exec:
# 	@echo "[$(shell date +%T)] Executing shell inside container..."
# 	docker exec -it pong-app-container-name /bin/sh
# 	@echo "[$(shell date +%T)] Exited container shell."

# # Shell via docker-compose exec (update with service name)
# shell:
# 	@echo "[$(shell date +%T)] Opening shell in service container..."
# 	docker compose -f $(COMPOSE_FILE) exec pong-app-service-name /bin/sh
# 	@echo "[$(shell date +%T)] Exited service shell."

# # Help: auto-document all ##-annotated targets
# help:  ## Show this help message
# 	@echo "Available commands:"
# 	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(lastword $(MAKEFILE_LIST))

# # Declare phony targets to prevent filename conflicts
# .PHONY: all up down stop start build rebuild clean fclean re status logs exec shell help



NAME = ft_transcendence

# ANSI colors
GREEN  = \033[1;32m
BLUE   = \033[1;34m
YELLOW = \033[1;33m
RED    = \033[1;31m
CYAN  := \033[1;96m	
RESET  = \033[0m

COMPOSE_FILE := ./pong-app/docker-compose.yml

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
		@rm -rf frontend/node_modules backend/node_modules

	@echo "[$(shell date +%T)] $(CYAN)[✓] Full cleanup completed.$(RESET)"

logs:  ## Follow logs from all services
	@echo "[$(shell date +%T)] $(BLUE)[+] Tailing container logs (ctrl-C to stop)...$(RESET)"
	docker compose -f $(COMPOSE_FILE) logs -f --tail=100

help:  ## Show this help message
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(lastword $(MAKEFILE_LIST))

.PHONY: all up down stop start build re clean fclean status logs help ngrok-url