import { Server, Socket } from "socket.io";
import { playersOnline, pongRooms, keyClashRooms, getLobbyState } from "./gameData";
import PingPongGame from "./PingPongGame";
import { state } from "./KeyClashGame";

export function setupLobby(io: Server) {
    const lobbyNamespace = io.of('/lobby');

    lobbyNamespace.on("connection", (socket: Socket) => {
      console.log(`Player connected: ${socket.id}`);

      socket.on("name", (name: string | null, playerId: string | null, callback: Function) => {
        if (playerId && playersOnline.some(p => p.playerId === playerId))
          return callback({ error: "You're already in the lobby" });
        if (name)
          socket.data.name = name
        else
          socket.data.name = `Guest-${socket.id.slice(0, 3)}`;

        playersOnline.push({ playerId: playerId, socketId: socket.id, name: socket.data.name });

        lobbyNamespace.emit("lobby_update", getLobbyState());        
      })

  
      socket.on("create_game", (game: "pong" | "keyclash", mode: "local" | "remote") => {
        const id = Math.random().toString(36).substring(2, 6);

        if (game === "pong") pongRooms.push(new PingPongGame(id, mode, "1v1"));
        else {
          let newKeyClash: state = {
            id: id,
            score1: 0,
            score2: 0,
            prompts: ["-", "-"],
            timeLeft: 20,
            players: [],
            matches: [],
            interval: null,
            player1ready: false,
            player2ready: false,
            p1: undefined,
            p2: undefined,
            status: "waiting",
            mode: mode,
			      type: "1v1",
            round: 0,
          }
          keyClashRooms.push(newKeyClash);
        }
        socket.emit("created_game", id, game, mode);
      });
  
      socket.on("join_game", (gameId, game, mode, callback) => {
        if (game === "pong") { 
          const gameRoom = pongRooms.find(g => g.getId() === gameId); 
          if (!gameRoom) return callback({ error: "Game not found" });
          if (gameRoom.state.status !== "waiting") return callback({ error: "Game already started" });                
        }
        else { 
          const gameRoom = keyClashRooms.find(g => g.id === gameId);
          if (!gameRoom) return callback({ error: "Game not found" });
          if (gameRoom.status !== "waiting") return callback({ error: "Game already started" });          
        } 
        // remove player from list of players in lobby
        const i = playersOnline.findIndex(p => p.socketId === socket.id);
        if (i !== -1) playersOnline.splice(i, 1);

        lobbyNamespace.emit("lobby_update", getLobbyState());        

        socket.emit("joined_game", gameId, game, mode);
      });
  
      socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);

        const player = playersOnline.findIndex(p => p.socketId === socket.id);
        if (player !== -1) playersOnline.splice(player, 1);
  
        lobbyNamespace.emit("lobby_update", getLobbyState());
      });
    });
  }