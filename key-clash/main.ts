// Define keys
const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const wasdKeys = ['w', 'a', 's', 'd'];

let score1 = 0;
let score2 = 0;
let timeLeft = 20;

const prompt1 = document.getElementById('prompt1')!;
const prompt2 = document.getElementById('prompt2')!;
const score1El = document.getElementById('score1')!;
const score2El = document.getElementById('score2')!;
const timerEl = document.getElementById('timer')!;
const startPrompt = document.getElementById('start-prompt')!;

let currentKey1 = '';
let currentKey2 = '';
let gameRunning = false;
let interval: number;

// Generate a new random key for a specific player
function getRandomKey(keys: string[]): string {
  return keys[Math.floor(Math.random() * keys.length)];
}

// Update prompt for a specific player
function updatePlayerPrompt(player: number) {
  const promptElement = player === 1 ? prompt1 : prompt2;
  
  // Remove show class to reset animation
  promptElement.classList.remove('show');
  
  // Force reflow to ensure animation restarts
  void promptElement.offsetWidth;
  
  // Update content
  if (player === 1) {
    currentKey1 = getRandomKey(arrowKeys);
    promptElement.textContent = currentKey1.replace('Arrow', '');
  } else {
    currentKey2 = getRandomKey(wasdKeys);
    promptElement.textContent = currentKey2.toUpperCase();
  }
  
  // Trigger animation
  promptElement.classList.add('show');
}

// Reset game state
function resetGame() {
  score1 = 0;
  score2 = 0;
  timeLeft = 20;
  gameRunning = false;
  
  score1El.textContent = `Score: ${score1}`;
  score2El.textContent = `Score: ${score2}`;
  timerEl.textContent = `Time Left: ${timeLeft}s`;
  prompt1.textContent = '-';
  prompt2.textContent = '-';
  startPrompt.textContent = 'Press SPACE to Start';
}

// Start the game
function startGame() {
  gameRunning = true;
  startPrompt.textContent = 'Good Luck!';
  
  // Initialize first prompts
  setTimeout(() => {
    updatePlayerPrompt(1);
    updatePlayerPrompt(2);
  }, 50);
  
  interval = setInterval(() => {
    if (!gameRunning) return;

    timeLeft--;
    timerEl.textContent = `Time Left: ${timeLeft}s`;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// End the game
function endGame() {
  gameRunning = false;
  clearInterval(interval);
  prompt1.textContent = '-';
  prompt2.textContent = '-';
  timerEl.textContent = `Time's Up! Final Score — P1: ${score1} | P2: ${score2}`;
  startPrompt.textContent = 'Press SPACE to Restart';
}

// Handle key presses
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !gameRunning) {
    resetGame();
    startGame();
    return;
  }

  if (!gameRunning) return;

  // Player 1 input (Arrow keys)
if (arrowKeys.includes(e.key)) {
    e.preventDefault();
    if (e.key === currentKey1) {
      score1++;
      score1El.textContent = `Score: ${score1}`; 
      // Flash animation for Player 1 (add this)
      document.querySelector('.player:nth-child(2)')?.classList.add('correct');
      setTimeout(() => {
        document.querySelector('.player:nth-child(2)')?.classList.remove('correct');
      }, 300);
      
      updatePlayerPrompt(1);
    } else {
      score1--;
      score1El.textContent = `Score: ${score1}`;
    }
  }

  // Player 2 input (WASD)
  if (wasdKeys.includes(e.key.toLowerCase())) {
    e.preventDefault();
    if (e.key.toLowerCase() === currentKey2) {
      score2++;
      score2El.textContent = `Score: ${score2}`;
      
      // Flash animation for Player 2 (add this)
      document.querySelector('.player:nth-child(1)')?.classList.add('correct');
      setTimeout(() => {
        document.querySelector('.player:nth-child(1)')?.classList.remove('correct');
      }, 300);
      
      updatePlayerPrompt(2);
    } else {
      score2--;
      score2El.textContent = `Score: ${score2}`;
    }
  }
});

// Initialize game
resetGame();