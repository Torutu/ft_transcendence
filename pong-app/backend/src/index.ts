// pong-app/backend/src/index.ts
// Main server entry point
import fastify, { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import { setupLobby } from "./quickmatch";
import { setupTournamentLobby } from "./tournament";
import { setupPongNamespace } from "./PongServer";
import { setupKeyClash } from "./KeyClashGame";
import { fileURLToPath } from "url";
import env from "./env";
import registerRoutes from "./routes/index";
import { PrismaClient } from "@prisma/client";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function buildServer() {
  // Check multiple possible locations for SSL files
  const possibleSSLDirs = [
    path.join(__dirname, "../../tls"), // Mounted volume location
    path.join(__dirname, "../tls"), // Alternative location
    path.join(process.cwd(), "tls"), // Current working directory
    "/app/tls", // Absolute path in container
    "/ssl", // Common SSL directory
  ];

  let certPath = "";
  let keyPath = "";
  let sslFilesExist = false;

  // Check all possible locations
  for (const sslDir of possibleSSLDirs) {
    const currentCertPath = path.join(sslDir, "cert.pem");
    const currentKeyPath = path.join(sslDir, "key.pem");

    if (fs.existsSync(currentCertPath) && fs.existsSync(currentKeyPath)) {
      certPath = currentCertPath;
      keyPath = currentKeyPath;
      sslFilesExist = true;
      console.log(`SSL files found in: ${sslDir}`);
      break;
    }
  }

  if (!sslFilesExist) {
    console.error(
      "❌ SSL certificates not found! Server cannot start without HTTPS."
    );
    console.error("Checked directories:", possibleSSLDirs);
    console.error("Please provide SSL certificates in one of these locations:");
    possibleSSLDirs.forEach((dir) => console.error(`- ${dir}`));
    process.exit(1);
  }

  console.log("🔐 Configuring server for HTTPS...");
  console.log(`Certificate path: ${certPath}`);
  console.log(`Key path: ${keyPath}`);

  const serverOptions = {
    https: {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
      },
    },
  };

  const server: FastifyInstance = fastify(serverOptions);

  // Register JWT plugin
  await server.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: "authToken",
      signed: false,
    },
  });

  // Register cookie plugin
  await server.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest",
  });

  // Register CORS with credentials
  await server.register(fastifyCors, {
    origin: [env.FRONTEND_REMOTE_URL, env.FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // Register routes
  await registerRoutes(server, { prisma });

  // Health check endpoint
  server.get("/health", async () => {
    return { status: "OK", timestamp: new Date().toISOString() };
  });

  // socket.io server around the fastify server
  const io = new Server(server.server, {
    cors: {
      origin: [env.FRONTEND_REMOTE_URL, env.FRONTEND_URL],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  setupLobby(io);
  setupTournamentLobby(io);
  setupPongNamespace(io, prisma);
  setupKeyClash(io, prisma);

  return server;
}

async function startServer() {
  try {
    const server = await buildServer();

    // Check database connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    const address = await server.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });

    console.log(`🚀 Server listening securely at ${address}`);
    console.log(`🩺 Health check available at ${address}/health`);
    console.log(`🎮 Lobby API available at ${address}/lobby/*`);
  } catch (err) {
    console.error("❌ Error starting server:", err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
