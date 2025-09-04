import { Server } from "socket.io";
import { keyClashRooms, getLobbyState, keyClashTournaments, getTournamentLobbyState } from "./gameData.js";

export interface state {
    id: string,
    score1: number,
    score2: number,
    prompts: [string, string],
    timeLeft: number,
    players: Record<string, number>,
    interval: NodeJS.Timeout | null,
    player1ready: boolean,
    player2ready: boolean,
    p1: string | undefined,
    p2: string | undefined,
    status: "waiting" | "starting" | "in-progress" | "finished",
    mode: "local" | "remote",
	type: "1v1" | "tournament"
}

function getPublicState(state: state) {
    return {
      id: state.id,
      player1: {
        name: state.p1,
        score: state.score1,
        ready: state.player1ready
      },
      player2: {
        name: state.p2,
        score: state.score2,
        ready: state.player2ready
      },
      prompts: state.prompts,
      timeLeft: state.timeLeft,
      players: state.players,
      status: state.status,
      mode: state.mode,
	  type: state.type
    };
}

function getRandomKey(keys: string[]) {
    return keys[Math.floor(Math.random() * keys.length)];
}

const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const wasdKeys = ['w', 's', 'a', 'd'];

export function setupKeyClash(io: Server) {

    const keyClash = io.of("/keyclash");
    const lobby = io.of("/lobby");
	const tournament_lobby = io.of("tournament_lobby");

    keyClash.on("connection", (socket) => {
        console.log(`Player connected on key clash: ${socket.id}`);

        socket.on("join_game_room", (roomId, mode, type, name, player2, callback) => {
			let roomState: state | undefined;
			if (type === "1v1") {
				roomState = keyClashRooms.find(r => r.id === roomId);
				if (!roomState) {
					return callback({ error: "Can't find the key clash game room!" });
				}
			}
			else {
				roomState = keyClashTournaments.find(r => r.id === roomId);
				if (!roomState) {
					return callback({ error: "Can't find the key clash tournament!" });
				}				
			}
            const state = roomState;            
            if (state.status !== "waiting") {
                return callback({ error: "The game is full!" });
            }
            socket.data.roomId = roomId;
            state.mode = mode;

            if (!Object.values(state.players).includes(1)) {
                state.players[socket.id] = 1;
                state.p1 = name?.substring(0, 10);
            } else {
                state.players[socket.id] = 2;
                state.p2 = name?.substring(0, 10);
            }
            if (mode === "local") {
                state.p2 = player2?.substring(0, 10);
                state.players["player2"] = 2;
            }

            const playerNum = state.players[socket.id];
            // socket.data.player = playerNum;
        
            socket.join(roomId);

            console.log('players: ', state.players);

            if (Object.keys(state.players).length < 2) {
                state.status = "waiting";
                socket.emit("waiting");
            }
            else
                state.status = "starting";

			if (type === "1v1")
            	lobby.emit("lobby_update", getLobbyState());
			else
				tournament_lobby.emit("lobby_update", getTournamentLobbyState());
            keyClash.to(roomId).emit("gameState", getPublicState(state));

            socket.on("setReady", () => {
                if (state.status === "in-progress" || Object.keys(state.players).length < 2) return;
                if (state.mode === "local")
                    return startGame();
                if (state.status === "finished"){
                    state.status = "starting";
					if (type === "1v1")
						lobby.emit("lobby_update", getLobbyState());
					else
						tournament_lobby.emit("lobby_update", getTournamentLobbyState());
                }
                if (playerNum === 1) { state.player1ready = true; }
                else { state.player2ready = true; }
                console.log("p1 ready", state.player1ready);
                console.log(state.player2ready)
                keyClash.to(roomId).emit("gameState", getPublicState(state));
                if (Object.keys(state.players).length === 2 && state.player1ready && state.player2ready) {
                    startGame();
                }
            });
            
            function startGame() {
                if (state.status === "in-progress") return; // game already running

                state.status = "in-progress";
				if (type === "1v1")
					lobby.emit("lobby_update", getLobbyState());
				else
					tournament_lobby.emit("lobby_update", getTournamentLobbyState());
                state.score1 = 0;
                state.score2 = 0;
                state.timeLeft = 20;
                state.prompts = [getRandomKey(wasdKeys), getRandomKey(arrowKeys)];
                keyClash.to(roomId).emit("gameStart", getPublicState(state));
            
                state.interval = setInterval(() => {
                    state.timeLeft--;
                    if (state.timeLeft <= 0 && state.interval) {
                        clearInterval(state.interval);
                        state.interval = null;
                        state.status = "finished";
						if (type === "1v1")
							lobby.emit("lobby_update", getLobbyState());
						else
							tournament_lobby.emit("lobby_update", getTournamentLobbyState());
                        keyClash.to(roomId).emit("gameOver", getPublicState(state));
                        state.player1ready = false;
                        state.player2ready = false;
                    }
                    else { keyClash.to(roomId).emit("gameState", getPublicState(state)); }
                }, 1000);
            };
        
            socket.on("keypress", ({ key }) => {
                if (state.timeLeft <= 0 || state.status !== "in-progress") return;

                if (mode === "remote") {
                    if (playerNum === 1) {
                        if (key === state.prompts[0] ||
                            key === arrowKeys[wasdKeys.indexOf(state.prompts[0])]) {
                            state.score1++;
                            state.prompts[0] = getRandomKey(wasdKeys);
                            keyClash.to(roomId).emit("correctHit", { player: 1 });
                        } else {
                            state.score1--;
                        }
                    }
                    if (playerNum === 2) {
                        if (key === state.prompts[1] || 
                            key === wasdKeys[arrowKeys.indexOf(state.prompts[1])]) {
                            state.score2++;
                            state.prompts[1] = getRandomKey(arrowKeys);
                            keyClash.to(roomId).emit("correctHit", { player: 2 });
                        } else {
                            state.score2--;
                        }
                    }
                }
                else {
                    if (wasdKeys.includes(key)) {
                        if (key === state.prompts[0]) {
                            state.score1++;
                            state.prompts[0] = getRandomKey(wasdKeys);
                            keyClash.to(roomId).emit("correctHit", { player: 1 });
                        }
                        else
                            state.score1--;
                    }
                    else if (arrowKeys.includes(key)) {
                        if (key === state.prompts[1]) {
                            state.score2++;
                            state.prompts[1] = getRandomKey(arrowKeys);
                            keyClash.to(roomId).emit("correctHit", { player: 2 });
                        }
                        else
                            state.score2--;                     
                    }
                }
                keyClash.to(roomId).emit("gameState", getPublicState(state));
            });
        });

        socket.on("disconnect", () => {
            console.log(`Player disconnected from key clash: ${socket.id}`);            
            if (!socket.data.roomId) return;
            let game = keyClashRooms.find(g => g.id === socket.data.roomId);
            if (!game)
				game = keyClashTournaments.find(g => g.id === socket.data.roomId);
            if (!game) return;
			
            if (socket.id in game.players) {
                if (game.players[socket.id] === 1)
                    game.p1 = undefined;
                else
                    game.p2 = undefined;
                delete game.players[socket.id];
            }
            if (Object.keys(game.players).length < 2) {
                if (game.interval){
                    clearInterval(game.interval);
                    game.interval = null;
                }
                game.status = "waiting";
                game.player1ready = false;
                game.player2ready = false;
                keyClash.to(socket.data.roomId).emit("waiting");
            }
			if (game.type === "1v1")
            	lobby.emit("lobby_update", getLobbyState());
			else
				tournament_lobby.emit("lobby_update", getTournamentLobbyState());
    
            if (Object.keys(game.players).length === 0 || game.mode === "local") {
				if (game.type === "1v1") {
                	const i = keyClashRooms.findIndex(g => g.id === socket.data.roomId);
					if (i !== -1) keyClashRooms.splice(i, 1);
					lobby.emit("lobby_update", getLobbyState());
				}
				else {
                	const i = keyClashTournaments.findIndex(g => g.id === socket.data.roomId);
					if (i !== -1) keyClashTournaments.splice(i, 1);
					tournament_lobby.emit("lobby_update", getTournamentLobbyState());								
				}
            }
        });
    });
}