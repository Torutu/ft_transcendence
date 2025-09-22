// pong-app/backend/src/gameData.ts
import { Player, LobbyState } from "./types/lobby";
import PingPongGame from "./PingPongGame";
import { state as KeyClashState } from "./KeyClashGame"

export const playersOnline: Player[] = [];
export const pongRooms: PingPongGame[] = [];
export const keyClashRooms: KeyClashState[] = [];

export const playersOnlineTournament: Player[] = [];
export const pongTournaments: PingPongGame[] = [];
export const keyClashTournaments: KeyClashState[] = [];

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
      players: g.players
      })),
  }
};

export function getTournamentLobbyState(): LobbyState {
  return {
    players: playersOnlineTournament,
    pongGames: pongTournaments.map(g => ({
        id: g.getId(),
        status: g.state.status,
        players: g.state.players
        })),
    keyClashGames: keyClashTournaments.map(g => ({
      id: g.id,
      status: g.status,
      players: g.players
      })),
  }
};