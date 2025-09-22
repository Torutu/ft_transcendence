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