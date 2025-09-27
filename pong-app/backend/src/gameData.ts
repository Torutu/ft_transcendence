import { Player, LobbyState, GameResult } from "./types/lobby";
import PingPongGame from "./PingPongGame";
import { state as KeyClashState } from "./KeyClashGame"
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

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

// Save game result to database
export async function saveGameResult(gameResult: GameResult, prisma: PrismaClient): Promise<void> {
    try {
      const { gameType, mode, player1, player2, winner, duration, rounds, gameId } = gameResult;
      console.log('Saving game result:', { 
        gameResult
      });

      // For local games, only save if one of the players has a playerId
      if (mode === 'local' && !player1.playerId && !player2.playerId) {
        console.log('Cannot save local game where a user is not a participant')
        return;
      }

      // Create game record
      const game = await prisma.game.create({
        data: {
          id_player1: player1.playerId,
          id_player2: player2.playerId,
          game_name: gameType === 'pong' ? 'pingpong' : 'keyclash',
          rounds_json: JSON.stringify({
            gameId,
            mode,
            player1: player1,
            player2: player2,
            duration,
            rounds,
            timestamp: new Date(),
            winner: winner,
            // userWon: userIsPlayer1 ? player1Data.isWinner : (userIsPlayer2 ? player2Data.isWinner : false),
            finalScore: `${player1.score} - ${player2.score}`,
            // userIsPlayer1
          })
        }
      });

      // Update user statistics - only update if it's the authenticated user
      if (player1.playerId) {
        if (player1.isWinner) {
          await prisma.user.update({
            where: { id: player1.playerId },
            data: { wins: { increment: 1 } }
          });
        }
        else {
          await prisma.user.update({
            where: { id: player1.playerId },
            data: { losses: { increment: 1 } }
          });
        }
      }
      if (player2.playerId) {
        if (player2.isWinner) {
          await prisma.user.update({
            where: { id: player2.playerId },
            data: { wins: { increment: 1 } }
          });
        }
        else {
          await prisma.user.update({
            where: { id: player2.playerId },
            data: { losses: { increment: 1 } }
          });
        }
      }

      console.log('Game result saved successfully');
      return ;

    } catch (error) {
      console.log('Failed to save game result', error);
    }
}

// Helper function to create GameResult from game state
export function createGameResult(
  gameId: string,
  gameType: 'pong' | 'keyclash',
  mode: 'local' | 'remote',
  match: { player1: Player, player2: Player, p1score: number, p2score: number, winner: Player | null, duration: number },
  rounds?: any[]
): GameResult {

  return {
    gameId,
    gameType,
    mode,
    player1: {
      username: match.player1.name,
      playerId: match.player1.playerId,
      avatar: "default",
      score: match.p1score,
      isWinner: match.player1 === match.winner
    },
    player2: {
      username: match.player2.name,
      playerId: match.player2.playerId,
      avatar: "default",
      score: match.p2score,
      isWinner: match.player2 === match.winner
    },
    winner: match.winner,
    duration: match.duration,
    rounds: rounds || [],
    timestamp: new Date()
  };
}
