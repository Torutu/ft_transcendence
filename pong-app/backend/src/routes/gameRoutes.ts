// backend/src/routes/gameRoutes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface GameRoutesOptions {
  prisma: PrismaClient;
}

export default function gameRoutes(app: FastifyInstance, options: GameRoutesOptions) {
  const { prisma } = options;

  // Helper function to verify authentication
  const verifyAuth = (request: FastifyRequest) => {
    const token = request.cookies.authToken;
    if (!token) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }
    return app.jwt.verify(token) as { userId: number; username: string };
  };


// Enhanced helper function to parse game data from either player perspective
const parseGameData = (game: any, currentUser: { userId: number; username: string }) => {
  let parsedRounds = [];
  let opponent = 'Unknown';
  let result: 'win' | 'loss' | 'draw' = 'draw';
  let score = '0-0';
  let duration = 'N/A';
  let mode = 'unknown';

  try {
    if (game.rounds_json) {
      const gameData = JSON.parse(game.rounds_json);
      parsedRounds = gameData.rounds || [];
      mode = gameData.mode || 'unknown';

      const userIsPlayer1 = (game.id_player1 === currentUser.userId);
      const userIsPlayer2 = (game.id_player2 === currentUser.userId);

      console.log(`Parsing game ${game.id_game}: user ${currentUser.username} (ID: ${currentUser.userId}), userIsPlayer1: ${userIsPlayer1}, userIsPlayer2: ${userIsPlayer2}`);

      if (gameData.winner) {
        if (gameData.winner.name === currentUser.username) {
          result = 'win';
        } else {
          result = 'loss';
        }
      }

      if (gameData.player1 && gameData.player2) {
        if (userIsPlayer1) {
          opponent = gameData.player2.username || 'Unknown';
        } else if (userIsPlayer2) {
          opponent = gameData.player1.username || 'Unknown';
        }
        if (!gameData.winner && (gameData.player1.isWinner || gameData.player2.isWinner)) {
          if (userIsPlayer1) {
            result = gameData.player1.isWinner === true ? 'win' : 'loss';
          } else if (userIsPlayer2) {
            result = gameData.player2.isWinner === true ? 'win' : 'loss';
          }
        }
        if (gameData.player1.score !== undefined && gameData.player2.score !== undefined) {
          const p1Score = gameData.player1.score;
          const p2Score = gameData.player2.score;
          score = userIsPlayer1 ? `${p1Score}-${p2Score}` : `${p2Score}-${p1Score}`;          
        }
      }
      else if (gameData.finalScore) {
        const scoreParts = gameData.finalScore.split(/\s*[-–—]\s*/);
        if (scoreParts.length === 2) {
          const [p1Score, p2Score] = scoreParts.map((s: string) => s.trim());
          score = userIsPlayer1 ? `${p1Score}-${p2Score}` : `${p2Score}-${p1Score}`;
        } else {
          score = gameData.finalScore;
        }
      }

      // DURATION
      if (gameData.duration !== undefined) {
        duration = typeof gameData.duration === 'number'
          ? `${Math.floor(gameData.duration / 60)}:${String(gameData.duration % 60).padStart(2, '0')}`
          : gameData.duration.toString();
      }

      console.log(`Parsed game ${game.id_game}: opponent=${opponent}, result=${result}, score=${score}`);
    }
  } catch (error) {
    console.error('Error parsing game data for game', game.id_game, ':', error);
  }

  return {
    id: game.id_game.toString(),
    date: game.date,
    gameType: game.game_name,
    opponent,
    result,
    score,
    duration,
    mode,
    rounds: parsedRounds
  };
};



  /* **********************************************************************
   * GET /games/history - User's game history (for MatchHistoryTab)
   ************************************************************************ */
  app.get('/game/history', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const { limit, offset } = request.query as { limit?: string; offset?: string };
      
      console.log(`Fetching game history for user ${decoded.userId} (${decoded.username})`);
      
      // Query for games where user was EITHER player1 OR player2
      const games = await prisma.game.findMany({
        where: {
          OR: [
            { id_player1: decoded.userId },
            { id_player2: decoded.userId }
          ]
        },
        orderBy: { date: 'desc' },
        take: limit ? parseInt(limit) : 50,
        skip: offset ? parseInt(offset) : 0
      });

      console.log(`Found ${games.length} games for user ${decoded.userId} (including as player1 and player2)`);
      
      if (games.length === 0) {
        console.log(`No games found for user ${decoded.userId}. Checking database state...`);
        
        const allGames = await prisma.game.findMany({ take: 5 });
        console.log(`Sample games in database:`, allGames.map(g => ({ 
          id: g.id_game, 
          player1: g.id_player1,
          player2: g.id_player2,
          date: g.date
        })));
      }

      const parsedGames = games.map(game => parseGameData(game, decoded));

      return reply.send(parsedGames);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Get game history error:', error);
      return reply.status(500).send({ error: 'HISTORY_FETCH_FAILED', message: 'Failed to fetch game history' });
    }
  });

  /* **********************************************************************
   * GET /games/stats - User's game statistics (for OverviewTab and MatchHistoryTab)
   ************************************************************************ */
  app.get('/game/stats', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      
      console.log(`Fetching game stats for user ${decoded.userId} (${decoded.username})`);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { wins: true, losses: true, username: true }
      });

      if (!user) {
        return reply.status(404).send({ error: 'USER_NOT_FOUND', message: 'User not found' });
      }

      // USE USER TABLE AS SINGLE SOURCE OF TRUTH
      const totalMatches = user.wins + user.losses;
      const winRate = totalMatches > 0 ? (user.wins / totalMatches) * 100 : 0;

      console.log(`User table stats: wins=${user.wins}, losses=${user.losses}, total=${totalMatches}`);

      // Get all games for additional calculated stats (streaks, monthly)
      const games = await prisma.game.findMany({
        where: {
          OR: [
            { id_player1: decoded.userId },
            { id_player2: decoded.userId }
          ]
        },
        orderBy: { date: 'desc' },
        take: 100
      });

      console.log(`Found ${games.length} games for streak/monthly calculations`);

      // Calculate ONLY streaks and monthly data from games
      let currentWinStreak = 0;
      let longestWinStreak = 0;
      let tempStreak = 0;
      let currentStreakActive = true;

      // Calculate streaks from recent games
      for (const game of games) {
        try {
          if (game.rounds_json) {
            const gameData = JSON.parse(game.rounds_json);
            let isWin = false;
            
            // Determine if this was a win from user's perspective
            if (gameData.winner) {
              let winnerName = '';
              if (typeof gameData.winner === 'string') {
                winnerName = gameData.winner;
              } else if (gameData.winner.name) {
                winnerName = gameData.winner.name;
              }
              isWin = winnerName === decoded.username;
            } else if (gameData.player1 && gameData.player2) {
              const userIsPlayer1 = (game.id_player1 === decoded.userId) || 
                                   (gameData.player1.username === decoded.username);
              
              if (userIsPlayer1) {
                isWin = gameData.player1.isWinner === true;
              } else {
                isWin = gameData.player2.isWinner === true;
              }
            }
            
            if (isWin) {
              tempStreak++;
              if (currentStreakActive) {
                currentWinStreak = tempStreak;
              }
            } else {
              if (tempStreak > longestWinStreak) {
                longestWinStreak = tempStreak;
              }
              tempStreak = 0;
              currentStreakActive = false;
            }
          }
        } catch (error) {
          console.error('Error parsing game for streak calculation:', error);
        }
      }

      if (tempStreak > longestWinStreak) {
        longestWinStreak = tempStreak;
      }

      // Calculate monthly wins from games
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const monthlyGames = await prisma.game.findMany({
        where: {
          OR: [
            { id_player1: decoded.userId },
            { id_player2: decoded.userId }
          ],
          date: { gte: startOfMonth }
        }
      });

      let monthlyWins = 0;
      for (const game of monthlyGames) {
        try {
          if (game.rounds_json) {
            const gameData = JSON.parse(game.rounds_json);
            let isWin = false;
            
            if (gameData.winner) {
              let winnerName = '';
              if (typeof gameData.winner === 'string') {
                winnerName = gameData.winner;
              } else if (gameData.winner.name) {
                winnerName = gameData.winner.name;
              }
              isWin = winnerName === decoded.username;
            } else if (gameData.player1 && gameData.player2) {
              const userIsPlayer1 = (game.id_player1 === decoded.userId) || 
                                   (gameData.player1.username === decoded.username);
              
              if (userIsPlayer1) {
                isWin = gameData.player1.isWinner === true;
              } else {
                isWin = gameData.player2.isWinner === true;
              }
            }
            
            if (isWin) monthlyWins++;
          }
        } catch (error) {
          console.error('Error parsing monthly game:', error);
        }
      }

      // RETURN STATS USING USER TABLE
      const stats = {
        wins: user.wins,           // FROM USER TABLE
        losses: user.losses,       // FROM USER TABLE  
        totalMatches,              // CALCULATED FROM USER TABLE
        winRate: Math.round(winRate * 10) / 10,
        currentWinStreak,          // CALCULATED FROM GAMES
        longestWinStreak,          // CALCULATED FROM GAMES
        monthlyWins,               // CALCULATED FROM GAMES
        recentGamesCount: games.length,
        source: 'game_api'
      };

      console.log(`Final stats for ${decoded.username}:`, stats);

      // VERIFICATION LOG - Check if game count matches calculated stats
      const gameWins = games.filter(game => {
        try {
          const gameData = JSON.parse(game.rounds_json);
          if (gameData.winner) {
            const winnerName = typeof gameData.winner === 'string' ? 
              gameData.winner : gameData.winner.username;
            return winnerName === decoded.username;
          }
          return false;
        } catch {
          return false;
        }
      }).length;

      const gameLosses = games.filter(game => {
        try {
          const gameData = JSON.parse(game.rounds_json);
          if (gameData.winner) {
            const winnerName = typeof gameData.winner === 'string' ? 
              gameData.winner : gameData.winner.username;
            return winnerName && winnerName !== decoded.username;
          }
          return false;
        } catch {
          return false;
        }
      }).length;

      console.log(`VERIFICATION: User table says ${user.wins}W/${user.losses}L, games suggest ${gameWins}W/${gameLosses}L`);
      
      if (user.wins !== gameWins || user.losses !== gameLosses) {
        console.warn(`⚠️ DATA INCONSISTENCY DETECTED for user ${decoded.username}`);
        console.warn(`User table: ${user.wins}W/${user.losses}L vs Games calculation: ${gameWins}W/${gameLosses}L`);
      }

      return reply.send(stats);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Get game stats error:', error);
      return reply.status(500).send({ error: 'STATS_FETCH_FAILED', message: 'Failed to fetch game statistics' });
    }
  });


  /* **********************************************************************
   * GET /games/leaderboard - Global leaderboard (for MatchHistoryTab)
   ************************************************************************ */
  app.get('/game/leaderboard', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const { limit } = request.query as { limit?: string };
      
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          wins: true,
          losses: true,
          online_status: true,
          profilePic: true
        },
        where: {
          OR: [
            { wins: { gt: 0 } },
            { losses: { gt: 0 } }
          ]
        },
        orderBy: [
          { wins: 'desc' },
          { losses: 'asc' }
        ],
        take: limit ? parseInt(limit) : 10
      });

      const leaderboard = users.map((user, index) => {
        const totalGames = user.wins + user.losses;
        const winRate = totalGames > 0 ? (user.wins / totalGames) * 100 : 0;
        const points = (user.wins * 3) - user.losses;

        return {
          rank: index + 1,
          username: user.username,
          wins: user.wins,
          losses: user.losses,
          totalGames,
          winRate: Math.round(winRate * 10) / 10,
          points: Math.max(0, points),
          online_status: user.online_status,
          profilePic: user.profilePic,
          isCurrentUser: user.id === decoded.userId
        };
      });

      return reply.send(leaderboard);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Get leaderboard error:', error);
      return reply.status(500).send({ error: 'LEADERBOARD_FETCH_FAILED', message: 'Failed to fetch leaderboard' });
    }
  });

  /* **********************************************************************
   * GET /games/recent - Recent matches for overview (for OverviewTab)
   ************************************************************************ */
  app.get('/game/recent', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const { limit } = request.query as { limit?: string };
      
      console.log(`Fetching recent games for user ${decoded.userId} (${decoded.username})`);
      
      const games = await prisma.game.findMany({
        where: {
          OR: [
            { id_player1: decoded.userId },
            { id_player2: decoded.userId }
          ]
        },
        orderBy: { date: 'desc' },
        take: limit ? parseInt(limit) : 5
      });

      console.log(`Found ${games.length} recent games for user ${decoded.userId}`);

      const recentMatches = games.map(game => {
        const parsedGame = parseGameData(game, decoded);
        return {
          id: parsedGame.id,
          opponent: parsedGame.opponent,
          matchType: parsedGame.gameType,
          mode: parsedGame.mode,
          result: parsedGame.result,
          score: parsedGame.score,
          date: game.date
        };
      });

      return reply.send(recentMatches);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Get recent games error:', error);
      return reply.status(500).send({ error: 'RECENT_GAMES_FETCH_FAILED', message: 'Failed to fetch recent games' });
    }
  });
}