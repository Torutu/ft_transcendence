// backend/src/routes/friendRoutes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface FriendRoutesOptions {
  prisma: PrismaClient;
}

export default function friendRoutes(app: FastifyInstance, options: FriendRoutesOptions) {
  const { prisma } = options;

  // Helper function to verify authentication
  const verifyAuth = (request: FastifyRequest) => {
    const token = request.cookies.authToken;
    if (!token) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }
    return app.jwt.verify(token) as { userId: number; username: string };
  };

  // GET /friends - User's friends list (for RallySquadTab)
  app.get('/friend/friends', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { sender_id: decoded.userId },
            { receiver_id: decoded.userId }
          ],
          status: 'Friend'
        },
        include: {
          sender: {
            select: { 
              id: true, 
              username: true, 
              online_status: true, 
              profilePic: true,
              email: true,
              createdAt: true
            }
          },
          receiver: {
            select: { 
              id: true, 
              username: true, 
              online_status: true, 
              profilePic: true,
              email: true,
              createdAt: true
            }
          }
        }
      });

      // Map friendships to friends array
      const allFriends = friendships.map(friendship => {
        const friend = friendship.sender_id === decoded.userId 
          ? friendship.receiver 
          : friendship.sender;
        
        return {
          friendshipId: `${friendship.sender_id}-${friendship.receiver_id}`,
          status: friendship.status,
          friend: {
            id: friend.id,
            name: friend.username,
            email: friend.email,
            online_status: friend.online_status,
            profilePic: friend.profilePic,
            createdAt: friend.createdAt
          }
        };
      });

      // Deduplicate friends by friend ID
      const uniqueFriends = allFriends
        .filter((friendship, index, self) => 
          index === self.findIndex(f => f.friend.id === friendship.friend.id)
        );

      console.log(`Found ${friendships.length} friendship records, filtered to ${uniqueFriends.length} unique friends for user ${decoded.userId}`);
      
      return reply.send(uniqueFriends);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Get friends error:', error);
      return reply.status(500).send({ error: 'FRIENDS_FETCH_FAILED', message: 'Failed to fetch friends' });
    }
  });

  // GET /friends/online - Online friends only (for OverviewTab)
  app.get('/friend/online', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { sender_id: decoded.userId },
            { receiver_id: decoded.userId }
          ],
          status: 'Friend'
        },
        include: {
          sender: {
            select: { id: true, username: true, online_status: true }
          },
          receiver: {
            select: { id: true, username: true, online_status: true }
          }
        }
      });

      // Map to friends and filter online
      const allFriends = friendships
        .map(friendship => friendship.sender_id === decoded.userId 
          ? friendship.receiver 
          : friendship.sender)
        .filter(friend => friend.online_status === 'online');

      // Deduplicate friends by ID
      const uniqueOnlineFriends = allFriends
        .filter((friend, index, self) => 
          index === self.findIndex(f => f.id === friend.id)
        )
        .map(friend => ({
          id: friend.id,
          name: friend.username,
          status: friend.online_status
        }));

      console.log(`Found ${friendships.length} friendship records, ${allFriends.length} online friends (with duplicates), ${uniqueOnlineFriends.length} unique online friends for user ${decoded.userId}`);
      
      return reply.send(uniqueOnlineFriends);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Get online friends error:', error);
      return reply.status(500).send({ error: 'ONLINE_FRIENDS_FETCH_FAILED', message: 'Failed to fetch online friends' });
    }
  });

  // GET /friends/users/search - Search users (for RallySquadTab)
  app.get('/friend/users/search', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const { q, online_only } = request.query as { q?: string; online_only?: string };

      let whereCondition: any = {
        id: { not: decoded.userId }
      };

      if (q) {
        whereCondition.OR = [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ];
      }

      if (online_only === 'true') {
        whereCondition.online_status = 'online';
      }

      const users = await prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          username: true,
          email: true,
          online_status: true,
          createdAt: true,
          profilePic: true
        },
        take: q ? 20 : 50,
        orderBy: { username: 'asc' }
      });

      const usersWithStatus = users.map(user => ({
        id: user.id,
        name: user.username,
        email: user.email,
        online_status: user.online_status,
        createdAt: user.createdAt,
        profilePic: user.profilePic,
        friendshipStatus: 'NotFriend'
      }));

      return reply.send(usersWithStatus);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Search users error:', error);
      return reply.status(500).send({ error: 'USER_SEARCH_FAILED', message: 'Failed to search users' });
    }
  });

  // GET /friend/requests - Get both received and sent friend requests
  app.get('/friend/requests', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      
      // Get requests TO this user (received)
      const receivedRequests = await prisma.friendship.findMany({
        where: {
          receiver_id: decoded.userId,
          status: 'Pending'
        },
        include: {
          sender: {
            select: { id: true, username: true, email: true, profilePic: true, createdAt: true }
          }
        }
      });

      // Get requests FROM this user (sent)
      const sentRequests = await prisma.friendship.findMany({
        where: {
          sender_id: decoded.userId,
          status: 'Pending'
        },
        include: {
          receiver: {
            select: { id: true, username: true, email: true, profilePic: true, createdAt: true }
          }
        }
      });

      // Map received requests
      const mappedReceivedRequests = receivedRequests.map(request => ({
        requestId: `${request.sender_id}-${request.receiver_id}`,
        type: 'received',
        user: {
          id: request.sender.id,
          name: request.sender.username,
          email: request.sender.email,
          profilePic: request.sender.profilePic,
          createdAt: request.sender.createdAt
        }
      }));

      // Map sent requests
      const mappedSentRequests = sentRequests.map(request => ({
        requestId: `${request.sender_id}-${request.receiver_id}`,
        type: 'sent',
        user: {
          id: request.receiver.id,
          name: request.receiver.username,
          email: request.receiver.email,
          profilePic: request.receiver.profilePic,
          createdAt: request.receiver.createdAt
        }
      }));

      // Combine both arrays
      const allRequests = [...mappedReceivedRequests, ...mappedSentRequests];

      console.log(`Found ${receivedRequests.length} received requests and ${sentRequests.length} sent requests for user ${decoded.userId}`);

      return reply.send(allRequests);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Get requests error:', error);
      return reply.status(500).send({ error: 'REQUESTS_FETCH_FAILED', message: 'Failed to fetch requests' });
    }
  });

  // POST /friend/request/:userId - Send friend request
  app.post<{ Params: { userId: string } }>('/friend/request/:userId', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const targetUserId = parseInt(request.params.userId);

      if (targetUserId === decoded.userId) {
        return reply.status(400).send({ error: 'SELF_REQUEST', message: 'Cannot send friend request to yourself' });
      }

      // Get usernames for the friendship records
      const [senderUser, targetUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { username: true }
        }),
        prisma.user.findUnique({
          where: { id: targetUserId },
          select: { username: true }
        })
      ]);

      if (!targetUser) {
        return reply.status(404).send({ error: 'USER_NOT_FOUND', message: 'Target user not found' });
      }

      // FIXED: Use upsert to create record if it doesn't exist
      await prisma.friendship.upsert({
        where: {
          sender_id_receiver_id: {
            sender_id: decoded.userId,
            receiver_id: targetUserId
          }
        },
        create: {
          sender_id: decoded.userId,
          receiver_id: targetUserId,
          sender_username: senderUser!.username,
          receiver_username: targetUser.username,
          status: 'Pending'
        },
        update: {
          status: 'Pending'
        }
      });

      // Also create the reverse direction for bidirectional lookup
      await prisma.friendship.upsert({
        where: {
          sender_id_receiver_id: {
            sender_id: targetUserId,
            receiver_id: decoded.userId
          }
        },
        create: {
          sender_id: targetUserId,
          receiver_id: decoded.userId,
          sender_username: targetUser.username,
          receiver_username: senderUser!.username,
          status: 'NotFriend'
        },
        update: {
          // Don't change existing status in reverse direction
        }
      });

      console.log(`Friend request sent from user ${decoded.userId} to user ${targetUserId}`);

      return reply.send({ message: 'Friend request sent successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Send friend request error:', error);
      return reply.status(500).send({ error: 'REQUEST_SEND_FAILED', message: 'Failed to send friend request' });
    }
  });

  // POST /friend/accept/:requestId - Accept friend request  
  app.post<{ Params: { requestId: string } }>('/friend/accept/:requestId', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const [senderId, receiverId] = request.params.requestId.split('-').map(Number); 

      if (receiverId !== decoded.userId) {
        return reply.status(403).send({ error: 'UNAUTHORIZED', message: 'Cannot accept this request' });
      }

      // Set both directions to Friend
      await prisma.$transaction([
        prisma.friendship.updateMany({
          where: { sender_id: senderId, receiver_id: receiverId },
          data: { status: 'Friend' }
        }),
        prisma.friendship.updateMany({
          where: { sender_id: receiverId, receiver_id: senderId },
          data: { status: 'Friend' }
        })
      ]);

      console.log(`Friend request accepted: ${senderId} and ${receiverId} are now friends`);

      return reply.send({ message: 'Friend request accepted' });
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Accept friend request error:', error);
      return reply.status(500).send({ error: 'ACCEPT_FAILED', message: 'Failed to accept request' });
    }
  });

  // DELETE /friend/decline/:requestId - Decline friend request
  app.delete<{ Params: { requestId: string } }>('/friend/decline/:requestId', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const [senderId, receiverId] = request.params.requestId.split('-').map(Number);

      if (receiverId !== decoded.userId) {
        return reply.status(403).send({ error: 'UNAUTHORIZED', message: 'Cannot decline this request' });
      }

      // Set both directions to NotFriend
      await prisma.$transaction([
        prisma.friendship.updateMany({
          where: { sender_id: senderId, receiver_id: receiverId },
          data: { status: 'NotFriend' }
        }),
        prisma.friendship.updateMany({
          where: { sender_id: receiverId, receiver_id: senderId },
          data: { status: 'NotFriend' }
        })
      ]);

      console.log(`Friend request declined: ${senderId} to ${receiverId}`);

      return reply.send({ message: 'Friend request declined' });
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Decline friend request error:', error);
      return reply.status(500).send({ error: 'DECLINE_FAILED', message: 'Failed to decline request' });
    }
  });

  // DELETE /friend/remove/:friendshipId - Remove friend
  app.delete<{ Params: { friendshipId: string } }>('/friend/remove/:friendshipId', async (request, reply) => {
    try {
      const decoded = verifyAuth(request);
      const [userId1, userId2] = request.params.friendshipId.split('-').map(Number); 

      if (decoded.userId !== userId1 && decoded.userId !== userId2) {
        return reply.status(403).send({ error: 'UNAUTHORIZED', message: 'Cannot remove this friendship' });
      }

      // Set both directions to NotFriend
      await prisma.$transaction([
        prisma.friendship.updateMany({
          where: { sender_id: userId1, receiver_id: userId2 },
          data: { status: 'NotFriend' }
        }),
        prisma.friendship.updateMany({
          where: { sender_id: userId2, receiver_id: userId1 },
          data: { status: 'NotFriend' }
        })
      ]);

      console.log(`Friendship removed between users ${userId1} and ${userId2}`);

      return reply.send({ message: 'Friendship removed' });
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
        return reply.status(401).send({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' });
      }
      console.error('Remove friend error:', error);
      return reply.status(500).send({ error: 'REMOVE_FAILED', message: 'Failed to remove friend' });
    }
  });
}