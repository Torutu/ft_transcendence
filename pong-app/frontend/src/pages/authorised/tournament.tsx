import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";

interface Player {
  id: string;
  name: string;
}
interface GameRoom {
  id: string;
  status: "waiting" | "in-progress" | "finished";  
  players: { id: string, name: string }[];
}

export default function TournamentPage() {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [pongTournaments, setPongTournaments] = useState<GameRoom[]>([]);
  const [keyClashTournaments, setKeyClashTournaments] = useState<GameRoom[]>([]);
  const { user } = useAuth();
  let name: string | null = null;
  let playerId: string | null = null;

  useEffect(() => {
    socketRef.current = io("/tournament", {
      path: "/socket.io",
      transports: ["websocket"],
      secure: true
    });

    socketRef.current.on("connect", () => {
      if (user) {
        name = user.name;
        playerId = user.id;
      }
      socketRef.current?.emit("name", name, playerId, (res: { error: string }) => {
        if (res.error) {
          alert(res.error);
          navigate("/lobby")
        }
      });
    });

    socketRef.current.on("lobby_update", (data) => {
      setPlayers(data.players);
      setPongTournaments(data.pongGames);
      setKeyClashTournaments(data.keyClashGames)
    });

    socketRef.current.on("created_game", (gameId, game, mode) => {
      joinGame(gameId, game, mode);
    })

    socketRef.current.on("joined_game", (gameId, game, mode) => {
      socketRef.current?.disconnect();
      socketRef.current = null;
	    const type = "tournament";
      navigate(`/${game}/${mode}/${type}/${gameId}`, { state: { name: name } });
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const createLocalPong = () => {
    socketRef.current?.emit("create_game", "pong", "local");
  };
  const createRemotePong = () => {
    socketRef.current?.emit("create_game", "pong", "remote");
  };
  const createLocalKeyClash = () => {
    socketRef.current?.emit("create_game", "keyclash", "local");
  };
  const createRemoteKeyClash = () => {
    socketRef.current?.emit("create_game", "keyclash", "remote");
  };


  const joinGame = (gameId: string, game: "pong" | "keyclash", mode: "local" | "remote") => {
    socketRef.current?.emit("join_game", gameId, game, mode, (res: { error: string }) => {
      if (res.error) alert(res.error);
    });
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Players in Tournament Lobby ({players.length})</h2>
      <ul>
        {players.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>

      <h2>Pong Tournaments</h2>
      <ul>
        {pongTournaments.map(game => (
          <li
            key={game.id}
            style={{
              cursor: game.status === "waiting" ? "pointer" : "default",
              padding: "0.5rem",
              border: "1px solid #ccc",
              margin: "0.5rem 0"
            }}
            onClick={() => {
              if (game.status === "waiting") joinGame(game.id, "pong", "remote");
            }}
          >
            <strong>Tournament-{game.id}</strong> — {game.players.length}/4 players  — {game.status}
            <ul>
              {game.players.map(p => <li key={p.id}>{p.name}</li>)}
            </ul>
          </li>
        ))}
        <ul>
          <button onClick={createLocalPong}>Create New Local Pong Tournament</button>
        </ul>
        <ul>
          <button onClick={createRemotePong}>Create New Remote Pong Tournament</button> 
        </ul>
      </ul>

      <h2>Key Clash Tournaments</h2>
      <ul>
        {keyClashTournaments.map(game => (
          <li
            key={game.id}
            style={{
              cursor: game.status === "waiting" ? "pointer" : "default",
              padding: "0.5rem",
              border: "1px solid #ccc",
              margin: "0.5rem 0"
            }}
            onClick={() => {
              if (game.status === "waiting") joinGame(game.id, "keyclash", "remote");
            }}
          >
            <strong>Tournament-{game.id}</strong> — {game.players.length}/4 players — {game.status}
            <ul>
              {game.players.map(p => <li key={p.id}>{p.name}</li>)}
            </ul>
          </li>
        ))}      
        <ul>
        <button onClick={createLocalKeyClash}>Create New Local Key Clash Tournament</button>
        </ul>
        <ul>
          <button onClick={createRemoteKeyClash}>Create New Remote Key Clash Tournament</button> 
        </ul>                     
      </ul>
    </div>
  );
}
