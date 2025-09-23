// backend/src/routes/lobbyRoutes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface LobbyRoutesOptions {
  prisma: PrismaClient;
}

interface AuthenticatedUser {
  userId: number;
  username: string;
}

// Request body types
interface UpdateProfileRequestBody {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  favAvatar?: string;
  profilePic?: string;
}

interface SendFriendRequestBody {
  receiverId: number;
}

interface FriendRequestResponseBody {
  action: 'accept' | 'decline';
}

export default function lobbyRoutes(fastify: FastifyInstance, options: LobbyRoutesOptions) {
  const { prisma } = options;

  // Helper function to get authenticated user from request
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

  // GET /lobby/stats - For OverviewTab stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;

      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { wins: true, losses: true, username: true }
      });

      if (!userRecord) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const totalMatches = userRecord.wins + userRecord.losses;
      const winRate = totalMatches > 0 ? parseFloat(((userRecord.wins / totalMatches) * 100).toFixed(1)) : 0.0;

      // Get recent games for win streak calculation
      const allGames = await prisma.game.findMany({
        where: { id_user: userId },
        orderBy: { date: 'desc' },
        take: 20
      });

      let currentWinStreak = 0;
      let longestWinStreak = 0;
      let tempStreak = 0;

for (const game of allGames) {
  try {
    const rounds = JSON.parse(game.rounds_json || '{}');
    const userWon = rounds.winner === userRecord.username || 
                   rounds.winnerId === userId || 
                   rounds.userWon === true;
    
    if (userWon) {
      currentWinStreak = currentWinStreak === 0 ? 1 : currentWinStreak + 1;
      tempStreak++;
      longestWinStreak = Math.max(longestWinStreak, tempStreak);
    } else {
      // Only break if we've started counting current streak
      if (currentWinStreak > 0) break;
      tempStreak = 0;
    }
  } catch (error) {
    // Don't break on JSON errors, just skip this game
    console.warn('Error parsing game data for streak calculation:', error);
    continue;
  }
}

// Calculate monthly wins properly
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();
const monthlyGames = allGames.filter(game => {
  const gameDate = new Date(game.date);
  return gameDate.getMonth() === currentMonth && gameDate.getFullYear() === currentYear;
});

let monthlyWins = 0;
monthlyGames.forEach(game => {
  try {
    const rounds = JSON.parse(game.rounds_json || '{}');
    if (rounds.winner === userRecord.username || rounds.winnerId === userId || rounds.userWon) {
      monthlyWins++;
    }
  } catch (error) {
    // Skip invalid JSON
  }
});

// Add longestWinStreak to your response
return reply.send({
  totalMatches,
  winRate,
  currentWinStreak,
  monthlyWins,
  wins: userRecord.wins,
  losses: userRecord.losses,
  draws: 0,
  longestWinStreak // Add this
});


    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });

  // GET /lobby/friends - For OverviewTab friends
  fastify.get('/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;

      const friendships = await prisma.friendship.findMany({
        where: {
          sender_id: userId,
          status: 'Friend'
        },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              profilePic: true,
              online_status: true,
              createdAt: true,
              wins: true,
              losses: true
            }
          }
        }
      });

      const friends = friendships.map(friendship => ({
        id: friendship.receiver.id,
        name: friendship.receiver.username,
        status: friendship.receiver.online_status,
        rank: friendship.receiver.wins,
        lastActive: friendship.receiver.createdAt.toISOString()
      }));

      return reply.send(friends);

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch friends' });
    }
  });

  // GET /lobby/recent-matches - For OverviewTab and MatchHistoryTab
  // Replace the current recent-matches endpoint in lobbyRoutes.ts with this:

