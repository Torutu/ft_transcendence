// backend/src/index.ts
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyPlugin from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import env from './env';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";
import { Server } from 'socket.io';
import { setupLobby } from './lobby';
import { setupPongNamespace } from './PongServer';
import { setupKeyClash } from './KeyClashGame';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseTlsPath = process.env.TLS_PATH || path.join(__dirname, "../../tls");

const httpsOptions = {
  key: fs.readFileSync(path.join(baseTlsPath, "key.pem")),
  cert: fs.readFileSync(path.join(baseTlsPath, "cert.pem")),
};

// Fastify Initialization with Pino Pretty Logger
// If you want to use the default logger, you can set `logger: true` instead
// of providing a custom logger configuration.
// If you want to disable the logger, set `logger: false`.
// For production, you might want to use a more robust logging solution.
// For development, you can use `pino-pretty` for better readability.
// Uncomment the following line if you want to use the default logger
// const app = Fastify({ logger: true });

const logOptions = {
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: true
    }
  }
}

// Initialize Fastify with custom logger configuration
const app = Fastify({ 
  logger: logOptions,
  https: httpsOptions
});

// Register CORS with validated FRONTEND_URL
app.register(fastifyCors, {
  origin: [
    "https://localhost:5173",
    "https://brave-widely-chigger.ngrok-free.app" // domain from ngrok
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
});

// Register Prisma and Auth routes
app.register(fastifyPlugin(async (fastify) => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  
  fastify.decorate('prisma', prisma);
  fastify.register(authRoutes, { prisma });
  
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}));

// Health check
app.get('/health', async () => {
  return { status: 'OK', timestamp: new Date().toISOString() };
});

// wrap socket.io server around the fastify server
const io = new Server(app.server, {
  cors: {
      origin: [
        "https://localhost:5173",
        "https://brave-widely-chigger.ngrok-free.app" // domain from ngrok
      ],
      methods: ['GET', 'POST'],
      credentials: true,
  }
});

setupLobby(io);
setupPongNamespace(io);
setupKeyClash(io);

// Start server
const start = async () => {
  try {
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });
    app.log.info(`Server running at ${app.server.address()}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    app.close().then(() => {
      app.log.info('Server closed');
      process.exit(0);
    });
  });
});

start();