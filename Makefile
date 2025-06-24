all : up

up : 
	docker-compose -f ./pong-app/docker-compose.yml up -d

down : 
	docker-compose -f ./pong-app/docker-compose.yml down

stop : 
	docker-compose -f ./pong-app/docker-compose.yml stop

start : 
	docker-compose -f ./pong-app/docker-compose.yml start

build:
	docker-compose -f ./pong-app/docker-compose.yml build 

rebuild: down build up

status : 
	@docker ps
