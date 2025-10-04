import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import TournamentPlayerForm from "../../components/tournament-lobby/TournamentPlayerForm";

interface Player {
  socketId: string;
  name: string;
}

interface GameRoom {
  id: string;
  status: "waiting" | "in-progress" | "finished";
  players: Player[];
}

// Sub-components
const PlayerList = ({ players }: { players: Player[] }) => {
	if (players.length === 0) {
		return (
			<div className="text-center py-8 text-gray-400">
				No players online currently
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
			{players.map((player) => (
				<div 
					key={player.socketId}
					className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors"
				>
					<div className="w-2 h-2 bg-green-500 rounded-full"></div>
					<span className="text-sm font-medium text-white">{player.name}</span>
				</div>
			))}
		</div>
	);
};

export default function TournamentPage() {
	const socketRef = useRef<Socket | null>(null);
	const navigate = useNavigate();
	const [players, setPlayers] = useState<Player[]>([]);
	const [pongTournaments, setPongTournaments] = useState<GameRoom[]>([]);
	const [keyClashTournaments, setKeyClashTournaments] = useState<GameRoom[]>([]);
	const { user } = useAuth();
	let name: string | null = null;
	let playerId: number | null = null;
	const [showPopup, setShowPopup] = useState(false);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setShowPopup(false);
		};

		if (showPopup) {
			document.addEventListener("keydown", onKeyDown);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = "";
		};
	}, [showPopup]);

  useEffect(() => {
    socketRef.current = io("/tournament", {
      path: "/socket.io",
      transports: ["websocket"],
      secure: true,
    });

    socketRef.current.on("connect", () => {
      if (user) {
        name = user.username;
        playerId = user.id;
      }
      socketRef.current?.emit(
        "name",
        name,
        playerId,
        (res: { error: string }) => {
          if (res.error) {
            alert(res.error);
            navigate("/lobby");
          }
        }
      );
    });

    socketRef.current.on("lobby_update", (data) => {
      setPlayers(data.players);
      setPongTournaments(data.pongGames);
      setKeyClashTournaments(data.keyClashGames);
    });

		socketRef.current.on("created_game", (gameId, game, mode) => {
			try {
				const storedPlayers = sessionStorage.getItem('tournamentPlayers');
				console.log("📦 Retrieved stored players:", storedPlayers);
				
				const playerNames = storedPlayers ? JSON.parse(storedPlayers) : {
					player1: "Guest1",
					player2: "Guest2", 
					player3: "Guest3",
					player4: "Guest4"
				};
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
					playerId: playerId,
					gameType: game,
					mode: mode,
					type: type,
					gameId: gameId,
				} 
        	});
        
        	console.log("✅ Navigation completed");
        
      		} catch (error: any) {
        		console.error("❌ Error in created_game handler:", error);
        		alert("Navigation failed: " + error.message);
      		}
		})

    socketRef.current.on("joined_game", (gameId, game, mode) => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      const type = "tournament";
      navigate(`/${game}/${mode}/${type}/${gameId}`, {
        state: { name: name, playerId: playerId },
      });
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

  const joinGame = (
    gameId: string,
    game: "pong" | "keyclash",
    mode: "local" | "remote"
  ) => {
    socketRef.current?.emit(
      "join_game",
      gameId,
      game,
      mode,
      (res: { error: string }) => {
        if (res.error) alert(res.error);
      }
    );
  };

  const handleStartTournament = async (
    gameType: "pong" | "keyclash",
    playerNames: string[]
  ) => {
    try {
      if (!socketRef.current) {
        alert("Not connected to server");
        return;
      }

      console.log(
        "Starting tournament:",
        gameType,
        "with players:",
        playerNames
      );

      // Ensure the authenticated user is always Player 1
      const playerNamesObject = {
        player1: user?.username || "You",
        player2: playerNames[1] || "Guest2",
        player3: playerNames[2] || "Guest3",
        player4: playerNames[3] || "Guest4",
      };

      sessionStorage.setItem(
        "tournamentPlayers",
        JSON.stringify(playerNamesObject)
      );
      console.log("Stored tournament players:", playerNamesObject);

			socketRef.current.emit("create_game", gameType, "local");
			console.log("Emitted create_game event");
			
			setShowPopup(false);

		} catch (error: any) {
			console.error("Error starting tournament:", error);
			alert("Failed to start tournament: " + error.message);
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 text-white p-4">
			<div className="max-w-6xl mx-auto space-y-6">
				
				{/* Header */}
				<header className="text-center py-6">
					<h1 className="text-3xl font-bold text-white mb-2">Tournament Lobby</h1>
					<p className="text-gray-300">
						Join or create tournaments to compete with other players
					</p>
				</header>

				{/* Players Section */}
				<section className="bg-gray-800 rounded-lg border border-gray-600 p-6">
					<h2 className="text-xl font-semibold text-white mb-4">
						Players in Tournament Lobby ({players.length})
					</h2>
					<PlayerList players={players} />
				</section>

				{/* Create Tournament Section */}
				<section className="bg-gray-800 rounded-lg border border-gray-600 p-6">
					<div className="flex flex-col lg:flex-row justify-between items-center gap-4">
				<h2 className="text-xl font-semibold text-white">
					Play on your device
				</h2>

				<button
					onClick={() => setShowPopup(true)}
					className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex-shrink-0"
				>
					Create A Local Tournament
				</button>
				</div>


					{showPopup && (
						<div 
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
							onClick={() => setShowPopup(false)}
						>
							<div 
								className="w-full max-w-md mx-4"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="relative bg-neutral-900/95 text-white rounded-2xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-auto">
									<div className="flex items-start justify-between">
										<h3 className="text-lg font-semibold">Create Local Tournament</h3>
										<button
											onClick={() => setShowPopup(false)}
											aria-label="Close"
											className="ml-3 rounded-md p-1 hover:bg-white/5"
										>
											✕
										</button>
									</div>
									<div className="mt-4">
										<TournamentPlayerForm onStart={handleStartTournament} />
									</div>
								</div>
							</div>
						</div>
					)}
				</section>

				{/* Tournament Lists */}
				<div className="grid md:grid-cols-2 gap-6">
					
					{/* Pong Tournaments */}
					<section className="bg-gray-800 rounded-lg border border-gray-600 p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold text-white">Pong Tournaments</h2>
							<button
								onClick={createRemotePong}
								className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
							>
								Create New
							</button>
						</div>
						
						{pongTournaments.length === 0 ? (
							<div className="text-center py-8 text-gray-400">
								No tournaments available. Create one to get started!
							</div>
						) : (
							<div className="space-y-3">
								{pongTournaments.map(game => (
									<div
										key={game.id}
										className={`
											p-4 border border-gray-600 rounded-lg transition-all bg-gray-700
											${game.status === "waiting" 
												? 'hover:bg-gray-600 cursor-pointer hover:border-green-500' 
												: 'cursor-not-allowed opacity-60'
											}
										`}
										onClick={() => {
											if (game.status === "waiting") joinGame(game.id, "pong", "remote");
										}}
									>
										<div className="flex justify-between items-start mb-3">
											<h4 className="font-medium text-white">
												<strong>Tournament-{game.id}</strong>
											</h4>
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												game.status === 'waiting' ? 'bg-yellow-500 text-black' :
												game.status === 'in-progress' ? 'bg-blue-500 text-white' :
												'bg-gray-600 text-white'
											}`}>
												{game.status}
											</span>
										</div>
										
										<div className="flex justify-between items-center text-sm text-gray-300 mb-3">
											<span>{game.players.length}/4 players</span>
											{game.status === "waiting" && (
												<span className="text-green-400 font-medium">Click to join</span>
											)}
										</div>
										
										{game.players.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{game.players.map(p => (
													<span 
														key={p.socketId}
														className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs border border-gray-500"
													>
														{p.name}
													</span>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</section>

					{/* Key Clash Tournaments */}
					<section className="bg-gray-800 rounded-lg border border-gray-600 p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold text-white">Key Clash Tournaments</h2>
							<button
								onClick={createRemoteKeyClash}
								className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
							>
								Create New
							</button>
						</div>
						
						{keyClashTournaments.length === 0 ? (
							<div className="text-center py-8 text-gray-400">
								No tournaments available. Create one to get started!
							</div>
						) : (
							<div className="space-y-3">
								{keyClashTournaments.map(game => (
									<div
										key={game.id}
										className={`
											p-4 border border-gray-600 rounded-lg transition-all bg-gray-700
											${game.status === "waiting" 
												? 'hover:bg-gray-600 cursor-pointer hover:border-green-500' 
												: 'cursor-not-allowed opacity-60'
											}
										`}
										onClick={() => {
											if (game.status === "waiting") joinGame(game.id, "keyclash", "remote");
										}}
									>
										<div className="flex justify-between items-start mb-3">
											<h4 className="font-medium text-white">
												<strong>Tournament-{game.id}</strong>
											</h4>
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												game.status === 'waiting' ? 'bg-yellow-500 text-black' :
												game.status === 'in-progress' ? 'bg-blue-500 text-white' :
												'bg-gray-600 text-white'
											}`}>
												{game.status}
											</span>
										</div>
										
										<div className="flex justify-between items-center text-sm text-gray-300 mb-3">
											<span>{game.players.length}/4 players</span>
											{game.status === "waiting" && (
												<span className="text-green-400 font-medium">Click to join</span>
											)}
										</div>
										
										{game.players.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{game.players.map(p => (
													<span 
														key={p.socketId}
														className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs border border-gray-500"
													>
														{p.name}
													</span>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</section>
				</div>

			</div>
		</div>
	);
}