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

export default function TournamentPage() {
	const socketRef = useRef<Socket | null>(null);
	const navigate = useNavigate();
	const [players, setPlayers] = useState<Player[]>([]);
	const [pongTournaments, setPongTournaments] = useState<GameRoom[]>([]);
	const [keyClashTournaments, setKeyClashTournaments] = useState<GameRoom[]>([]);
	const { user } = useAuth();
	let name: string | null = null;
	let playerId: number | null = null;

	// Game creation forms
	const overlay = document.getElementById("overlay");
	const popupDialog = document.getElementById("popupDialog");

	useEffect(() => {
		socketRef.current = io("/tournament", {
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
			setPongTournaments(data.pongGames);
			setKeyClashTournaments(data.keyClashGames)
		});

		socketRef.current.on("created_game", (gameId, game, mode) => {
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
        
      		} catch (error) {
        		console.error("❌ Error in created_game handler:", error);
        		alert("Navigation failed: " + error.message);
      		}
		})

		socketRef.current.on("joined_game", (gameId, game, mode) => {
			socketRef.current?.disconnect();
			socketRef.current = null;
			const type = "tournament";
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

	const joinGame = (gameId: string, game: "pong" | "keyclash", mode: "local" | "remote") => {
		socketRef.current?.emit("join_game", gameId, game, mode, (res: { error: string }) => {
			if (res.error) alert(res.error);
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
				player1: user?.username || "You",
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

	const popup = () => {
		if (overlay) overlay.style.display = "block";
    	if (popupDialog) popupDialog.style.display = "block";
    };
	const popdown = () => {
		if (overlay) overlay.style.display = "none";
    	if (popupDialog) popupDialog.style.display = "none";
    };

	return (
		<div style={{ padding: "1rem" }}>
			<h2>Players in Tournament Lobby ({players.length})</h2>
			<ul>
				{players.map(p => <li key={p.socketId}>{p.name}</li>)}
			</ul>

			<div>
				<button onClick={popup}>Create A Local Tournament</button>
				<div id="overlay"></div>
    			<div id="popupDialog">
					<TournamentPlayerForm onStart={handleStartTournament} />
					<button onClick={popdown}>Close</button>
				</div>
			</div>

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
							{game.players.map(p => <li key={p.socketId}>{p.name}</li>)}
						</ul>
					</li>
				))}
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
							{game.players.map(p => <li key={p.socketId}>{p.name}</li>)}
						</ul>
					</li>
				))}
				<ul>
					<button onClick={createRemoteKeyClash}>Create New Remote Key Clash Tournament</button>
				</ul>
			</ul>
		</div>
	);
}
