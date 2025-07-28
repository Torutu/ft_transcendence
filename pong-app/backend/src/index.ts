// import Fastify from 'fastify';
// import fastifyCors from '@fastify/cors';
// import fastifyPlugin from 'fastify-plugin';
// import { PrismaClient } from '@prisma/client';
// import authRoutes from './routes/auth';
// import { cleanEnv, str, num } from 'envalid';

// // 1. Environment Validation
// const env = cleanEnv(process.env, {
//   PORT: num({ default: 3000 }),
//   DATABASE_URL: str(),
//   JWT_SECRET: str(),
//   GOOGLE_CLIENT_ID: str(),
//   GOOGLE_CLIENT_SECRET: str(),
//   GOOGLE_REDIRECT_URI: str(),
//   FRONTEND_URL: str({ default: 'http://localhost:5173' })
// });

// // 2. Fastify Initialization (Choose ONE of these options)

// // OPTION 1: With Pino Pretty Logger (recommended)
// const app = Fastify({ 
//   logger: {
//     level: 'info',
//     transport: {
//       target: 'pino-pretty',
//       options: {
//         colorize: true,
//         translateTime: 'HH:MM:ss Z',
//         ignore: 'pid,hostname',
//         singleLine: true
//       }
//     }
//   }
// });

// // OPTION 2: Without Fastify Logger (use console.log instead)
// // const app = Fastify({ logger: false });

// // 3. Register Plugins
// app.register(fastifyCors, {
//   origin: [env.FRONTEND_URL],
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true
// });

// app.register(fastifyPlugin(async (fastify) => {
//   const prisma = new PrismaClient();
//   await prisma.$connect();
//   fastify.decorate('prisma', prisma);
//   fastify.addHook('onClose', async () => {
//     await prisma.$disconnect();
//   });
// }));

// // 4. Register Routes
// app.register(authRoutes, { prefix: '/auth' });

// // 5. Health Check Endpoint
// app.get('/health', async () => {
//   return { status: 'OK', timestamp: new Date().toISOString() };
// });

// // 6. Start Server
// const start = async () => {
//   try {
//     const address = await app.listen({
//       port: env.PORT,
//       host: '0.0.0.0'
//     });
    
//     // If using OPTION 2 (logger: false), uncomment this:
//     // console.log(`Server running at ${address}`);
//   } catch (err) {
//     app.log.error(err);
//     process.exit(1);
//   }
// };

// // 7. Graceful Shutdown
// ['SIGINT', 'SIGTERM'].forEach(signal => {
//   process.on(signal, () => {
//     app.close().then(() => {
//       app.log.info('Server closed');
//       process.exit(0);
//     });
//   });
// });

// start();


// backend/src/index.ts
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyPlugin from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth';
import env from './env';
import fs from 'fs';
import path from 'path';


// Reference: https://github.com/fastify/fastify/discussions/5297
const isHttps = fs.existsSync(".../privkey.pem") && fs.existsSync(".../fullchain.pem")

// Fastify Initialization with Pino Pretty Logger
// If you want to use the default logger, you can set `logger: true` instead
// of providing a custom logger configuration.
// If you want to disable the logger, set `logger: false`.
// For production, you might want to use a more robust logging solution.
// For development, you can use `pino-pretty` for better readability.
// Uncomment the following line if you want to use the default logger
// const app = Fastify({ logger: true });


// Initialize Fastify with custom logger configuration
const app = Fastify({ 
  logger: {
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
  },
  ...(isHttps ? {
    https: {
      key: fs.readFileSync(".../privkey.pem"),
      cert: fs.readFileSync(".../fullchain.pem"),
    },
  } : null)
});

// Register CORS with validated FRONTEND_URL
app.register(fastifyCors, {
  origin: [env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
});

// Register Prisma and Auth routes
app.register(fastifyPlugin(async (fastify) => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  
  fastify.decorate('prisma', prisma);
  fastify.register(authRouter, { prisma });
  
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}));

// Health check
app.get('/health', async () => {
  return { status: 'OK', timestamp: new Date().toISOString() };
});

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