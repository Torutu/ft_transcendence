// frontend/src/utils/gameDataManager.ts
import api from './api';

export interface GameResult {
  gameId: string;
  gameType: 'pong' | 'keyclash';
  mode: 'local' | 'remote';
  player1: {
    username: string;
    avatar: string;
    score: number;
    isWinner: boolean;
  };
  player2: {
    username: string;
    avatar: string;
    score: number;
    isWinner: boolean;
  };
  duration: number; // in seconds
  rounds?: any[]; // detailed round data
  timestamp: Date;
}

export interface PlayerStats {
  username: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  currentStreak: number;
  memberSince: string;
}

export interface Match {
  id: string;
  gameType: string;
  opponent: string;
  result: 'win' | 'loss';
  score: string;
  duration: string;
  date: string;
  mode: string;
}

export interface DetailedMatch {
  id: number;
  gameType: string;
  date: string;
  gameId: string;
  mode: string;
  player1: any;
  player2: any;
  duration: number;
  rounds: any[];
  timestamp: string;
  winner: string;
  userWon: boolean;
  finalScore: string;
}

// Save game result to database
export async function saveGameResult(gameResult: GameResult): Promise<void> {
  try {
    console.log('Saving game result:', gameResult);
    
    const response = await api.post('/games/save', {
      gameType: gameResult.gameType,
      mode: gameResult.mode,
      player1Data: gameResult.player1,
      player2Data: gameResult.player2,
      duration: gameResult.duration,
      rounds: gameResult.rounds || [],
      gameId: gameResult.gameId
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to save game result');
    }

    console.log('✅ Game result saved successfully');
  } catch (error: any) {
    console.error('❌ Error saving game result:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to save game result';
    throw new Error(errorMessage);
  }
}

// Get player statistics - FIXED ENDPOINT
export async function getPlayerStats(username?: string): Promise<PlayerStats> {
  try {
    const endpoint = username ? `/games/stats/${username}` : '/games/stats';
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch player stats:', error);
    throw error;
  }
}

// Get recent matches - FIXED ENDPOINT
export async function getRecentMatches(limit: number = 10): Promise<Match[]> {
  try {
    const response = await api.get(`/games/recent-matches?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch recent matches:', error);
    throw error;
  }
}

// Get match details - FIXED ENDPOINT
export async function getMatchDetails(matchId: string): Promise<DetailedMatch> {
  try {
    const response = await api.get(`/games/matches/${matchId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch match details:', error);
    throw error;
  }
}


// Helper function to create GameResult from game state
export function createGameResult(
  gameId: string,
  gameType: 'pong' | 'keyclash',
  mode: 'local' | 'remote',
  player1Name: string,
  player1Avatar: string,
  player1Score: number,
  player2Name: string,
  player2Avatar: string,
  player2Score: number,
  duration: number,
  rounds?: any[]
): GameResult {
  const player1IsWinner = player1Score > player2Score;
  
  return {
    gameId,
    gameType,
    mode,
    player1: {
      username: player1Name,
      avatar: player1Avatar,
      score: player1Score,
      isWinner: player1IsWinner
    },
    player2: {
      username: player2Name,
      avatar: player2Avatar,
      score: player2Score,
      isWinner: !player1IsWinner
    },
    duration,
    rounds: rounds || [],
    timestamp: new Date()
  };
}

// Helper function to determine if current user won
export function didUserWin(gameResult: GameResult, currentUsername: string): boolean {
  if (gameResult.player1.username === currentUsername) {
    return gameResult.player1.isWinner;
  } else if (gameResult.player2.username === currentUsername) {
    return gameResult.player2.isWinner;
  }
  return false; // User not in this game
}

// Helper function to get opponent name
export function getOpponentName(gameResult: GameResult, currentUsername: string): string {
  if (gameResult.player1.username === currentUsername) {
    return gameResult.player2.username;
  } else if (gameResult.player2.username === currentUsername) {
    return gameResult.player1.username;
  }
  return 'Unknown';
}

// Helper function to format duration
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}