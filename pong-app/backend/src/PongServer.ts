import { Server } from "socket.io";
import { pongRooms, pongTournaments, getLobbyState, getTournamentLobbyState } from "./gameData.js";
import { validatePlayerNames } from "./KeyClashGame";

export function setupPongNamespace(io: Server) {
    const pongNamespace = io.of("/pong");
    const lobbyNamespace = io.of("/lobby");
	const tournamentLobbyNamespace = io.of("/tournament_lobby");

    pongNamespace.on("connection", (socket) => {
        console.log("Client joined game:", socket.id);

        socket.on("join_game_room", (roomId, callback) => {
			const gameRoom = pongRooms.find(g => g.getId() === roomId)
			if (!gameRoom){
				return callback({error: "Can't find the game room!" });
			}
			if (gameRoom.state.status !== "waiting") {
				return callback({ error: "The game is full!" });
			}
            let playerSide: "left" | "right" | null = "left";  
            socket.data.roomId = roomId;
            socket.join(roomId);
            socket.emit('get_names');
            socket.on('names', (names) => {
                const p_num = validatePlayerNames(names, gameRoom.state.type, gameRoom.state.mode);
                if (p_num > 0)
                    return callback({ error: `Invalid name for player${p_num}`});
                if (gameRoom.state.players.length === 1 && gameRoom.state.players[0].name === names.player1)
                    return callback({ error: `The name "${names.player1}" is already taken`});

                if (gameRoom.state.players.length === 1 && gameRoom.state.players[0].side === "left")
                    playerSide = "right"                  

                gameRoom.setPlayer(playerSide, names.player1, socket.id);

                if (gameRoom.state.mode === "local"){
                    gameRoom.setPlayer("right", names.player2, "p2");
                    playerSide = null;
                    gameRoom.state.timerDisplay = "Press SPACE to Start"
                }
                socket.emit('playerSide', playerSide);
                console.log('players: ', gameRoom.state.players);

                if (gameRoom.state.players.length === 2) {
                    const p1 = gameRoom.state.players.find(p => p.side === "left");
                    const p2 = gameRoom.state.players.find(p => p.side === "right");
                    if (!p1 || !p2) return; // add some error msg?
                    gameRoom.state.matches.push( {player1: p1, player2: p2, winner: null });
                    gameRoom.updateScore();
                    gameRoom.state.status = "starting";
                }
                pongNamespace.to(roomId).emit('stateUpdate', gameRoom.state);
                lobbyNamespace.emit("lobby_update", getLobbyState());                            
            });

            socket.on("move", (side, positionZ) => {
                if (side === "left")
                    gameRoom.state.leftPaddle.z = positionZ;
                else if (side === "right")
                    gameRoom.state.rightPaddle.z = positionZ;
            });
            socket.on("pause", () => {
                togglePause();
            })

            socket.on("setReady", () => {
                if (gameRoom.state.status === "in-progress" || gameRoom.state.players.length < 2) return;
                if (gameRoom.state.mode === "local")
                    return startGame();
                if (gameRoom.state.status !== "starting")
                    return;
                if (playerSide === "left") { gameRoom.state.player1ready = true; }
                else if (playerSide === "right") { gameRoom.state.player2ready = true; }
                else return;
                pongNamespace.to(roomId).emit("stateUpdate", gameRoom.state);
                if (gameRoom.state.players.length === 2 && 
                    gameRoom.state.player1ready && gameRoom.state.player2ready) {
                    startGame();
                }
            });

            socket.on("restart", () => { 
                startGame();
            });

            function startGame() {
                if (!gameRoom) return;
                gameRoom.state.status = "in-progress";
            	lobbyNamespace.emit("lobby_update", getLobbyState());
                if (!gameRoom.state.loop) {
                    // Broadcast game state at 60fps
                    gameRoom.resetGame();
                    pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state, "start");
                    gameRoom.state.player1ready = false;
                    gameRoom.state.player2ready = false;                           
                    gameRoom.state.loop = setInterval(() => {
                        gameRoom.update();
                        pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state);
                        if (gameRoom.state.status === "finished") {
                            clearInterval(gameRoom.state.loop);
                            gameRoom.state.loop = undefined;
							lobbyNamespace.emit("lobby_update", getLobbyState());
                        }
                    }, 1000 / 60);
                }
            };

            function togglePause() {
                if (gameRoom?.state.loop) {
                    gameRoom.state.whenPaused = performance.now();
                    clearInterval(gameRoom.state.loop);
                    gameRoom.state.loop = undefined;
                    gameRoom.state.status = "paused";
                    gameRoom.state.scoreDisplay = "PAUSED (press Esc to resume)"
                    pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state);
					lobbyNamespace.emit("lobby_update", getLobbyState());
                }
                else if (gameRoom?.state.players.length === 2 && gameRoom.state.status === "paused"){
                    gameRoom.state.status = "in-progress";
                    gameRoom.updateScore();
					lobbyNamespace.emit("lobby_update", getLobbyState());       
                    gameRoom.state.gameEndTime += (performance.now() - gameRoom.state.whenPaused);
                    gameRoom.state.loop = setInterval(() => {
                        gameRoom.update();
                        pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state);
                        if (gameRoom.state.status === "finished") {
                            clearInterval(gameRoom.state.loop);
                            gameRoom.state.loop = undefined;
							lobbyNamespace.emit("lobby_update", getLobbyState());
                        }
                    }, 1000 / 60);       
                }
            }; 

        });

        socket.on("join_tournament_room", (roomId, callback) => {
			const gameRoom = pongTournaments.find(g => g.getId() === roomId)
			if (!gameRoom){
				return callback({error: "Can't find the tournament!" });
			}
			if (gameRoom.state.status !== "waiting") {
				return callback({ error: "The tournament is full!" });
			}
            socket.data.roomId = roomId;
            socket.join(roomId);        
            socket.emit('get_names');
            socket.on('names', (names) => {
                const p_num = validatePlayerNames(names, gameRoom.state.type, gameRoom.state.mode);
                if (p_num > 0)
                    return callback({ error: `Invalid name for player${p_num}`});
                if (gameRoom.state.players.length >= 1 && gameRoom.state.players[0].name === names.player1)
                    return callback({ error: `The name "${names.player1}" is already taken`});
                if (gameRoom.state.players.length >= 2 && gameRoom.state.players[1].name === names.player1)
                    return callback({ error: `The name "${names.player1}" is already taken`});
                if (gameRoom.state.players.length === 3 && gameRoom.state.players[2].name === names.player1)
                    return callback({ error: `The name "${names.player1}" is already taken`});
                gameRoom.setPlayer(null, names.player1, socket.id);
                if (gameRoom.state.mode === "local"){
                    gameRoom.setPlayer(null, names.player2, "p2");
                    gameRoom.setPlayer(null, names.player3, "p3");
                    gameRoom.setPlayer(null, names.player4, "p4");
                    gameRoom.state.timerDisplay = "Press SPACE to start the tournament!"
                }
                console.log('players: ', gameRoom.state.players);
            
                if (gameRoom.state.players.length < 4)
                    gameRoom.state.scoreDisplay = `Waiting for opponents... (${gameRoom.state.players.length}/4)`;
                pongNamespace.to(roomId).emit('stateUpdate', gameRoom.state);
                tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());
                const player = gameRoom.state.players.find(p => p.id === socket.id);
    
                if (gameRoom.state.players.length === 4) {
                    gameRoom.state.status = "starting";
                    tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());
                    gameRoom.matchmake();
                    pongNamespace.to(roomId).emit('refreshPlayerSides', gameRoom.state.players);
                    gameRoom.updateScore();
                    pongNamespace.to(roomId).emit('stateUpdate', gameRoom.state);           
                }
                socket.on("setReady", () => {
                    if (gameRoom.state.status !== "starting" || gameRoom.state.players.length < 4) return;
                    if (gameRoom.state.mode === "local")
                        return startGame();
                    if (player?.side === "left") { gameRoom.state.player1ready = true; }
                    else if (player?.side === "right") { gameRoom.state.player2ready = true; }
                    else return;
                    pongNamespace.to(roomId).emit("stateUpdate", gameRoom.state);
                    if (gameRoom.state.players.length === 4 && 
                        gameRoom.state.player1ready && gameRoom.state.player2ready) {
                        startGame();
                    }
                });
            });

            socket.on("move", (side, positionZ) => {
                if (side === "left")
                    gameRoom.state.leftPaddle.z = positionZ;
                else if (side === "right")
                    gameRoom.state.rightPaddle.z = positionZ;
            });

            // Broadcast game state at 60fps
            function startGame() {
                if (!gameRoom) return;
                if (!gameRoom.state.loop) {
                    gameRoom.state.status = "in-progress";
                    gameRoom.resetGame();
                    pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state, "start");
                    gameRoom.state.player1ready = false;
                    gameRoom.state.player2ready = false;              
                    gameRoom.state.loop = setInterval(() => {
                        gameRoom.update();
                        pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state);
                        if (gameRoom.state.status === "finished") {
                            clearInterval(gameRoom.state.loop);
                            gameRoom.state.loop = undefined;
							gameRoom.state.round++;
                            gameRoom.matchmake();
                            pongNamespace.to(roomId).emit('refreshPlayerSides', gameRoom.state.players);
							if (gameRoom.state.round <= 3) {
                                gameRoom.state.status = "starting";
                                pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state);
                            }
							tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());
                        }
                    }, 1000 / 60);
                }
            }
        });

        socket.on('disconnect', () => {
            if (!socket.data.roomId) return;
            let game = pongRooms.find(g => g.getId() === socket.data.roomId);
            if (!game)
				game = pongTournaments.find(g => g.getId() === socket.data.roomId);
			if (!game) return;
            
            const playerindex = game.state.players.findIndex(p => p.id === socket.id);
            if (playerindex !== -1)
                game.state.players.splice(playerindex, 1);

            if (game.state.type === "tournament") {
                if (game.state.status !== "waiting" || game.state.players.length === 0 || game.state.mode === "local") {
                    pongNamespace.to(game.getId()).emit("disconnection");
                    const i = pongTournaments.findIndex(g => g.getId() === socket.data.roomId);
                    if (i !== -1) pongTournaments.splice(i, 1);
                }
                if (game.state.status === "waiting")
                    pongNamespace.to(game.getId()).emit("waiting", game.state);
                tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());
                return;    
            }
            if (game.state.players.length < 2) {
                clearInterval(game.state.loop)
                game.state.loop = undefined;
                game.state.status = "waiting";
                pongNamespace.to(socket.data.roomId).emit("waiting", game.state);
            }
			if (game.state.type === "1v1")
            	lobbyNamespace.emit("lobby_update", getLobbyState());
			else
				tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());

            if (game.state.players.length === 0 || game.state.mode === "local") {
				if (game.state.type === "1v1") {
					const i = pongRooms.findIndex(g => g.getId() === socket.data.roomId);
					if (i !== -1) pongRooms.splice(i, 1);
					lobbyNamespace.emit("lobby_update", getLobbyState());
				}
				else {
					const i = pongTournaments.findIndex(g => g.getId() === socket.data.roomId);
					if (i !== -1) pongTournaments.splice(i, 1);
					tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());								
				}
            }
        })
    });  
}



