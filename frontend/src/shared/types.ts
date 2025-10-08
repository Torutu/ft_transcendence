// frontend/src/shared/types.ts
export interface Player {
	playerId: number | null,
	socketId: string | null,
	name: string | null,
	side: "left" | "right" | null
  }
  
  export interface OnlineUser {
    socketId: string | null;
    name: string | null;
    playerId: number | null;
    status?: string;
  }
  
  export interface GameRoom {
    id: string;
    status: "waiting" | "in-progress" | "finished";  
    players: Player[];
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
    from: { socketId: string | null; name: string | null };
    gameType: "pong" | "keyclash";
    message: string;
    timestamp?: number;
  }
  
  export interface SentInvitation {
    id: string;
    to: { socketId: string | null; name: string | null };
    gameType: "pong" | "keyclash";
    timestamp?: number;
  }
  
  export type GameType = "pong" | "keyclash";