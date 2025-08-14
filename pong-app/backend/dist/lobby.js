import { playersOnline, gameRooms, getLobbyState } from "./gameData.js";

export function setupLobby(io) {
    const lobbyNamespace = io.of('/lobby');

    lobbyNamespace.on("connection", (socket) => {
      console.log(`Player connected: ${socket.id}`);

      // if registered get the name, else:
      const playerName =  `Guest-${socket.id.slice(0, 4)}`;

      playersOnline.push({ id: socket.id, name: playerName });

      lobbyNamespace.emit("lobby_update", getLobbyState());
  
      socket.on("create_game", () => {
        const id = Math.random().toString(36).substring(2, 6);
        const newGame = {
          id,
          hostId: socket.id,
          players: {},
          player1name: null,
          player2name: null,
          status: "waiting",
          state: null,
          loop: null,
          paddleSpeed: 0.2,
        };
        gameRooms.push(newGame);

        const i = playersOnline.findIndex(p => p.id === socket.id);
        if (i !== -1) playersOnline.splice(i, 1);
        // socket.leave("/lobby");

        lobbyNamespace.emit("lobby_update", getLobbyState());        
        socket.emit("created_game", id);
      });
  
      socket.on("join_game", (gameId, callback) => {
        const game = gameRooms.find(g => g.id === gameId);
        if (!game) return callback({ error: "Game not found" });
        if (game.status !== "waiting") return callback({ error: "Game already started" });
  
        // game.players.push({ id: socket.id, name: playerName });

        const i = playersOnline.findIndex(p => p.id === socket.id);
        if (i !== -1) playersOnline.splice(i, 1);
        // socket.leave("/lobby");

        lobbyNamespace.emit("lobby_update", getLobbyState());        
        // socket.join(gameId);
        socket.emit("joined_game", gameId);
      });
  
      socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);

        const player = playersOnline.findIndex(p => p.id === socket.id);
        if (player !== -1) playersOnline.splice(player, 1);
  
        lobbyNamespace.emit("lobby_update", getLobbyState());
      });
    });
  }