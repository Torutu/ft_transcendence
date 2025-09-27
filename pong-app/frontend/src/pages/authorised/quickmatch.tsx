import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import QuickmatchPlayerForm from "../../components/quickmatch-lobby/QuickmatchPlayerForm";
import { GameType } from "../../shared/types";

interface Player {
  socketId: string;
  name: string;
}
interface GameRoom {
  id: string;
  status: "waiting" | "in-progress" | "finished";  
  players: Player[];
}

export default function QuickmatchPage() {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [pongGames, setPongGames] = useState<GameRoom[]>([]);
  const [keyClashGames, setKeyClashGames] = useState<GameRoom[]>([]);
  const { user } = useAuth();
  let name: string | null = null;
  let playerId: number | null = null;

  useEffect(() => {
    socketRef.current = io("/quickmatch", {
      path: "/socket.io",
      transports: ["websocket"],
      secure: true
    });

    socketRef.current.on("connect", () => {
      if (user) {
        name = user.username;
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
      setPongGames(data.pongGames);
      setKeyClashGames(data.keyClashGames)
    });

    socketRef.current.on("created_game", (gameId, game, mode) => {
      try {
				// Get guest name from localStorage
				const storedGuest = localStorage.getItem('quickmatch_guestName');
				console.log("📦 Retrieved stored guest:", storedGuest);

				const playerNames = {
					player1: name,
					player2: storedGuest
        };
        if (socketRef.current) {
          console.log("🔌 Disconnecting socket...");
          socketRef.current.disconnect();
          socketRef.current = null;
        }
			
        const type = "1v1";
        const routePath = `/${game}/${mode}/${type}/${gameId}`;
        console.log("🎯 Navigating to:", routePath);
			
        navigate(routePath, { 
          state: { 
            name: playerNames,
            playerId: playerId,
            gameType: game,
            mode: mode,
            type: type,
            gameId: gameId,
          } 
        });
        console.log("✅ Navigation completed");
        
      } catch (error) {
          console.error("❌ Error in created_game handler:", error);
        	alert("Navigation failed: " + error.message);
      	}
    })

    socketRef.current.on("joined_game", (gameId, game, mode) => {
      socketRef.current?.disconnect();
      socketRef.current = null;
	    const type = "1v1";
      navigate(`/${game}/${mode}/${type}/${gameId}`, { state: { name: name, playerId: playerId } });
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const createRemotePong = () => {
    socketRef.current?.emit("create_game", "pong", "remote");
  };
  const createRemoteKeyClash = () => {
    socketRef.current?.emit("create_game", "keyclash", "remote");
  };
  const createLocalGame = (type: GameType) => {
    socketRef.current?.emit("create_game", type, "local");
  }


  const joinGame = (gameId: string, game: "pong" | "keyclash", mode: "local" | "remote") => {
    socketRef.current?.emit("join_game", gameId, game, mode, (res: { error: string }) => {
      if (res.error) alert(res.error);
    });
  };


	const popup = () => {
		document.getElementById(
                "overlay"
            ).style.display = "block";
            document.getElementById(
                "popupDialog"
            ).style.display = "block";
  };
	const popdown = () => {
            document.getElementById(
                "overlay"
            ).style.display = "none";
            document.getElementById(
                "popupDialog"
            ).style.display = "none";
        };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Players in Lobby ({players.length})</h2>
      <ul>
        {players.map(p => <li key={p.socketId}>{p.name}</li>)}
      </ul>

			<div>
				<button onClick={popup}>Create A Local Quickmatch</button>
				<div id="overlay"></div>
    			<div id="popupDialog">
					<QuickmatchPlayerForm onCreate={createLocalGame} />
          <div style={{position:"relative", left: 250, top: -830}}>
              <button onClick={popdown}>close</button>
          </div>

				</div>
			</div>

      <h2>Pong Games</h2>
      <ul>
        {pongGames.map(game => (
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
            <strong>Room-{game.id}</strong> — {game.players.length}/2 players  — {game.status}
            <ul>
              {game.players.map(p => <li key={p.socketId}>{p.name}</li>)}
            </ul>
          </li>
        ))}
        <ul>
          <button onClick={createRemotePong}>Create New Remote Pong Game</button> 
        </ul>
      </ul>

      <h2>Key Clash Games</h2>
      <ul>
        {keyClashGames.map(game => (
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
            <strong>Room-{game.id}</strong> — {game.players.length}/2 players — {game.status}
            <ul>
              {game.players.map(p => <li key={p.socketId}>{p.name}</li>)}
            </ul>
          </li>
        ))}      
        <ul>
          <button onClick={createRemoteKeyClash}>Create New Remote Key Clash Game</button> 
        </ul>                     
      </ul>
    </div>
  );
}