// GET /lobby/recent-matches - For OverviewTab and MatchHistoryTab
fastify.get('/recent-matches', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = getAuthenticatedUser(request);
    const userId = user.userId;
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!userRecord) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const recentGames = await prisma.game.findMany({
      where: { id_user: userId },
      orderBy: { date: 'desc' },
      take: 10
    });

    const processedMatches = recentGames.map(game => {
      let opponent = 'Unknown';
      let score = '0-0';
      let isUserWinner = false;
      let userScore = 0;
      let opponentScore = 0;

      try {
        if (game.rounds_json) {
          const rounds = JSON.parse(game.rounds_json);
          
          // Extract opponent
          if (rounds.opponent) opponent = rounds.opponent;
          if (rounds.opponentName) opponent = rounds.opponentName;
          if (rounds.player2 && rounds.player2 !== userRecord.username) opponent = rounds.player2;
          if (rounds.player1 && rounds.player1 !== userRecord.username) opponent = rounds.player1;
          
          // Extract result
          if (rounds.winner === userRecord.username) isUserWinner = true;
          if (rounds.winnerId === userId) isUserWinner = true;
          if (rounds.userWon !== undefined) isUserWinner = rounds.userWon;
          
          // EXTRACT ACTUAL SCORES - FIXED LOGIC
          if (rounds.finalScore) {
            score = rounds.finalScore;
            // Parse scores from finalScore string like "3-2"
            const scores = rounds.finalScore.split('-');
            if (scores.length === 2) {
              userScore = parseInt(scores[0]) || 0;
              opponentScore = parseInt(scores[1]) || 0;
            }
          } else if (rounds.score) {
            score = rounds.score;
            const scores = rounds.score.split('-');
            if (scores.length === 2) {
              userScore = parseInt(scores[0]) || 0;
              opponentScore = parseInt(scores[1]) || 0;
            }
          } else if (rounds.player1 && rounds.player2) {
            // Extract from player objects if available
            const p1Score = rounds.player1?.score || rounds.player1Score || 0;
            const p2Score = rounds.player2?.score || rounds.player2Score || 0;
            
            const isUserPlayer1 = rounds.player1?.username === userRecord.username || 
                                 rounds.player1 === userRecord.username;
            
            if (isUserPlayer1) {
              userScore = p1Score;
              opponentScore = p2Score;
            } else {
              userScore = p2Score;
              opponentScore = p1Score;
            }
            score = `${userScore}-${opponentScore}`;
          } else {
            // Default scores based on win/loss
            userScore = isUserWinner ? 3 : 0;
            opponentScore = isUserWinner ? 0 : 3;
            score = `${userScore}-${opponentScore}`;
          }
        }
      } catch (error) {
        console.error('Error parsing rounds_json:', error);
        // Set default scores on error
        userScore = isUserWinner ? 3 : 0;
        opponentScore = isUserWinner ? 0 : 3;
        score = `${userScore}-${opponentScore}`;
      }

      return {
        id: game.id_game.toString(),
        opponent,
        result: isUserWinner ? 'win' : 'loss',
        score: score,
        userScore: userScore,
        opponentScore: opponentScore,
        matchType: game.game_name,
        date: game.date.toISOString(),
        duration: '5 min'
      };
    });

    return reply.send(processedMatches);

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch recent matches' });
  }
});


  // GET /lobby/profile - For MyLockerTab and MatchHistoryTab
  fastify.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;

      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          profilePic: true,
          wins: true,
          losses: true,
          favAvatar: true,
          isVerified: true,
          twoFactorRegistered: true,
          createdAt: true,
          firstName: true,
          online_status: true,
          lastName: true,
          dateOfBirth: true,
          gender: true
        }
      });

      if (!userRecord) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        name: userRecord.username,
        email: userRecord.email,
        profilePic: userRecord.profilePic,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        online_status: userRecord.online_status,
        dateOfBirth: userRecord.dateOfBirth,
        gender: userRecord.gender,
        language: 'English', 
        favAvatar: userRecord.favAvatar,
        wins: userRecord.wins,
        losses: userRecord.losses,
        isVerified: userRecord.isVerified,
        twoFactorRegistered: userRecord.twoFactorRegistered,
        createdAt: userRecord.createdAt.toISOString()
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch profile data' });
    }
  });

  // POST /lobby/profile/update - For MyLockerTab profile updates
  fastify.post<{ Body: UpdateProfileRequestBody }>('/profile/update', async (request, reply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;
      const { firstName, lastName, dateOfBirth, gender, favAvatar, profilePic } = request.body;

      // Validation
      if (firstName && !firstName.trim()) {
        return reply.status(400).send({ error: 'First name cannot be only spaces' });
      }
      
      if (lastName && !lastName.trim()) {
        return reply.status(400).send({ error: 'Last name cannot be only spaces' });
      }

      if (dateOfBirth) {
        const date = new Date(dateOfBirth);
        if (isNaN(date.getTime())) {
          return reply.status(400).send({ error: 'Invalid date of birth' });
        }
      }

      // Handle enum values properly - convert empty strings to undefined
      const genderValue = gender && gender.trim() ? gender as any : undefined;
      const favAvatarValue = favAvatar && favAvatar.trim() ? favAvatar as any : undefined;

      // Update user profile
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: firstName?.trim() || undefined,
          lastName: lastName?.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender: genderValue,
          favAvatar: favAvatarValue,
          profilePic: profilePic || undefined
        }
      });

      return reply.send({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });





// Add this to your existing lobbyRoutes.ts file, with the other GET endpoints

