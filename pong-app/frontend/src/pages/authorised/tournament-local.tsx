import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { GameRoom, Player } from "../../shared/types";
import TournamentPlayerForm from "../../components/tournament-lobby/TournamentPlayerForm";

export default function TournamentLocalPage() {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [pongTournaments, setPongTournaments] = useState<GameRoom[]>([]);
  const [keyClashTournaments, setKeyClashTournaments] = useState<GameRoom[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    socketRef.current = io("/tournament", {
      path: "/socket.io",
      transports: ["websocket"],
      secure: true
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to tournament lobby");
      setIsConnecting(false);
      
      socketRef.current?.emit("name", user?.name, user?.id, (res: { error?: string }) => {
        if (res?.error) {
          alert(res.error);
          navigate("/lobby");
        }
      });
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnecting(false);
      alert("Failed to connect to tournament lobby");
      navigate("/lobby");
    });

    socketRef.current.on("lobby_update", (data) => {
      setPlayers(data.players || []);
      setPongTournaments(data.pongGames || []);
      setKeyClashTournaments(data.keyClashGames || []);
    });

    socketRef.current.on("created_game", (gameId, game, mode) => {
      console.log("✅ Received created_game event:", { gameId, game, mode });
      
      try {
        // Get player names from sessionStorage
        const storedPlayers = sessionStorage.getItem('tournamentPlayers');
        console.log("📦 Retrieved stored players:", storedPlayers);
        
        const playerNames = storedPlayers ? JSON.parse(storedPlayers) : {
          player1: "Guest1",
          player2: "Guest2", 
          player3: "Guest3",
          player4: "Guest4"
        };
        
        console.log("👥 Using player names:", playerNames);
        console.log("🧭 Attempting navigation...");
        console.log("Current location:", window.location.pathname);
        
        // Clean up socket connection
        if (socketRef.current) {
          console.log("🔌 Disconnecting socket...");
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        
        const type = "tournament";
        const routePath = `/${game}/${mode}/${type}/${gameId}`;
        console.log("🎯 Navigating to:", routePath);
        
        navigate(routePath, { 
          state: { 
            name: playerNames,
            gameType: game,
            mode: mode,
            type: type,
            gameId: gameId,
            fromTournament: true,
            isTournament: true
          } 
        });
        
        console.log("✅ Navigation completed");
        
      } catch (error) {
        console.error("❌ Error in created_game handler:", error);
        alert("Navigation failed: " + error.message);
      }
    });

    socketRef.current.on("joined_game", (gameId, game, mode) => {
      console.log("Joined game, navigating:", gameId, game, mode);
      
      // Clean up socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      const type = "tournament";
      navigate(`/${game}/${mode}/${type}/${gameId}`, { 
        state: { name: user?.name } 
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.name, user?.id, navigate]);

  const joinGame = (gameId: string, game: "pong" | "keyclash", mode: "local" | "remote") => {
    socketRef.current?.emit("join_game", gameId, game, mode, (res: { error?: string }) => {
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleStartTournament = async (gameType: "pong" | "keyclash", playerNames: string[]) => {
    try {
      if (!socketRef.current) {
        alert("Not connected to server");
        return;
      }

      console.log("Starting tournament:", gameType, "with players:", playerNames);

      // Ensure the authenticated user is always Player 1
      const playerNamesObject = {
        player1: user?.name || user?.username || "You",
        player2: playerNames[1] || "Guest2", 
        player3: playerNames[2] || "Guest3",
        player4: playerNames[3] || "Guest4"
      };
      
      sessionStorage.setItem('tournamentPlayers', JSON.stringify(playerNamesObject));
      console.log("Stored tournament players:", playerNamesObject);

      // Create the game - event handler manages navigation
      socketRef.current.emit("create_game", gameType, "local");
      console.log("Emitted create_game event");

    } catch (error) {
      console.error("Error starting tournament:", error);
      alert("Failed to start tournament: " + error.message);
    }
  };

  if (isConnecting) {
    return (
      <div className="w-full min-h-screen text-white p-8 flex flex-col items-center justify-center">
        <div className="text-xl">Connecting to tournament lobby...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen text-white p-8 flex flex-col items-center relative">
      <button
        onClick={() => navigate("/lobby")}
        className="absolute top-8 left-8 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
      >
        Back to Lobby
      </button>

      <div className="flex flex-col items-center space-y-8 mt-16">
        <h1 className="text-4xl font-bold text-center">
          Local Tournament Setup
        </h1>
        
        <div className="text-center text-gray-300 max-w-2xl">
          <p>Set up a local tournament with 4 players on the same device.</p>
          <p>Players compete using the same keyboard (W/S and up/down arrow keys).</p>
        </div>

        <TournamentPlayerForm onStart={handleStartTournament} />
      </div>
    </div>
  );
}