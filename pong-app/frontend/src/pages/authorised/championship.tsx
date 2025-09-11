import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";

interface Player {
	id: string;
	name: string;
}
interface PongRoom {
	id: string;
	status: "waiting" | "in-progress" | "finished";  
	players: { id: string, name: string }[];
}

interface KeyClashRoom {
	id: string,
	status: "waiting" | "in-progress" | "finished";  
	players: Record<string, number>;
	p1: string,
	p2: string
}

export default function ChampionshipPage() {
	const socketRef = useRef<Socket | null>(null);
	const navigate = useNavigate();
	const [players, setPlayers] = useState<Player[]>([]);
	const [pongGames, setPongGames] = useState<PongRoom[]>([]);
	const [keyClashGames, setKeyClashGames] = useState<KeyClashRoom[]>([]);
	const { user } = useAuth();
	let name: string | null = null;

	useEffect(() => {
		socketRef.current = io("/lobby", {
			path: "/socket.io",
			transports: ["websocket"],
			secure: true
		});

		socketRef.current.on("connect", () => {
			if (user)
				name = user.name;
			socketRef.current.emit("name", name);
		});

		socketRef.current.on("lobby_update", (data) => {
			setPlayers(data.players);
			setPongGames(data.pongGames);
			setKeyClashGames(data.keyClashGames)
		});

		socketRef.current.on("created_game", (gameId, game, mode) => {
			joinGame(gameId, game, mode);
		})

		socketRef.current.on("joined_game", (gameId, game, mode) => {
			socketRef.current?.disconnect();
			socketRef.current = null;
			navigate(`/${game}/${mode}/${gameId}`, { state: { name: name } });
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
			<h2>Players in Lobby ({players.length})</h2>
			<ul>
				{players.map(p => <li key={p.id}>{p.name}</li>)}
			</ul>

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
						<strong>Room-{game.id}</strong> — {game.players.length} players  — {game.status}
						<ul>
							{game.players.map(p => <li key={p.id}>{p.name}</li>)}
						</ul>
					</li>
				))}
				<ul>
					<button onClick={createLocalPong}>Create New Local Pong Game</button>
				</ul>
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
						<strong>Room-{game.id}</strong> — {Object.keys(game.players).length} players — {game.status}
						<ul>
							<li>{game.p1}</li>
							<li>{game.p2}</li>
						</ul>
					</li>
				))}      
				<ul>
				<button onClick={createLocalKeyClash}>Create New Local Key Clash Game</button>
				</ul>
				<ul>
					<button onClick={createRemoteKeyClash}>Create New Remote Key Clash Game</button> 
				</ul>                     
			</ul>
		</div>
	);
}
