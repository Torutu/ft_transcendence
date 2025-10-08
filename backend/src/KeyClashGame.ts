import { Server } from "socket.io";
import  { shufflePlayers } from "./PingPongGame"
import { Player } from "./types/lobby";
import { keyClashRooms, getLobbyState, keyClashTournaments, 
    getTournamentLobbyState, saveGameResult, createGameResult,
	canLeaveTournament, validatePlayerNames } from "./gameData.js";
import { PrismaClient } from '@prisma/client';

export interface state {
    id: string,
    score1: number,
    score2: number,
    prompts: [string, string],
    timeLeft: number,
    players: Player[],
    matches: { player1: Player, player2: Player, p1score: number, p2score: number, winner: Player | null, duration: number }[];
    interval: NodeJS.Timeout | null,
    player1ready: boolean,
    player2ready: boolean,
    p1: string | null,
    p2: string | null,
    status: "waiting" | "starting" | "in-progress" | "finished",
    mode: "local" | "remote",
	type: "1v1" | "tournament",
    round: number,
};

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
      matches: state.matches,
      status: state.status,
      mode: state.mode,
	  type: state.type,
      round: state.round,
    };
};

function getRandomKey(keys: string[]) {
    return keys[Math.floor(Math.random() * keys.length)];
};

const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const wasdKeys = ['w', 's', 'a', 'd'];

