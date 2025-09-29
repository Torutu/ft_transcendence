// backend/src/routes/gameRoutes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface AuthenticatedUser {
  userId: number;
  username: string;
}

export default function gameRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // Helper function to get authenticated user
  const getAuthenticatedUser = (request: FastifyRequest): AuthenticatedUser => {
    return (request as any).user as AuthenticatedUser;
  };

  // Authentication middleware
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.authToken;
    
    if (!token) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const decoded = fastify.jwt.verify(token) as { userId: number; username: string };
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.userId },
        select: { id: true, username: true }
      });
      
      if (!user) {
        return reply.status(401).send({ message: 'User not found' });
      }
      
      (request as any).user = { userId: user.id, username: user.username };
    } catch (err) {
      return reply.status(401).send({ message: 'Invalid token' });
    }
  };

  fastify.addHook('preHandler', authenticate);

  // Get player statistics
  fastify.get('/stats/:username?', async (request, reply) => {
    try {
      const user = getAuthenticatedUser(request);
      const { username } = request.params as { username?: string };
      
      const targetUser = username || user.username;

      const userStats = await prisma.user.findUnique({
        where: { username: targetUser },
        select: {
          username: true,
          wins: true,
          losses: true,
          createdAt: true
        }
      });

      if (!userStats) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Get recent games for additional stats
      const recentGames = await prisma.game.findMany({
        where: {
            OR: [
                { id_player1: user.userId },
                { id_player2: user.userId },
            ],
        },
        orderBy: { date: 'desc' },
        take: 50
      });

      // Calculate additional statistics
      const totalMatches = userStats.wins + userStats.losses;
      const winRate = totalMatches > 0 ? (userStats.wins / totalMatches) * 100 : 0;

      // Calculate current win streak
      let currentStreak = 0;
      for (const game of recentGames) {
        try {
          const gameData = JSON.parse(game.rounds_json);
          if (gameData.winner.playerId === user.userId) {
            currentStreak++;
          } else {
            break;
          }
        } catch (e) {
          break;
        }
      }

      return reply.send({
        username: userStats.username,
        wins: userStats.wins,
        losses: userStats.losses,
        totalMatches,
        winRate: Math.round(winRate * 10) / 10,
        currentStreak,
        memberSince: userStats.createdAt
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch player stats' });
    }
  });

  // Get recent matches
  // Replace the recent-matches endpoint in gameRoutes.ts with this:

// Get recent matches
fastify.get('/recent-matches', async (request, reply) => {
  try {
    const user = getAuthenticatedUser(request);
    const { limit = 20 } = request.query as { limit?: number };

    const games = await prisma.game.findMany({
        where: {
            OR: [
                { id_player1: user.userId },
                { id_player2: user.userId },
            ],
        },
      orderBy: { date: 'desc' },
      take: Number(limit)
    });

    const matches = games.map(game => {
      try {
        const gameData = JSON.parse(game.rounds_json);
        
        const userIsPlayer1 = gameData.player1.playerId === user.userId;
        const userPlayer = userIsPlayer1 ? gameData.player1 : gameData.player2;
        const opponentPlayer = userIsPlayer1 ? gameData.player2 : gameData.player1;
        let result = "tie";
        if (gameData.winner)
            result = gameData.winner.playerId === user.userId ? 'win' : 'loss';

        // Extract actual scores
        // let userScore = userPlayer.score;
        // let opponentScore = opponentPlayer.score;
        // let displayScore = gameData.finalScore;

        // if (gameData.finalScore) {
        //   displayScore = gameData.finalScore;
        //   const scores = gameData.finalScore.split('-');
        //   if (scores.length === 2) {
        //     userScore = parseInt(scores[0]) || 0;
        //     opponentScore = parseInt(scores[1]) || 0;
        //   }
        // } 
        // if (userPlayer?.score !== undefined && opponentPlayer?.score !== undefined) {
        //   userScore = userPlayer.score || 0;
        //   opponentScore = opponentPlayer.score || 0;
        //   displayScore = `${userScore}-${opponentScore}`;
        // } 
        // else {
        //   // Fallback to win/loss based scoring
        //   userScore = gameData.userWon ? 3 : 0;
        //   opponentScore = gameData.userWon ? 0 : 3;
        //   displayScore = `${userScore}-${opponentScore}`;
        // }

        return {
          id: game.id_game.toString(),
          gameType: game.game_name,
          opponent: opponentPlayer?.username || 'Unknown',
          result: result,
          score: gameData.finalScore,
          userScore: userPlayer.score,
          opponentScore: opponentPlayer.score,
          duration: `${Math.floor(gameData.duration / 60)}:${String(gameData.duration % 60).padStart(2, '0')}`,
          date: game.date.toISOString(),
          mode: gameData.mode || 'unknown'
        };
      } catch (e) {
        return {
          id: game.id_game.toString(),
          gameType: game.game_name,
          opponent: 'Unknown',
          result: 'unknown',
          score: '0-0',
          userScore: 0,
          opponentScore: 0,
          duration: '0:00',
          date: game.date.toISOString(),
          mode: 'unknown'
        };
      }
    });

    return reply.send(matches);

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch recent matches' });
  }
});

  // Get detailed match information
  fastify.get('/matches/:matchId', async (request, reply) => {
    try {
      const user = getAuthenticatedUser(request);
      const { matchId } = request.params as { matchId: string };

      const game = await prisma.game.findFirst({
        where: { 
          id_game: parseInt(matchId),
            OR: [
                { id_player1: user.userId },
                { id_player2: user.userId },
            ],
        }
      });

      if (!game) {
        return reply.status(404).send({ error: 'Match not found' });
      }

      const gameData = JSON.parse(game.rounds_json);

      return reply.send({
        id: game.id_game,
        gameType: game.game_name,
        date: game.date,
        ...gameData
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch match details' });
    }
  });
}