import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { io, Socket } from "socket.io-client";

interface Player {
  id: string;
  name: string;
}
interface GameRoom {
  id: string;
  players: Player[];
  status: "waiting" | "in-progress";
}

export default function Lobby() {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<GameRoom[]>([]);

  useEffect(() => {
    socketRef.current = io(`wss://${import.meta.env.VITE_HOST_IP}/lobby`, {
      path: "/socket.io",
      transports: ["websocket"],
      secure: true
    });

    socketRef.current.on("lobby_update", (data) => {
      setPlayers(data.players);
      setGames(data.games);
    });

    socketRef.current.on("created_game", (gameId) => {
      joinGame(gameId);
    })

    socketRef.current.on("joined_game", (gameId) => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      navigate(`/game/${gameId}`);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [navigate]);

  const createGame = () => {
    socketRef.current?.emit("create_game");
  };

  const joinGame = (gameId: string) => {
    socketRef.current?.emit("join_game", gameId, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Players in Lobby ({players.length})</h2>
      <ul>
        {players.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>

      <h2>Games</h2>
      <ul>
        {games.map(game => (
          <li
            key={game.id}
            style={{
              cursor: game.status === "waiting" ? "pointer" : "default",
              padding: "0.5rem",
              border: "1px solid #ccc",
              margin: "0.5rem 0"
            }}
            onClick={() => {
              if (game.status === "waiting") joinGame(game.id);
            }}
          >
            <strong>Room-{game.id}</strong> — {game.players.length} players — {game.status}
            <ul>
              {game.players.map(p => <li key={p.id}>{p.name}</li>)}
            </ul>
          </li>
        ))}
          <button onClick={createGame}>Create New Game</button>        
      </ul>
    </div>
  );
}
