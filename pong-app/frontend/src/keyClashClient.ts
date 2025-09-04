import { NavigateFunction } from "react-router-dom";
import { io } from "socket.io-client";

export default function KeyClashClient(container: HTMLElement, gameId: string, 
                                        mode: "local" | "remote", 
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
      if (!name)
        name = prompt("Enter name for player1:", "Guest");
      let player2: string | null = null;
      if (mode === "local")
        player2 = prompt("Enter name for player2:", "Guest");
      socket.emit('join_game_room', gameId, mode, name, player2, (callback: { error: string }) => {
        if (callback.error) {
          alert(callback.error);          
          navigate("/lobby");
        }
      });
  });

  socket.on("gameStart", (state) => {
    score1El.textContent = `${state.player1.name}: ${state.player1.score}`;
    score2El.textContent = `${state.player2.name}: ${state.player2.score}`;
    timerEl.textContent = `Time Left: ${state.timeLeft}s`;
    prompt1.textContent = wasdSymbols[state.prompts[0]];
    prompt2.textContent = arrowSymbols[state.prompts[1]];
    startPrompt.textContent = "Good Luck!";
  });

  socket.on("gameState", (state) => {
    score1El.textContent = `${state.player1.name}: ${state.player1.score}`;
    score2El.textContent = `${state.player2.name}: ${state.player2.score}`;
    timerEl.textContent = `Time Left: ${state.timeLeft}s`;
    prompt1.textContent = wasdSymbols[state.prompts[0]];
    prompt2.textContent = arrowSymbols[state.prompts[1]] ;
    if (Object.keys(state.players).length === 2 && 
        state.status !== "in-progress" && state.mode === "remote")
    {
      let readyCount = 0;
      if (state.player1.ready) readyCount++;
      if (state.player2.ready) readyCount++;
      startPrompt.textContent = `Ready? Press SPACE (Players ready: ${readyCount}/2)`;
    }
  });

  socket.on("waiting", () => {
    startPrompt.textContent = "Waiting for opponent...";
  })

  socket.on("gameOver", (state) => {
    const p1 = state.player1;
    const p2 = state.player2;
    timerEl.textContent = `Time's Up! Final Score ${p1.name}: ${p1.score} | ${p2.name}: ${p2.score}`;
    startPrompt.textContent = "Press SPACE to Restart";
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
  // Return cleanup function
  return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (socket) {
        socket.off();
        socket.disconnect();
      }
  };
}