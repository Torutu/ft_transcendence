// backend/src/plugins/authHook.ts
// Fastify hook to extract and verify JWT from cookies
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from '../utils/auth'; // You must implement this

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export default async function authHook(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.authToken;
    if (!token) {
      request.userId = undefined;
      return;
    }
    try {
      const decoded = verifyToken(token) as { userId: string };
      request.userId = decoded.userId;
    } catch {
      request.userId = undefined;
    }
  });
}