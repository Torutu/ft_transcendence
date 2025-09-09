import { NavigateFunction } from "react-router-dom";
import { io } from "socket.io-client";

export default function KeyClashClient(container: HTMLElement, gameId: string, 
                                        mode: "local" | "remote", type: "1v1" | "tournament",
                                        navigate: NavigateFunction, name: string | null):() => void {
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

  // Query inside the container instead of the whole document
  const prompt1 = container.querySelector('#prompt1') as HTMLDivElement;
  const prompt2 = container.querySelector('#prompt2') as HTMLDivElement;
  const score1El = container.querySelector('#score1') as HTMLDivElement;
  const score2El = container.querySelector('#score2') as HTMLDivElement;
  const timerEl = container.querySelector('#timer') as HTMLDivElement;
  const startPrompt = container.querySelector('#start-prompt') as HTMLDivElement;
  timerEl.style.whiteSpace = "pre-line";

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
    let players: { player1: string | null,
      player2: string | null,
      player3: string | null,
      player4: string | null
    }
    players = { player1: null, player2: null, player3: null, player4: null};
    if (!name)
      name = prompt("Enter name for player1:", "Guest");
    players.player1 = name;
    if (mode === "local") {
      players.player2 = prompt("Enter name for player2:", "Guest");
      if (type === "tournament") {
        players.player3 = prompt("Enter name for player3:", "Guest");
        players.player4 = prompt("Enter name for player4:", "Guest");
      }
    }
    socket.emit('join_game_room', gameId, mode, type, players, (callback: { error: string }) => {
      if (callback.error) {
        alert(callback.error);
        if (type === "1v1")
          navigate("/lobby");
        else
          navigate("tournament_lobby");
      }
    });
  });

  socket.on("gameStart", (state) => {
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
    if (state.status === "in-progress") {
      if (state.type === "1v1")
        timerEl.textContent = `Time Left: ${state.timeLeft}s`;
      else
        timerEl.textContent = `Round ${state.round}/3\nTime Left: ${state.timeLeft}s`;        
    }
    if (state.type === "tournament" && state.status === "starting" && state.round === 1) {
      timerEl.textContent = `Next up: ${state.matches[0].player1.name} vs ${state.matches[0].player2.name}`;
      if (state.mode === "local") startPrompt.textContent = "Press SPACE to start the tournament!";
    }
    prompt1.textContent = wasdSymbols[state.prompts[0]];
    prompt2.textContent = arrowSymbols[state.prompts[1]] ;
    if (((state.players.length === 2 && state.type === "1v1") || 
        (state.players.length === 4 && state.type === "tournament")) &&
        state.status !== "in-progress" && state.mode === "remote") //starting
    {
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
    }
    else if (state.type === "tournament") {
      const i = state.round - 2;
      if (state.round <= 3) {
        timerEl.textContent = `Round ${state.round - 1} over! ${state.matches[i].winner.name} wins!`;        
        timerEl.textContent += `\nNext up: ${state.matches[i + 1].player1.name} vs ${state.matches[i + 1].player2.name}`;
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
    navigate('/tournament_lobby');
  });

  // Return cleanup function
  return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (socket) {
        socket.off();
        socket.disconnect();
      }
  };
}