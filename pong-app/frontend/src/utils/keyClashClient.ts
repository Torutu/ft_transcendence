import { NavigateFunction } from "react-router-dom";
import { io } from "socket.io-client";
import validator from 'validator';

export default function KeyClashClient(
	container: HTMLElement,
	gameId: string,
	mode: "local" | "remote",
	type: "1v1" | "tournament",
	navigate: NavigateFunction,
	name: string | null | { player1: string | null, player2: string | null, player3: string | null, player4: string | null },
	playerId: number | null
): () => void {

	const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
	const wasdKeys = ['w', 'a', 's', 'd'];

	const arrowSymbols: Record<string, string> = {
		ArrowUp: '↑',
		ArrowDown: '↓',
		ArrowLeft: '←',
		ArrowRight: '→'
	};

	const wasdSymbols: Record<string, string> = {
		w: '↑',
		a: '←',
		s: '↓',
		d: '→'
	};

	let players: {
		player1: string | null,
		player2: string | null,
		player3: string | null,
		player4: string | null
	};

	if (typeof name === 'object' && name !== null) {
		players = name;
	} else {
		players = { player1: null, player2: null, player3: null, player4: null };
	}

	// Query inside the container instead of the whole document
	const prompt1 = container.querySelector('#prompt1') as HTMLDivElement;
	const prompt2 = container.querySelector('#prompt2') as HTMLDivElement;
	const score1El = container.querySelector('#score1') as HTMLDivElement;
	const score2El = container.querySelector('#score2') as HTMLDivElement;
	const timerEl = container.querySelector('#timer') as HTMLDivElement;
	const startPrompt = container.querySelector('#start-prompt') as HTMLDivElement;
	timerEl.style.whiteSpace = "pre-line";

  // Back Button
  const backButton = document.createElement('button');
  backButton.textContent = '🔙 Back to Lobby'
  backButton.className="absolute top-20 left-60 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md";
  backButton.style.display= 'block';
  document.body.appendChild(backButton);
  backButton.addEventListener('click', () => navigate('/lobby')); 

	const socket = io("/keyclash", {
		path: '/socket.io',
		transports: ['websocket'],
		secure: true
	});

	function onKeyDown(e: KeyboardEvent) {
		if (e.code === "Space" || e.key === "r")
			socket.emit("setReady");
		else if (arrowKeys.includes(e.key) || wasdKeys.includes(e.key))
			socket.emit("keypress", { key: e.key });
	}

	window.addEventListener("keydown", onKeyDown);

	socket.on('connect', () => {
		socket.emit('join_game_room', gameId, mode, type, playerId, (callback: { error: string }) => {
			if (callback.error) {
				alert(callback.error);
				if (type === "1v1")
					navigate("/quickmatch");
				else
					navigate("/tournament");
			}
		});
	});

	socket.on("get_names", (existing) => {
		// if (existing.length >= 1)
		// 	players.player1 = existing[0].name;
		// if (existing.length >= 2)
		// 	players.player2 = existing[1].name;
		// if (existing.length >= 3)
		// 	players.player3 = existing[2].name;
		// if (existing.length >= 4)
		// 	players.player4 = existing[3].name;

		if (typeof name === 'string' && name) {
			players.player1 = name;
		} else if (!players.player1 && !name) {
			players.player1 = getValidatedPlayerName("Enter name for player1:", "Guest", players);
		}

		if (mode === "local") {
			if (!players.player2) {
				players.player2 = getValidatedPlayerName("Enter name for player2:", "Guest", players);
			}
			if (type === "tournament") {
				if (!players.player3) {
					players.player3 = getValidatedPlayerName("Enter name for player3:", "Guest", players);
				}
				if (!players.player4) {
					players.player4 = getValidatedPlayerName("Enter name for player4:", "Guest", players);
				}
			}
		}
		socket.emit("names", players);
	});

	socket.on("gameStart", (state) => {
    backButton.style.display = "none";
		score1El.textContent = `${state.player1.name}: ${state.player1.score}`;
		score2El.textContent = `${state.player2.name}: ${state.player2.score}`;
		if (state.type === "1v1")
			timerEl.textContent = `Time Left: ${state.timeLeft}s`;
		else
			timerEl.textContent = `Round ${state.round}/3\nTime Left: ${state.timeLeft}s`;
		prompt1.textContent = wasdSymbols[state.prompts[0]];
		prompt2.textContent = arrowSymbols[state.prompts[1]];
		startPrompt.textContent = "Good Luck!";
	});

	socket.on("gameState", (state) => {
		score1El.textContent = `${state.player1.name}: ${state.player1.score}`;
		score2El.textContent = `${state.player2.name}: ${state.player2.score}`;
    if (state.status === "in-progress")
      backButton.style.display = "none";
    else
      backButton.style.display = "block";
		if (state.status === "in-progress" || state.status === "starting") {
			if (state.type === "1v1")
				timerEl.textContent = `Time Left: ${state.timeLeft}s`;
			else
				timerEl.textContent = `Round ${state.round}/3\nTime Left: ${state.timeLeft}s`;
		}
		if (state.type === "tournament" && state.status === "starting" && state.round === 1) {
			timerEl.textContent = `Next up, Round ${state.round}/3:\n${state.matches[0].player1.name} vs ${state.matches[0].player2.name}`;
			if (state.mode === "local") startPrompt.textContent = "Press SPACE to start the tournament!";
		}
		prompt1.textContent = wasdSymbols[state.prompts[0]];
		prompt2.textContent = arrowSymbols[state.prompts[1]];
		if (((state.players.length === 2 && state.type === "1v1") ||
			(state.type === "tournament")) &&
			state.status === "starting" && state.mode === "remote") {
			let readyCount = 0;
			if (state.player1.ready) readyCount++;
			if (state.player2.ready) readyCount++;
			startPrompt.textContent = `Ready? Press SPACE (Players ready: ${readyCount}/2)`;
		}
	});

	socket.on("waiting", (state) => {
		if (state.type === "1v1")
			startPrompt.textContent = "Waiting for opponent...";
		else
			startPrompt.textContent = `Waiting for opponents... (${state.players.length}/4)`;
	});

	socket.on("gameOver", (state) => {
		let p1 = state.player1;
		let p2 = state.player2;
		if (state.type === "1v1") {
			timerEl.textContent = `Time's Up! Final Score ${p1.name}: ${p1.score} | ${p2.name}: ${p2.score}`;
			startPrompt.textContent = "Press SPACE to Restart";
      backButton.style.display = "block";
		}
		else if (state.type === "tournament") {
			const i = state.round - 2;
			if (state.round <= 3) {
				timerEl.textContent = `Round ${state.round - 1} over, ${state.matches[i].winner.name} wins!`;
				timerEl.textContent += `\nNext up, Round ${state.round}/3:\n${state.matches[i + 1].player1.name} vs ${state.matches[i + 1].player2.name}`;
				if (mode === "remote") {
					let readyCount = 0;
					if (state.player1.ready) readyCount++;
					if (state.player2.ready) readyCount++;
					startPrompt.textContent = `Ready? Press SPACE (Players ready: ${readyCount}/2)`;
				}
				else
					startPrompt.textContent = "Press SPACE to start next round";
			}
			else {
				timerEl.textContent = `Tournament finished! The winner is: ${state.matches[i].winner.name}!`;
				startPrompt.textContent = "Congratulations!";
        backButton.style.display = "block";
			}
		}
	});

	socket.on("correctHit", ({ player }) => {
		const el = container.querySelector(
			player === 1 ? ".player:nth-child(1)" : ".player:nth-child(2)"
		);
		if (el) {
			el.classList.add("correct");
			setTimeout(() => el.classList.remove("correct"), 300);
		}
	});

	socket.on('disconnection', () => {
		alert("Tournament terminated (someone disconnected)");
		navigate('/tournament');
	});

	// Return cleanup function
	return () => {
    if (backButton.parentNode) backButton.parentNode.removeChild(backButton);
		window.removeEventListener("keydown", onKeyDown);
		if (socket) {
			socket.off();
			socket.disconnect();
		}
	};
}

export function getValidatedPlayerName(message: string, placeholder: string, existing: {
	player1: string | null,
	player2: string | null,
	player3: string | null,
	player4: string | null
}) {

	let name = prompt(message, placeholder);
	if (!name) {
		alert("Name can't be empty");
		return getValidatedPlayerName(message, placeholder, existing);
	}
	name = name.trim();
	if (!validator.isLength(name, { min: 1, max: 13 })) {
		alert("Name must be between 1-10 characters long");
		return getValidatedPlayerName(message, placeholder, existing);
	}
	if (!validator.isAlphanumeric(name)) {
		alert("Name must be alphanumeric");
		return getValidatedPlayerName(message, placeholder, existing);
	}
	if (name === existing.player1 || name === existing.player2 ||
		name === existing.player3 || name === existing.player3) {
		alert("That name is already taken");
		return getValidatedPlayerName(message, placeholder, existing);
	}
	return name;
}