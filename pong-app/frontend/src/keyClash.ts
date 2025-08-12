export default function initKeyClash(container: HTMLElement): () => void {
  const p1 = "Guest1";
  const p2 = "Guest2";
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

  let score1 = 0, score2 = 0, timeLeft = 20;
  let currentKey1 = '', currentKey2 = '';
  let gameRunning = false, interval: number;

  function getRandomKey(keys: string[]) {
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function updatePlayerPrompt(player: number) {
    const promptElement = player === 1 ? prompt1 : prompt2;
    promptElement.classList.remove('show');
    void promptElement.offsetWidth; // restart animation

    if (player === 1) {
      currentKey1 = getRandomKey(arrowKeys);
      promptElement.textContent = arrowSymbols[currentKey1];
    } else {
      currentKey2 = getRandomKey(wasdKeys);
      promptElement.textContent = wasdSymbols[currentKey2.toLowerCase()];
    }

    promptElement.classList.add('show');
  }

  function resetGame() {
    score1 = score2 = 0;
    timeLeft = 20;
    gameRunning = false;
    score1El.textContent = `Score: ${score1}`;
    score2El.textContent = `Score: ${score2}`;
    timerEl.textContent = `Time Left: ${timeLeft}s`;
    prompt1.textContent = '-';
    prompt2.textContent = '-';
    startPrompt.textContent = 'Press SPACE to Start';
  }

  function startGame() {
    gameRunning = true;
    startPrompt.textContent = 'Good Luck!';
    setTimeout(() => {
      updatePlayerPrompt(1);
      updatePlayerPrompt(2);
    }, 50);

    interval = window.setInterval(() => {
      if (!gameRunning) return;
      timeLeft--;
      timerEl.textContent = `Time Left: ${timeLeft}s`;
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  function endGame() {
    gameRunning = false;
    clearInterval(interval);
    prompt1.textContent = '-';
    prompt2.textContent = '-';
    timerEl.textContent = `Time's Up! Final Score ${p2}: ${score2} | ${p1}: ${score1}`;
    startPrompt.textContent = 'Press SPACE to Restart';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !gameRunning) {
      resetGame();
      startGame();
      return;
    }
    if (!gameRunning) return;

    if (arrowKeys.includes(e.key)) {
      e.preventDefault();
      if (e.key === currentKey1) {
        score1++;
        score1El.textContent = `Score: ${score1}`;
        container.querySelector('.player:nth-child(2)')?.classList.add('correct');
        setTimeout(() => {
          container.querySelector('.player:nth-child(2)')?.classList.remove('correct');
        }, 300);
        updatePlayerPrompt(1);
      } else {
        score1--;
        score1El.textContent = `Score: ${score1}`;
      }
    }

    if (wasdKeys.includes(e.key.toLowerCase())) {
      e.preventDefault();
      if (e.key.toLowerCase() === currentKey2) {
        score2++;
        score2El.textContent = `Score: ${score2}`;
        container.querySelector('.player:nth-child(1)')?.classList.add('correct');
        setTimeout(() => {
          container.querySelector('.player:nth-child(1)')?.classList.remove('correct');
        }, 300);
        updatePlayerPrompt(2);
      } else {
        score2--;
        score2El.textContent = `Score: ${score2}`;
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);
  resetGame();

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    clearInterval(interval);
  };
}
