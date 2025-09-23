// frontend/src/shared/types.ts
export interface Player {
  socketId: string;
  name: string;
}

export interface OnlineUser {
  socketId: string;
  name: string;
  status?: string;
}

export interface GameRoom {
  id: string;
  status: "waiting" | "in-progress" | "finished";  
  players: { id: string, name: string }[];
}

export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
}

export interface AvatarData {
  name: string;
  image: string;
}

export interface Invitation {
  id: string;
  from: { socketId: string; name: string };
  gameType: "pong" | "keyclash";
  message: string;
  timestamp?: number;
}

export interface SentInvitation {
  id: string;
  to: { socketId: string; name: string };
  gameType: "pong" | "keyclash";
  timestamp?: number;
}

export type GameType = "pong" | "keyclash";
export type GameMode = "local" | "remote";


export interface GameRound {
  roundNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  player1Score: number;
  player2Score: number;
  winner?: string;
  events?: GameEvent[];
}

export interface GameEvent {
  type: 'point' | 'fault' | 'timeout' | 'round_start' | 'round_end';
  player: 'player1' | 'player2';
  timestamp: number;
  details?: string;
}

export interface GameSaveData {
  gameType: 'pong' | 'keyclash';
  mode: 'local' | 'remote';
  player1Data: {
    username: string;
    avatar: string;
    score: number;
    isWinner: boolean;
  };
  player2Data: {
    username: string;
    avatar: string;
    score: number;
    isWinner: boolean;
  };
  duration: number;
  rounds: GameRound[];
  gameId: string;
  timestamp?: string;
  winner?: string;
  finalScore?: string;
  userIsPlayer1?: boolean;
  cancelled?: boolean;
  cancelledBy?: string;
}