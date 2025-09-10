import { Server, Socket } from "socket.io";
import { playersOnlineTournament, pongTournaments, keyClashTournaments, getTournamentLobbyState } from "./gameData";
import PingPongGame from "./PingPongGame";
import { state } from "./KeyClashGame";

export function setupTournamentLobby(io: Server) {
    const tournamentLobbyNamespace = io.of('/tournament_lobby');

    tournamentLobbyNamespace.on("connection", (socket: Socket) => {
      console.log(`Player connected: ${socket.id}`);

      socket.on("name", (name: string | null, playerId: string | null, callback: Function) => {
        if (playerId && playersOnlineTournament.some(p => p.playerId === playerId))
          return callback({ error: "You're already in the lobby" });
        if (name)
          socket.data.name = name
        else
          socket.data.name = `Guest-${socket.id.slice(0, 3)}`;

        playersOnlineTournament.push({ playerId: playerId, socketId: socket.id, name: socket.data.name });

        tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());        
      })

  
      socket.on("create_game", (game: "pong" | "keyclash", mode: "local" | "remote") => {
        const id = Math.random().toString(36).substring(2, 6);

        if (game === "pong") pongTournaments.push(new PingPongGame(id, mode, "tournament"));
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
			      type: "tournament",
            round: 1,
          }
          keyClashTournaments.push(newKeyClash);
        }
        socket.emit("created_game", id, game, mode);
      });
  
      socket.on("join_game", (gameId, game, mode, callback) => {
        if (game === "pong") { 
          const gameRoom = pongTournaments.find(g => g.getId() === gameId); 
          if (!gameRoom) return callback({ error: "Game not found" });
          if (gameRoom.state.status !== "waiting") return callback({ error: "Game already started" });                
        }
        else { 
          const gameRoom = keyClashTournaments.find(g => g.id === gameId);
          if (!gameRoom) return callback({ error: "Game not found" });
          if (gameRoom.status !== "waiting") return callback({ error: "Game already started" });          
        } 
        // remove player from list of players in tournamentLobby
        const i = playersOnlineTournament.findIndex(p => p.socketId === socket.id);
        if (i !== -1) playersOnlineTournament.splice(i, 1);

        tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());        

        socket.emit("joined_game", gameId, game, mode);
      });
  
      socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);

        const player = playersOnlineTournament.findIndex(p => p.socketId === socket.id);
        if (player !== -1) playersOnlineTournament.splice(player, 1);
  
        tournamentLobbyNamespace.emit("lobby_update", getTournamentLobbyState());
      });
    });
  }