export function setupKeyClash(io: Server, prisma: PrismaClient) {

    const keyClash = io.of("/keyclash");
    const lobby = io.of("/quickmatch");
	const tournament_lobby = io.of("tournament");

    keyClash.on("connection", (socket) => {
        socket.on("join_game_room", (roomId, mode, type, playerId, callback) => {
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
            socket.emit("get_names", state.players);
            socket.on("names", (names) => {
                const p_num = validatePlayerNames(names, type, mode);
                if (p_num > 0)
                    return callback({ error: `Invalid name for player${p_num}`});
                const player: Player = { socketId: socket.id, name: names.player1, side: null, playerId: playerId };

                if (state.players.length >= 1 && state.players[0].name === player.name)
                    return callback({ error: `The name "${player.name}" is already taken`});
                if (state.players.length >= 2 && state.players[1].name === player.name)
                    return callback({ error: `The name "${player.name}" is already taken`});
                if (state.players.length >= 3 && state.players[2].name === player.name)
                    return callback({ error: `The name "${player.name}" is already taken`});

                if (state.players.length === 0 || (state.players.length === 1 && state.players[0].side === "right")) {
                    player.side = "left";
                    state.players.push(player);
                    if (state.type === "1v1")
                        state.p1 = names.player1;
                }
                else if (state.players.length === 1 && state.players[0].side === "left") {
                    player.side = "right";
                    state.players.push(player);
                    if (state.type === "1v1")
                        state.p2 = names.player1;         
                }
                else
                    state.players.push(player); 

                if (mode === "local") {
                    state.players.push({ socketId: "p2", name: names.player2, side: "right", playerId: null });
                    if (state.type === "1v1")
                        state.p2 = names.player2;
                    if (type === "tournament") {
                        state.players.push({ socketId: "p3", name: names.player3, side: null, playerId: null });
                        state.players.push({ socketId: "p4", name: names.player4, side: null, playerId: null });
                    }
                }
				else {
					if (!state.p1) state.p1 = "player 1";
					if (!state.p2) state.p2 = "player 2";
				}
            
                socket.join(roomId);

                if ((state.type === "1v1" && state.players.length < 2) || 
                (state.type === "tournament" && state.players.length < 4)) {
                    state.status = "waiting";
                    keyClash.to(roomId).emit("waiting", getPublicState(state));
                }
                else {
                    state.status = "starting";
                    if (state.type === "tournament") {
						state.round++;
                        matchmake();
					}
					else {
						state.score1 = 0;
                		state.score2 = 0;
                		state.timeLeft = 20;
					}
                }
                if (type === "1v1")
                    lobby.emit("lobby_update", getLobbyState());
                else
                    tournament_lobby.emit("lobby_update", getTournamentLobbyState());
                keyClash.to(roomId).emit("gameState", getPublicState(state));

                socket.on("keypress", ({ key }) => {
                    if (state.timeLeft <= 0 || state.status !== "in-progress") return;
    
                    if (mode === "remote") {
                        if (player.side === "left") {
                            if (key === state.prompts[0] ||
                                key === arrowKeys[wasdKeys.indexOf(state.prompts[0])]) {
                                state.score1++;
                                state.prompts[0] = getRandomKey(wasdKeys);
                                keyClash.to(roomId).emit("correctHit", { player: 1 });
                            } else {
                                state.score1--;
                            }
                        }
                        if (player.side === "right") {
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
                
                socket.on("setReady", () => {
                    if ((state.status !== "starting" && state.status !== "finished") || (state.type === "tournament" && state.status === "finished")) return;
                    if (state.mode === "local")
                        return startGame();
                    if (state.status === "finished") {
                        state.status = "starting";
                        lobby.emit("lobby_update", getLobbyState());
                    }
                    if (player.side === "left") { state.player1ready = true; }
                    else if (player.side === "right") { state.player2ready = true; }
                    else return;
                    state.score1 = 0;
                    state.score2 = 0;
                    keyClash.to(roomId).emit("gameState", getPublicState(state));
                    if ((state.type === "1v1" && state.players.length === 2 && state.player1ready && state.player2ready) ||
                    (state.type === "tournament" && state.status === "starting" && state.player1ready && state.player2ready)) {
                        startGame();
                    }
                });
            });

            function startGame() {
                if (state.status === "in-progress") return; // game already running

                state.status = "in-progress";
				if (type === "1v1") {
					state.round++;
					state.matches.push( { player1: state.players[0], player2: state.players[1], 
                                        p1score: 0, p2score: 0, winner: null, duration: 0 });
					lobby.emit("lobby_update", getLobbyState());
				}
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
                        state.player1ready = false;
                        state.player2ready = false;
                        if (state.score1 > state.score2) {
                            state.matches[state.round - 1].winner = state.matches[state.round - 1].player1;
                        }
						else if (state.score1 < state.score2) {
							state.matches[state.round - 1].winner = state.matches[state.round - 1].player2;
                        }
                        else if (state.type === "tournament"){ // "coin flip" in case of a tie in tournament
                            if (Math.random() < 0.5) {
                                state.matches[state.round - 1].winner = state.matches[state.round - 1].player1;
                            }
                            else {
                                state.matches[state.round - 1].winner = state.matches[state.round - 1].player2;
                            }
                        }
                        state.matches[state.round - 1].p1score = state.score1;
                        state.matches[state.round - 1].p2score = state.score2;
                        state.matches[state.round - 1].duration = 20;
                        const result = createGameResult(state.id, "keyclash", state.mode, 
                                            state.matches[state.round - 1], []);
                        saveGameResult(result, prisma);                        
                        if (state.type === "tournament") {
                            state.round++;
                            matchmake();
                            tournament_lobby.emit("lobby_update", getTournamentLobbyState());
                        }
						else if (type === "1v1") {
							lobby.emit("lobby_update", getLobbyState());
                        }
                        keyClash.to(roomId).emit("gameOver", getPublicState(state));               
                    }
                    else { keyClash.to(roomId).emit("gameState", getPublicState(state)); }
                }, 1000);
            };
        
            function matchmake() {
                if (state.round === 1) {
                    shufflePlayers(state.players);
                    state.matches.push( { player1: state.players[0], player2: state.players[1], 
                                        p1score: 0, p2score: 0, winner: null, duration: 0 });
                    state.matches.push( { player1: state.players[2], player2: state.players[3], 
                                        p1score: 0, p2score: 0, winner: null, duration: 0 });
                    state.p1 = state.matches[0].player1.name;
                    state.p2 = state.matches[0].player2.name;
                    state.players.forEach(player => {
                        player.side = null;
                    });
                    state.matches[0].player1.side = "left";
                    state.matches[0].player2.side = "right";
                }
                else if (state.round === 2) {
                    state.p1 = state.matches[1].player1.name;
                    state.p2 = state.matches[1].player2.name;
                    state.players.forEach(player => {
                        player.side = null;
                    });
                    state.matches[1].player1.side = "left";
                    state.matches[1].player2.side = "right";
                }
                else if (state.round === 3) {
                    if (state.matches[0].winner && state.matches[1].winner) {
                        state.matches.push( { player1: state.matches[0].winner,  player2: state.matches[1].winner, 
                                            p1score: 0, p2score: 0, winner: null, duration: 0 });
                        state.p1 = state.matches[2].player1.name;
                        state.p2 = state.matches[2].player2.name;
                        state.players.forEach(player => {
                            player.side = null;
                        });
                        state.matches[2].player1.side = "left";
                        state.matches[2].player2.side = "right";
                    }
                }
                if (state.round <= 3) {
                    state.status = "starting";
					state.timeLeft = 20;
				}
            };
        });
        socket.on("disconnect", () => {      
            if (!socket.data.roomId) return;
            let game = keyClashRooms.find(g => g.id === socket.data.roomId);
            if (!game)
				game = keyClashTournaments.find(g => g.id === socket.data.roomId);
            if (!game) return;
			
            const playerindex = game.players.findIndex(p => p.socketId === socket.id);
            if (playerindex !== -1) {
                if (game.players[playerindex].side === "left")
                    game.p1 = null;
                else if (game.players[playerindex].side === "right")
                    game.p2 = null;
                game.players.splice(playerindex, 1);
            }

            if (game.type === "tournament") {
                if (game.players.length === 0 || game.mode === "local"
					|| (game.mode === "remote" && !canLeaveTournament(socket.id, game))
				) {
                    keyClash.to(game.id).emit("disconnection");
                    const i = keyClashTournaments.findIndex(g => g.id === socket.data.roomId);
                    if (i !== -1) keyClashTournaments.splice(i, 1);
                }
                if (game.status === "waiting")
                    keyClash.to(socket.data.roomId).emit("waiting", getPublicState(game));
                tournament_lobby.emit("lobby_update", getTournamentLobbyState());
                return;    
            }

            if (game.players.length < 2) {
                if (game.interval){
                    clearInterval(game.interval);
                    game.interval = null;
                }
                game.status = "waiting";
                game.player1ready = false;
                game.player2ready = false;
                keyClash.to(socket.data.roomId).emit("waiting", getPublicState(game));
            }
            lobby.emit("lobby_update", getLobbyState());
    
            if (game.players.length === 0 || game.mode === "local") {
                const i = keyClashRooms.findIndex(g => g.id === socket.data.roomId);
				if (i !== -1) keyClashRooms.splice(i, 1);
					lobby.emit("lobby_update", getLobbyState());
            }
        });
    });
};