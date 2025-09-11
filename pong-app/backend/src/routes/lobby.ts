// backend/src/routes/lobby.ts
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function lobbyRoutes(fastify: FastifyInstance) {
  // Lobby Stats
  fastify.get("/api/lobby/stats", async (request, reply) => {
    const userId = request.userId;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

const matches = await prisma.match.findMany({
  where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
  orderBy: { playedAt: 'desc' }, // ✅ Use 'playedAt'
});

    const totalMatches = matches.length;
    const wins = matches.filter(m => m.winnerId === userId).length;
    const losses = totalMatches - wins;
    const draws = 0;
    const winRate = totalMatches ? Math.round((wins / totalMatches) * 100) : 0;
    let currentWinStreak = 0;
    for (const match of matches) {
      if (match.winnerId === userId) {
        currentWinStreak++; // Consecutive win
      } else {
        break; // Lost a match, streak ends
      }
    }
const monthlyWins = matches.filter(m =>
  m.winnerId === userId && m.playedAt.getMonth() === new Date().getMonth()
).length;

    reply.send({ totalMatches, wins, losses, draws, winRate, currentWinStreak, monthlyWins });
  });

  // Purpose: Used by the Overview tab to show online friends
fastify.get("/api/lobby/friends", async (request, reply) => {
  const userId = request.userId;
  if (!userId) return reply.status(401).send({ error: "Unauthorized" });

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { senderId: userId, status: "Friend" },
        { receiverId: userId, status: "Friend" },
      ],
    },
    include: { sender: true, receiver: true },
  });

  const friendList = friendships
    .map(f => ({
      friendship: f,
      friend: f.senderId === userId ? f.receiver : f.sender
    }))
    .map(({ friendship, friend }) => ({
      id: friend.id,
      name: friend.name,
      status: friend.online_status ?? "offline",
      lastActive: friend.last_activity ?? null,
      avatarUrl: friend.avatarUrl,
      email: friend.email,
      friendshipId: friendship.id, // ✅ Add this line
    }));

  reply.send(friendList);
});

  // Recent Matches
  fastify.get("/api/lobby/recent-matches", async (request, reply) => {
    const userId = request.userId;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const matches = await prisma.match.findMany({
      where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
      orderBy: { playedAt: "desc" },
      take: 10,
    });

    const recentMatches = matches.map(match => {
      const opponent = match.player1Id === userId ? match.player2Name : match.player1Name;
      let result = "draw";
      if (match.winnerId === userId) result = "win";
      else if (match.winnerId) result = "loss";
      return {
        id: match.id,
        opponent,
        result,
        score: `${match.player1Score}-${match.player2Score}`,
        playedAt: match.playedAt,
      };
    });

    reply.send(recentMatches);
  });

  // Profile (My Locker)
  fastify.get("/api/lobby/profile", async (request, reply) => {
    const userId = request.userId;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: "User not found" });

    reply.send({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      wins: user.wins,
      losses: user.losses,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      favAvatar: user.favAvatar,
      language: user.language,
      profilePic: user.profilePic,
      level: user.level,
    });
  });

  // Update Profile (My Locker Form)
  fastify.post("/api/lobby/profile", async (request, reply) => {
    const userId = request.userId;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = request.body as {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      dateOfBirth?: string;
      gender?: string;
      favAvatar?: string;
      language?: string;
      profilePic?: string;
      level?: string;
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        avatarUrl: body.avatarUrl,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        gender: body.gender,
        favAvatar: body.favAvatar,
        language: body.language,
        profilePic: body.profilePic,
        level: body.level,
      },
    });
    reply.send({ success: true, user });
  });

  // Purpose: Shows incoming friend requests
  fastify.get("/api/lobby/friend-requests", async (request, reply) => {
    const userId = request.userId;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const requests = await prisma.friendship.findMany({
      where: { receiverId: userId, status: "Pending" },
      include: { sender: true },
    });

    reply.send(
      requests.map(req => ({
        id: req.id,
        sender_username: req.sender.name,
        sender_email: req.sender.email,
      }))
    );
  });

