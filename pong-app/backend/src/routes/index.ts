// backend/src/routes/index.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import friendRoutes from './friendRoutes';
import gameRoutes from './gameRoutes';

interface RouteOptions {
  prisma: PrismaClient;
}

export default async function registerRoutes(app: FastifyInstance, options: RouteOptions) {
  await app.register(authRoutes, options);
  await app.register(userRoutes, options);
  await app.register(friendRoutes, options);  
  await app.register(gameRoutes, options);
}