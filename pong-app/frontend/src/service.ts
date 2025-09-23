// frontend/src/service.ts

interface DuelGameData {
  user: string;
  userAvatar: string;
  guest: string;
  guestAvatar: string;
  userColor?: string;
  guestColor?: string;
  gameType: string;
}

export const startDuelGame = async (gameData: DuelGameData): Promise<void> => {
  try {
    // For now, we'll just simulate the database call
    // In your friend's approach, this would save to database
    console.log('Starting duel game with data:', gameData);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Store game session data in localStorage for persistence (friend's approach)
    localStorage.setItem('currentGameSession', JSON.stringify({
      player1: gameData.user,
      player1Avatar: gameData.userAvatar,
      player2: gameData.guest,
      player2Avatar: gameData.guestAvatar,
      gameType: gameData.gameType,
      userColor: gameData.userColor,
      guestColor: gameData.guestColor,
      startedAt: new Date().toISOString()
    }));

    return Promise.resolve();
    
    // If you have a backend endpoint, uncomment and use this instead:
    /*
    const response = await fetch('/api/games/start-duel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ping-pong-jwt')}`
      },
      body: JSON.stringify(gameData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to start game');
    }

    return await response.json();
    */
  } catch (error) {
    console.error('Error starting duel game:', error);
    throw error;
  }
};