// GET /lobby/leaderboard - Get complete leaderboard data
fastify.get('/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = getAuthenticatedUser(request);
    
    // Get all users with their stats, ordered by performance
    const allUsers = await prisma.user.findMany({
      where: {
        // Optional: only include users who have played games
        OR: [
          { wins: { gt: 0 } },
          { losses: { gt: 0 } }
        ]
      },
      select: {
        id: true,
        username: true,
        wins: true,
        losses: true,
        profilePic: true,
        online_status: true,
        createdAt: true
      },
      orderBy: [
        { wins: 'desc' },     // Highest wins first
        { losses: 'asc' },    // Fewer losses as tiebreaker
        { createdAt: 'asc' }  // Older accounts as second tiebreaker
      ]
    });

    // Calculate points and rank (same formula as your friend: wins + losses/2)
    const leaderboard = allUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      wins: user.wins,
      losses: user.losses,
      points: user.wins + (user.losses / 2), // Exact same calculation as your friend
      profilePic: user.profilePic,
      online_status: user.online_status,
      totalGames: user.wins + user.losses
    }));

    return reply.send(leaderboard);

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch leaderboard' });
  }
});


fastify.get('/avatars', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Define available avatars with your friend's descriptions
    const avatars = [
      {
        id: 'AstroAce',
        name: 'Astro Ace', 
        imageUrl: '/avatars/astro_ace.png',
        description: 'Space explorer, ready for any cosmic challenge.'
      },
      {
        id: 'PixelPirate',
        name: 'Pixel Pirate',
        imageUrl: '/avatars/pixel_pirate.png', 
        description: 'A swashbuckler who sails the digital seas.'
      },
      {
        id: 'RoboRacer', 
        name: 'Robo Racer',
        imageUrl: '/avatars/robo_racer.png',
        description: 'Futuristic racer, built for speed and style.'
      },
      {
        id: 'ShadowNinja',
        name: 'Shadow Ninja', 
        imageUrl: '/avatars/shadow_ninja.png',
        description: 'Silent, swift, and always in control.'
      },
      {
        id: 'CyberKitty',
        name: 'Cyber Kitty',
        imageUrl: '/avatars/cyber_kitty.png', 
        description: 'Sleek, curious, and a master of the cyber world.'
      },
      {
        id: 'MysticMage',
        name: 'Mystic Mage',
        imageUrl: '/avatars/mystic_mage.png',
        description: 'Wielder of ancient arcane powers.'
      },
      {
        id: 'CaptainQuasar', 
        name: 'Captain Quasar',
        imageUrl: '/avatars/captain_quasar.png',
        description: 'Defender of the galaxies, always vigilant.'
      },
      {
        id: 'NeonSamurai',
        name: 'Neon Samurai',
        imageUrl: '/avatars/neon_samurai.png', 
        description: 'Blade of light, honor in every move.'
      },
      {
        id: 'RocketRaccoon',
        name: 'Rocket Raccoon',
        imageUrl: '/avatars/rocket_raccoon.png',
        description: 'Inventive and quick, with a nose for victory.'
      },
      {
        id: 'JungleJaguar',
        name: 'Jungle Jaguar', 
        imageUrl: '/avatars/jungle_jaguar.png',
        description: 'Agile and powerful, ruler of the jungle.'
      },
      {
        id: 'AquaSpirit',
        name: 'Aqua Spirit',
        imageUrl: '/avatars/aqua_spirit.png',
        description: 'Calm and mysterious, master of the waves.' 
      },
      {
        id: 'DesertPhantom',
        name: 'Desert Phantom',
        imageUrl: '/avatars/desert_phantom.png',
        description: 'A wanderer with secrets hidden in the sands.'
      }
    ];

    return reply.send(avatars);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch avatars' });
  }
});



  // GET /lobby/users/search - For RallySquadTab user search
  fastify.get('/users/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { q = '' } = request.query as { q?: string };
      const user = getAuthenticatedUser(request);
      const userId = user.userId;

      let whereClause: any = {
        id: { not: userId } // Exclude current user
      };

      if (q.trim()) {
        whereClause.OR = [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          email: true,
          online_status: true,
          createdAt: true
        },
        take: 50, // Limit results
        orderBy: { username: 'asc' }
      });

      const mappedUsers = users.map(user => ({
        id: user.id.toString(),
        name: user.username,
        email: user.email,
        online_status: user.online_status,
        createdAt: user.createdAt.toISOString()
      }));

      return reply.send(mappedUsers);

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to search users' });
    }
  });

  // ========================================
  // FRIEND REQUEST ENDPOINTS (Enhanced Logic)
  // ========================================

  // POST /lobby/friend-requests/send - Send friend request
  fastify.post<{ Body: SendFriendRequestBody }>('/friend-requests/send', async (request, reply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;
      const { receiverId } = request.body;

      if (userId === receiverId) {
        return reply.status(400).send({ 
          error: 'Cannot send friend request to yourself' 
        });
      }

      // Check if receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, username: true }
      });

      if (!receiver) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Simple: Just update sender → receiver to Pending
      await prisma.friendship.updateMany({
        where: {
          sender_id: userId,
          receiver_id: receiverId
        },
        data: { status: 'Pending' }
      });

      return reply.send({ message: 'Friend request sent successfully' });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send friend request' });
    }
  });

  // GET /lobby/friend-requests - Get incoming friend requests
  fastify.get('/friend-requests', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;

      const requests = await prisma.friendship.findMany({
        where: {
          receiver_id: userId,
          status: 'Pending'
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePic: true
            }
          }
        },
        orderBy: { sender_id: 'desc' }
      });

      const mappedRequests = requests.map(request => ({
        id: `${request.sender_id}-${request.receiver_id}`,
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
        sender_username: request.sender_username,
        receiver_username: request.receiver_username,
        status: request.status,
        createdAt: new Date().toISOString()
      }));

      return reply.send(mappedRequests);

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch friend requests' });
    }
  });

  // GET /lobby/friend-requests/sent - Get outgoing friend requests
  fastify.get('/friend-requests/sent', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;

      const sentRequests = await prisma.friendship.findMany({
        where: {
          sender_id: userId,
          status: 'Pending'
        },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              profilePic: true
            }
          }
        },
        orderBy: { receiver_id: 'desc' }
      });

      const mappedRequests = sentRequests.map(request => ({
        id: `${request.sender_id}-${request.receiver_id}`,
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
        sender_username: request.sender_username,
        receiver_username: request.receiver_username,
        status: request.status,
        createdAt: new Date().toISOString()
      }));

      return reply.send(mappedRequests);

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch sent friend requests' });
    }
  });

  // POST /lobby/friend-requests/:requestId/respond - Accept/Decline friend request
  fastify.post<{ 
    Params: { requestId: string }, 
    Body: FriendRequestResponseBody 
  }>('/friend-requests/:requestId/respond', async (request, reply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;
      const { requestId } = request.params;
      const { action } = request.body;

      // Parse requestId (format: senderId-receiverId)
      const [senderIdStr, receiverIdStr] = requestId.split('-');
      const senderId = parseInt(senderIdStr);
      const receiverId = parseInt(receiverIdStr);

      if (receiverId !== userId) {
        return reply.status(403).send({ error: 'Not authorized to respond to this request' });
      }

      const status = action === 'accept' ? 'Friend' : 'NotFriend';

      // Simple: Update both directions simultaneously
      await prisma.$transaction([
        prisma.friendship.updateMany({
          where: { sender_id: senderId, receiver_id: receiverId },
          data: { status }
        }),
        prisma.friendship.updateMany({
          where: { sender_id: receiverId, receiver_id: senderId },
          data: { status }
        })
      ]);

      return reply.send({ message: `Friend request ${action}ed` });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to respond to friend request' });
    }
  });

  // DELETE /lobby/friendships/:friendshipId - Remove friend
  fastify.delete<{ Params: { friendshipId: string } }>('/friendships/:friendshipId', async (request, reply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;
      const { friendshipId } = request.params;

      const friendId = parseInt(friendshipId);

      if (isNaN(friendId)) {
        return reply.status(400).send({ error: 'Invalid friendship ID' });
      }

      // Remove both friendship records (set to NotFriend)
      await prisma.$transaction([
        prisma.friendship.updateMany({
          where: {
            sender_id: userId,
            receiver_id: friendId
          },
          data: { status: 'NotFriend' }
        }),
        prisma.friendship.updateMany({
          where: {
            sender_id: friendId,
            receiver_id: userId
          },
          data: { status: 'NotFriend' }
        })
      ]);

      return reply.send({ message: 'Friendship removed successfully' });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove friendship' });
    }
  });

  // GET /lobby/friends/enhanced - Get friends with enhanced details
  fastify.get('/friends/enhanced', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getAuthenticatedUser(request);
      const userId = user.userId;

      const friendships = await prisma.friendship.findMany({
        where: {
          sender_id: userId,
          status: 'Friend'
        },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              profilePic: true,
              online_status: true,
              createdAt: true,
              wins: true,
              losses: true
            }
          }
        }
      });

      const friends = friendships.map(friendship => ({
        id: friendship.receiver.id,
        name: friendship.receiver.username,
        status: friendship.receiver.online_status,
        rank: friendship.receiver.wins,
        lastActive: friendship.receiver.createdAt.toISOString(),
        friendshipId: friendship.receiver.id.toString()
      }));

      return reply.send(friends);

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch friends' });
    }
  });
}