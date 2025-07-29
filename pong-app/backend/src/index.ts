import Fastify from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import fastifyIo from 'fastify-socket.io';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = Fastify();

await app.register(fastifyCors, {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true,
});

// Register Prisma plugin
app.register(fastifyPlugin(async (fastify) => {
  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}));

app.register(fastifyIo, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.get('/', async () => {
  return { message: 'Backend running' };
});

// POST /register
app.post<{ Body: { email: string; password: string; name?: string } }>('/register', async (request, reply) => {
  const { email, password, name } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });
  reply.send(user);
});

// POST /login
app.post<{ Body: { email: string; password: string } }>('/login', async (request, reply) => {
  const { email, password } = request.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    reply.send({ token });
  } else {
    reply.status(401).send({ message: 'Invalid credentials' });
  }
});

// PUT /profile
app.put<{ Body: { userId: string; name?: string; avatarUrl?: string } }>('/profile', async (request, reply) => {
  const { userId, name, avatarUrl } = request.body;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, avatarUrl },
  });
  reply.send(user);
});

// POST /match
app.post<{ Body: { player1Id: string; player2Id: string; winnerId: string } }>('/match', async (request, reply) => {
  const { player1Id, player2Id, winnerId } = request.body;
  const match = await prisma.match.create({
    data: { player1Id, player2Id, winnerId },
  });
  reply.send(match);
});

// GET /matches/:userId
app.get<{ Params: { userId: string } }>('/matches/:userId', async (request, reply) => {
  const { userId } = request.params;
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { player1Id: userId },
        { player2Id: userId },
      ],
    },
  });
  reply.send(matches);
});

let players: { [socketId: string]: 'left' | 'right' } = {};
let gameState = {
ball: { x: 0, z: 0, vx: 0.1, vz: 0 },
paddles: { left: { z: 0 }, right: { z: 0 } },
scores: [0, 0]
};

function resetBall() {
const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
const speed = 0.1;
gameState.ball.x = 0;
gameState.ball.z = 0;
gameState.ball.vx = Math.random() > 0.5 ? speed : -speed;
gameState.ball.vz = Math.sin(angle) * speed;
}

resetBall();

setInterval(() => {
  const ball = gameState.ball;

  ball.x += ball.vx;
  ball.z += ball.vz;

  if (ball.z > 4 || ball.z < -4) {
    ball.vz *= -1;
  }

  const left = gameState.paddles.left;
  const right = gameState.paddles.right;

  if (ball.x < -8.5 && ball.x > -9.5 && Math.abs(ball.z - left.z) < 1.5) {
    ball.vx *= -1;
    ball.vz = (ball.z - left.z) * 0.3;
  }

  if (ball.x > 8.5 && ball.x < 9.5 && Math.abs(ball.z - right.z) < 1.5) {
    ball.vx *= -1;
    ball.vz = (ball.z - right.z) * 0.3;
  }

  if (ball.x < -10) {
    gameState.scores[1]++;
    resetBall();
  }

  if (ball.x > 10) {
    gameState.scores[0]++;
    resetBall();
  }

  app.server.emit('stateUpdate', gameState);
}, 1000 / 60);

async function start() {
  try {
    await app.ready();

    app.listen({ port: 3000, host: '0.0.0.0'}, () => {
    console.log('Server running at http://localhost:3000');
    });
    app.server.on('connection', socket => {
      console.log('Player connected');
      
        const playerNumber = Object.values(players).includes('left') ? 'right' : 'left';
        players[0] = playerNumber;
      
        socket.emit('playerType', playerNumber);
        socket.emit('init', gameState);
      
        socket.on('move', (direction: string) => {
          const paddle = gameState.paddles[playerNumber];
          if (direction === 'up' && paddle.z < 3.5) paddle.z += 0.2;
          if (direction === 'down' && paddle.z > -3.5) paddle.z -= 0.2;
        });
      
        socket.on('disconnect', () => {
          console.log(`Player disconnected:`);
          delete players[0];
        });
      });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();