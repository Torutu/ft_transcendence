// backend/src/PongServer.ts
import { Server } from "socket.io";
import { pongRooms, getLobbyState } from "./gameData.js";

// added by poonkodi - begin
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function saveMatchResult(player1Name: string, player2Name: string, winnerName: string, player1Score: number, player2Score: number) {
  try {
    if (!player1Name || !player2Name || !winnerName) {
      console.error("❌ Invalid player names provided");
      return;
    }

    console.log(`🏓 Saving Pong match: ${player1Name} (${player1Score}) vs ${player2Name} (${player2Score}), winner: ${winnerName}`);
    
    const [player1, player2, winner] = await Promise.all([
      prisma.user.findUnique({ where: { name: player1Name } }),
      prisma.user.findUnique({ where: { name: player2Name } }),
      prisma.user.findUnique({ where: { name: winnerName } })
    ]);

    if (!player1 || !player2 || !winner) {
      console.error("❌ Some players not found in database:", { 
        player1Found: !!player1, 
        player2Found: !!player2, 
        winnerFound: !!winner 
      });
      return;
    }

    const match = await prisma.match.create({
      data: {
        player1Id: player1.id,
        player2Id: player2.id,
        player1Name: player1Name,
        player2Name: player2Name,
        player1Score: player1Score,
        player2Score: player2Score,
        winnerId: winner.id
      }
    });

    console.log(`✅ Pong match saved successfully! Match ID: ${match.id}`);
  } catch (error) {
    console.error("❌ Error saving Pong match:", error);
  }
}

// added by poonkodi - end

export function setupPongNamespace(io: Server) {
    const pongNamespace = io.of("/pong");
    const lobbyNamespace = io.of("/lobby");

    pongNamespace.on("connection", (socket) => {
        console.log("Client joined game:", socket.id);

        socket.on("join_game_room", (roomId, name, player2, callback) => {
            const gameRoom = pongRooms.find(g => g.getId() === roomId)
            if (!gameRoom){
                return callback({error: "Can't find the game room!" });
            }
            if (gameRoom.state.status !== "waiting") {
                return callback({ error: "The game is full!" });
            }
            socket.data.roomId = roomId;
            socket.on("move", (side, positionZ) => {
                if (side === "left")
                    gameRoom.state.leftPaddle.z = positionZ;
                else if (side === "right")
                    gameRoom.state.rightPaddle.z = positionZ;
            });
            socket.on("pause", () => {
                togglePause();
            })
            // socket.on("keyDown", (key, side) => {
            //     if (side === "left") {
            //         if (key === "w" || key === "ArrowUp")
            //             gameRoom.state.keys["w"] = true;
            //         else
            //             gameRoom.state.keys["s"] = true;
            //     }
            //     else if (side === "right") {
            //         if (key === "w" || key === "ArrowUp")
            //             gameRoom.state.keys["ArrowUp"] = true;
            //         else
            //             gameRoom.state.keys["ArrowDown"] = true;                
            //     }
            //     else
            //         gameRoom.state.keys[key as keyof typeof gameRoom.state.keys] = true;
            // });
            // socket.on("keyUp", (key, side) => {
            //     if (side === "left") {
            //         if (key === "w" || key === "ArrowUp")
            //             gameRoom.state.keys["w"] = false;
            //         else
            //             gameRoom.state.keys["s"] = false;
            //     }
            //     else if (side === "right") {
            //         if (key === "w" || key === "ArrowUp")
            //             gameRoom.state.keys["ArrowUp"] = false;
            //         else
            //             gameRoom.state.keys["ArrowDown"] = false;                
            //     }
            //     else            
            //         gameRoom.state.keys[key as keyof typeof gameRoom.state.keys] = false;
            // });

            let playerSide: "left" | "right" | null = "left";

            if (gameRoom.state.players.length === 1 && gameRoom.state.players[0].side === "left")
                playerSide = "right"                  
            
            gameRoom.setPlayer(playerSide, name, socket.id);

            if (gameRoom.state.mode === "local"){
                gameRoom.setPlayer("right", player2, null);
                playerSide = null;
            }

            socket.join(roomId);

            console.log('players: ', gameRoom.state.players);
                
            socket.emit('playerSide', playerSide);
            pongNamespace.emit('stateUpdate', gameRoom.state);
            lobbyNamespace.emit("lobby_update", getLobbyState());

            startGame();

            socket.on("restart", () => { 
                startGame();
            });

            function startGame() {
                if (gameRoom?.state.players.length === 2) {
                    gameRoom.state.status = "in-progress";
                    lobbyNamespace.emit("lobby_update", getLobbyState());
                    if (!gameRoom.state.loop) {
                        // Broadcast game state at 60fps
                        gameRoom.resetGame();
                        pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state, "start");      
                        
                        // Added by Poonkodi - begin

                        // gameRoom.state.loop = setInterval(() => {
                        //     gameRoom.update();
                        //     pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state);
                        //     if (gameRoom.state.status === "finished") {
                        //         clearInterval(gameRoom.state.loop);
                        //         gameRoom.state.loop = undefined;
                        //         lobbyNamespace.emit("lobby_update", getLobbyState());
                        //     }
                        // }, 1000 / 60);
                        gameRoom.state.loop = setInterval(() => {
    gameRoom.update();
    pongNamespace.to(gameRoom.getId()).emit("stateUpdate", gameRoom.state);
    
    if (gameRoom.state.status === "finished") {
        clearInterval(gameRoom.state.loop);
        gameRoom.state.loop = undefined;
        lobbyNamespace.emit("lobby_update", getLobbyState());
        
        const player1Name = gameRoom.getLeftPlayer();
        const player2Name = gameRoom.getRightPlayer();
        const scoreText = gameRoom.state.scoreDisplay;
        
        if (!player1Name || !player2Name || !scoreText) {
            console.log("❌ Missing player names or score - skipping match save");
            return;
        }
        
        const player1Score = gameRoom.getLeftScore();  
        const player2Score = gameRoom.getRightScore();
        
        let winnerName = '';
        if (player1Score > player2Score) {
            winnerName = player1Name;
        } else if (player2Score > player1Score) {
            winnerName = player2Name;
        }
        
        if (winnerName && gameRoom.state.mode === "remote") {
            console.log(`🏓 Final Score: ${player1Name} ${player1Score} - ${player2Score} ${player2Name}, Winner: ${winnerName}`);
            saveMatchResult(player1Name, player2Name, winnerName, player1Score, player2Score);
        }
    }
}, 1000 / 60);
// Added by Poonkodi - end
                    }                     
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

        socket.on('disconnect', () => {
            if (!socket.data.roomId) return;
            const game = pongRooms.find(g => g.getId() === socket.data.roomId);
            if (!game) return;
            
            const playerindex = game.state.players.findIndex(p => p.id === socket.id);
            if (playerindex !== -1)
                game.state.players.splice(playerindex, 1);

            if (game.state.players.length < 2) {
                clearInterval(game.state.loop)
                game.state.loop = undefined;
                game.state.status = "waiting";
                pongNamespace.to(socket.data.roomId).emit("waiting");
            }
            lobbyNamespace.emit("lobby_update", getLobbyState());

            if (game.state.players.length === 0 || game.state.mode === "local") {
                const i = pongRooms.findIndex(g => g.getId() === socket.data.roomId);
                if (i !== -1) pongRooms.splice(i, 1);
                lobbyNamespace.emit('lobby_update', getLobbyState());
            }
        })
    });  
}



