// frontend/src/utils/gameDataManager.ts
import api from './api';

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
