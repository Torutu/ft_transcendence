// backend/src/routes/gameRoutes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

interface GameRoutesOptions {
  prisma: PrismaClient;
}

interface SaveGameInput {
  opponent: string;
  gameType: string;
  mode: string;
  result: "win" | "loss" | "draw";
  score: string;
  duration: string;
  rounds?: any[];
}

export default function gameRoutes(
  app: FastifyInstance,
  options: GameRoutesOptions
) {
  const { prisma } = options;

  // Helper function to verify authentication
  const verifyAuth = (request: FastifyRequest) => {
    const token = request.cookies.authToken;
    if (!token) {
      throw new Error("AUTHENTICATION_REQUIRED");
    }
    return app.jwt.verify(token) as { userId: number; username: string };
  };

  // Enhanced helper function to parse game data from either player perspective
  const parseGameData = (
    game: any,
    currentUser: { userId: number; username: string }
  ) => {
    let parsedRounds = [];
    let opponent = "Unknown";
    let result: "win" | "loss" | "draw" = "draw";
    let score = "0-0";
    let duration = "N/A";
    let mode = "unknown";

    try {
      if (game.rounds_json) {
        const gameData = JSON.parse(game.rounds_json);
        parsedRounds = gameData.rounds || [];
        mode = gameData.mode || "unknown";

        const userIsPlayer1 = game.id_player1 === currentUser.userId;
        const userIsPlayer2 = game.id_player2 === currentUser.userId;

        // OPPONENT - Simple extraction
        if (userIsPlayer1) {
          opponent = gameData.player2?.username || "Unknown";
        } else if (userIsPlayer2) {
          opponent = gameData.player1?.username || "Unknown";
        }

        // RESULT - Direct from isWinner flag
        if (userIsPlayer1) {
          result = gameData.player1?.isWinner === true ? "win" : "loss";
        } else if (userIsPlayer2) {
          result = gameData.player2?.isWinner === true ? "win" : "loss";
        }

        // SCORE - Direct from player objects
        if (
          gameData.player1?.score !== undefined &&
          gameData.player2?.score !== undefined
        ) {
          const p1Score = gameData.player1.score;
          const p2Score = gameData.player2.score;
          score = userIsPlayer1
            ? `${p1Score}-${p2Score}`
            : `${p2Score}-${p1Score}`;
        }

        // DURATION - Direct extraction
        if (gameData.duration !== undefined) {
          duration =
            typeof gameData.duration === "number"
              ? `${Math.floor(gameData.duration / 60)}:${String(
                  gameData.duration % 60
                ).padStart(2, "0")}`
              : gameData.duration.toString();
        }

        console.log(
          `Parsed game ${game.id_game}: opponent=${opponent}, result=${result}, score=${score}`
        );
      }
    } catch (error) {
      console.error(
        "Error parsing game data for game",
        game.id_game,
        ":",
        error
      );
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
      rounds: parsedRounds,
    };
  };

  /* **********************************************************************
   * GET /games/history - User's game history (for MatchHistoryTab)
   ************************************************************************ */
  app.get("/game/history", async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const { limit, offset } = request.query as {
        limit?: string;
        offset?: string;
      };

      console.log(
        `Fetching game history for user ${decoded.userId} (${decoded.username})`
      );

      // Query for games where user was EITHER player1 OR player2
      const games = await prisma.game.findMany({
        where: {
          OR: [{ id_player1: decoded.userId }, { id_player2: decoded.userId }],
        },
        orderBy: { date: "desc" },
        take: limit ? parseInt(limit) : 50,
        skip: offset ? parseInt(offset) : 0,
      });

      console.log(
        `Found ${games.length} games for user ${decoded.userId} (including as player1 and player2)`
      );

      if (games.length === 0) {
        console.log(
          `No games found for user ${decoded.userId}. Checking database state...`
        );

        const allGames = await prisma.game.findMany({ take: 5 });
        console.log(
          `Sample games in database:`,
          allGames.map((g) => ({
            id: g.id_game,
            player1: g.id_player1,
            player2: g.id_player2,
            date: g.date,
          }))
        );
      }

      const parsedGames = games.map((game) => parseGameData(game, decoded));

      return reply.send(parsedGames);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTHENTICATION_REQUIRED"
      ) {
        return reply.status(401).send({
          error: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        });
      }
      console.error("Get game history error:", error);
      return reply.status(500).send({
        error: "HISTORY_FETCH_FAILED",
        message: "Failed to fetch game history",
      });
    }
  });

