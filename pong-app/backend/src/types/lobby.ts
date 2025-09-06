// src/types/lobby.ts
export interface Player {
    id: string | null;
    name: string | null;
}
  
export interface pongGame {
    id: string;
    players: { id: string | null, name: string | undefined, side: "left" | "right" | null }[];
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
  