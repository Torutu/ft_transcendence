// src/types/lobby.ts
export interface Player {
    playerId: number | null, socketId: string | null, name: string | null, side: "left" | "right" | null   
};
  
export interface pongGame {
    id: string;
    players: Player[];
    status: "waiting" | "in-progress" | "finished" | "paused" | "starting";
}

export interface keyClashGame {
  id: string;
  players: {},
  status: "waiting" | "starting" | "in-progress" | "finished";
}

export interface LobbyState {
    players: Player[];
    pongGames: pongGame[];
    keyClashGames: keyClashGame[];
}

export interface GameResult {
    gameId: string;
    gameType: 'pong' | 'keyclash';
    mode: 'local' | 'remote';
    player1: {
      username: string | null;
      playerId: number | null;
      avatar: string;
      score: number;
      isWinner: boolean;
    };
    player2: {
      username: string | null;
      playerId: number | null;
      avatar: string;
      score: number;
      isWinner: boolean;
    };
    winner: Player | null;
    duration: number; // in seconds
    rounds?: any[]; // detailed round data
    timestamp: Date;
  }
  