import { Player, LobbyState } from "./types/lobby";
import PingPongGame from "./PingPongGame";
import { state as KeyClashState } from "./KeyClashGame"

export const playersOnline: Player[] = [];
export const pongRooms: PingPongGame[] = [];
export const keyClashRooms: KeyClashState[] = [];

export function getLobbyState(): LobbyState {
  return {
    players: playersOnline,
    pongGames: pongRooms.map(g => ({
        id: g.getId(),
        status: g.state.status,
        players: g.state.players
        })),
    keyClashGames: keyClashRooms.map(g => ({
      id: g.id,
      status: g.status,
      players: g.players,
      p1: g.p1,
      p2: g.p2
      })),
  }
};