// 1. Search users (for finding new friends)
fastify.get("/api/lobby/search-users", async (request, reply) => {
  const userId = request.userId;
  if (!userId) return reply.status(401).send({ error: "Unauthorized" });

  const searchQuery = request.query as { q?: string };
  console.log(`🔍 Search query: "${searchQuery.q}" by user: ${userId}`);
  
  let whereClause: any = {
    id: { not: userId } // Exclude current user
  };

  if (searchQuery.q && searchQuery.q.trim()) {
    const searchTerm = searchQuery.q.toLowerCase();
    
    const allUsers = await prisma.user.findMany({
      where: {
        id: { not: userId }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        online_status: true
      }
    });

    // Filter in JavaScript for case-insensitive search
    const filteredUsers = allUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );

    console.log(`🔍 Found ${filteredUsers.length} users matching "${searchQuery.q}"`);
    return reply.send(filteredUsers.slice(0, 20)); // Limit to 20 results
  }

  // If no search query, return all users (excluding current user)
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      online_status: true
    },
    take: 20
  });

  console.log(`🔍 Found ${users.length} users`);
  reply.send(users);
});

// 2. Send friend request
fastify.post("/api/lobby/send-friend-request", async (request, reply) => {
  const userId = request.userId;
  if (!userId) return reply.status(401).send({ error: "Unauthorized" });

  const { receiverId } = request.body as { receiverId: string };

  // Check if friendship already exists
  const existingFriendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId: userId, receiverId: receiverId },
        { senderId: receiverId, receiverId: userId }
      ]
    }
  });

  if (existingFriendship) {
    return reply.status(400).send({ error: "Friendship already exists" });
  }

  const friendship = await prisma.friendship.create({
    data: {
      senderId: userId,
      receiverId: receiverId,
      status: "Pending"
    }
  });

  reply.send({ success: true, friendshipId: friendship.id });
});

// 3. Accept/decline friend request
fastify.post("/api/lobby/respond-friend-request", async (request, reply) => {
  const userId = request.userId;
  if (!userId) return reply.status(401).send({ error: "Unauthorized" });

  const { friendshipId, action } = request.body as { friendshipId: string, action: 'accept' | 'decline' };

  console.log(`📝 ${action} friend request ${friendshipId} by user ${userId}`);

  try {
    if (action === 'accept') {
      const friendship = await prisma.friendship.update({
        where: {
          id: friendshipId,
          receiverId: userId,
          status: "Pending"
        },
        data: { status: "Friend" }
      });
      console.log(`✅ Friend request accepted: ${friendshipId}`);
      reply.send({ success: true, friendship });
    } else if (action === 'decline') {
      await prisma.friendship.delete({
        where: {
          id: friendshipId,
          receiverId: userId,
          status: "Pending"
        }
      });
      console.log(`✅ Friend request declined: ${friendshipId}`);
      reply.send({ success: true });
    } else {
      reply.status(400).send({ error: "Invalid action" });
    }
  } catch (error) {
    console.error(`❌ Error ${action}ing friend request:`, error);
    reply.status(500).send({ error: `Failed to ${action} friend request` });
  }
});



// 4. Remove friend
fastify.delete("/api/lobby/remove-friend/:friendshipId", async (request, reply) => {
  const userId = request.userId;
  if (!userId) return reply.status(401).send({ error: "Unauthorized" });

  const { friendshipId } = request.params as { friendshipId: string };

  await prisma.friendship.delete({
    where: {
      id: friendshipId,
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ],
      status: "Friend"
    }
  });

  reply.send({ success: true });
});


  // Leaderboard
  fastify.get("/api/lobby/leaderboard", async (request, reply) => {
    const users = await prisma.user.findMany({
      orderBy: { wins: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        wins: true,
        losses: true,
        level: true,
      }
    });
    reply.send(users);
  });

fastify.get("/api/avatars", async (request, reply) => {
    reply.send([
      { id: 'fire', name: 'Fire', imageUrl: '/avatars/starboy.png', color: 'bg-red-500' },
      { id: 'cool', name: 'Cool', imageUrl: '/avatars/skyboy.jpg', color: 'bg-blue-500' },
      { id: 'star', name: 'Star', imageUrl: '/avatars/playboy.webp', color: 'bg-yellow-500' },
      { id: 'rocket', name: 'Rocket', imageUrl: '/avatars/rocket.png', color: 'bg-purple-500' },
      { id: 'crown', name: 'Crown', imageUrl: '/avatars/fungirl.webp', color: 'bg-yellow-600' },
      { id: 'lightning', name: 'Lightning', imageUrl: '/avatars/naughtygirl.webp', color: 'bg-indigo-500' },
    ]);
  });

  
}