/* **********************************************************************
 * GET /games/stats - User's game statistics (for OverviewTab and MatchHistoryTab)
 ************************************************************************ */
app.get("/game/stats", async (request, reply) => {
  try {
    const decoded = verifyAuth(request);

    console.log(
      `Fetching game stats for user ${decoded.userId} (${decoded.username})`
    );

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { wins: true, losses: true, username: true },
    });

    if (!user) {
      return reply
        .status(404)
        .send({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    // USE USER TABLE AS SINGLE SOURCE OF TRUTH
    const totalMatches = user.wins + user.losses;
    const winRate = totalMatches > 0 ? (user.wins / totalMatches) * 100 : 0;

    console.log(
      `User table stats: wins=${user.wins}, losses=${user.losses}, total=${totalMatches}`
    );

    // Get all games for streak calculations
    const games = await prisma.game.findMany({
      where: {
        OR: [{ id_player1: decoded.userId }, { id_player2: decoded.userId }],
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    console.log(`Found ${games.length} games for streak/monthly calculations`);

    // Helper function to check if user won a game
    const isUserWin = (game: any): boolean => {
      try {
        if (!game.rounds_json) return false;
        
        const gameData = JSON.parse(game.rounds_json);
        const userIsPlayer1 = game.id_player1 === decoded.userId;
        
        if (userIsPlayer1) {
          return gameData.player1?.isWinner === true;
        } else {
          return gameData.player2?.isWinner === true;
        }
      } catch (error) {
        console.error("Error checking win status:", error);
        return false;
      }
    };

    // Calculate streaks
    let currentWinStreak = 0;
    let longestWinStreak = 0;
    let tempStreak = 0;
    let currentStreakActive = true;

    for (const game of games) {
      const isWin = isUserWin(game);
      
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

    if (tempStreak > longestWinStreak) {
      longestWinStreak = tempStreak;
    }

    // Calculate monthly wins
    const currentMonth = new Date();
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );

    const monthlyGames = await prisma.game.findMany({
      where: {
        OR: [{ id_player1: decoded.userId }, { id_player2: decoded.userId }],
        date: { gte: startOfMonth },
      },
    });

    const monthlyWins = monthlyGames.filter(game => isUserWin(game)).length;

    // Return stats
    const stats = {
      wins: user.wins,
      losses: user.losses,
      totalMatches,
      winRate: Math.round(winRate * 10) / 10,
      currentWinStreak,
      longestWinStreak,
      monthlyWins,
      recentGamesCount: games.length,
      source: "game_api",
    };

    console.log(`Final stats for ${decoded.username}:`, stats);

    return reply.send(stats);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "AUTHENTICATION_REQUIRED"
    ) {
      return reply.status(401).send({
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
      });
    }
    console.error("Get game stats error:", error);
    return reply.status(500).send({
      error: "STATS_FETCH_FAILED",
      message: "Failed to fetch game statistics",
    });
  }
});

  /* **********************************************************************
   * GET /games/leaderboard - Global leaderboard (for MatchHistoryTab)
   ************************************************************************ */
  app.get("/game/leaderboard", async (request, reply) => {
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
          profilePic: true,
        },
        where: {
          OR: [{ wins: { gt: 0 } }, { losses: { gt: 0 } }],
        },
        orderBy: [{ wins: "desc" }, { losses: "asc" }],
        take: limit ? parseInt(limit) : 10,
      });

      const leaderboard = users.map((user, index) => {
        const totalGames = user.wins + user.losses;
        const winRate = totalGames > 0 ? (user.wins / totalGames) * 100 : 0;
        const points = user.wins * 3 - user.losses;

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
          isCurrentUser: user.id === decoded.userId,
        };
      });

      return reply.send(leaderboard);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTHENTICATION_REQUIRED"
      ) {
        return reply.status(401).send({
          error: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        });
      }
      console.error("Get leaderboard error:", error);
      return reply.status(500).send({
        error: "LEADERBOARD_FETCH_FAILED",
        message: "Failed to fetch leaderboard",
      });
    }
  });

  /* **********************************************************************
   * POST /games - Save new game result
   ************************************************************************ */
  app.post<{ Body: SaveGameInput }>(
    "/game",
    {
      schema: {
        body: {
          type: "object",
          required: ["opponent", "gameType", "result", "score"],
          properties: {
            opponent: { type: "string" },
            gameType: { type: "string", enum: ["pingpong", "keyclash"] },
            mode: { type: "string" },
            result: { type: "string", enum: ["win", "loss", "draw"] },
            score: { type: "string" },
            duration: { type: "string" },
            rounds: { type: "array" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const decoded = verifyAuth(request);
        const { opponent, gameType, mode, result, score, duration, rounds } =
          request.body;

        console.log(
          `Saving game for user ${decoded.userId} (${decoded.username}):`,
          {
            opponent,
            gameType,
            mode,
            result,
            score,
            duration,
          }
        );

        const gameData = {
          opponent,
          mode: mode || "standard",
          result,
          score,
          duration: duration || "N/A",
          rounds: rounds || [],
          savedBy: decoded.username,
          savedAt: new Date().toISOString(),
        };

        const savedGame = await prisma.game.create({
          data: {
            id_player1: decoded.userId,
            game_name: gameType as any,
            rounds_json: JSON.stringify(gameData),
            date: new Date(),
          },
        });

        console.log(
          `Game saved with ID ${savedGame.id_game} for user ${decoded.userId}`
        );

        if (result === "win") {
          await prisma.user.update({
            where: { id: decoded.userId },
            data: { wins: { increment: 1 } },
          });
        } else if (result === "loss") {
          await prisma.user.update({
            where: { id: decoded.userId },
            data: { losses: { increment: 1 } },
          });
        }

        return reply.status(201).send({
          success: true,
          message: "Game result saved successfully",
          gameId: savedGame.id_game,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "AUTHENTICATION_REQUIRED"
        ) {
          return reply.status(401).send({
            error: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          });
        }
        console.error("Save game error:", error);
        return reply.status(500).send({
          error: "GAME_SAVE_FAILED",
          message: "Failed to save game result",
        });
      }
    }
  );

  /* **********************************************************************
   * GET /games/recent - Recent matches for overview (for OverviewTab)
   ************************************************************************ */
  app.get("/game/recent", async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const { limit } = request.query as { limit?: string };

      console.log(
        `Fetching recent games for user ${decoded.userId} (${decoded.username})`
      );

      const games = await prisma.game.findMany({
        where: {
          OR: [{ id_player1: decoded.userId }, { id_player2: decoded.userId }],
        },
        orderBy: { date: "desc" },
        take: limit ? parseInt(limit) : 5,
      });

      console.log(
        `Found ${games.length} recent games for user ${decoded.userId}`
      );

      const recentMatches = games.map((game) => {
        const parsedGame = parseGameData(game, decoded);
        return {
          id: parsedGame.id,
          opponent: parsedGame.opponent,
          matchType: parsedGame.gameType,
          mode: parsedGame.mode,
          result: parsedGame.result,
          score: parsedGame.score,
          date: game.date,
        };
      });

      return reply.send(recentMatches);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTHENTICATION_REQUIRED"
      ) {
        return reply.status(401).send({
          error: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        });
      }
      console.error("Get recent games error:", error);
      return reply.status(500).send({
        error: "RECENT_GAMES_FETCH_FAILED",
        message: "Failed to fetch recent games",
      });
    }
  });
}
