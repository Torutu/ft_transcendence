import Fastify from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = Fastify();

// Register Prisma plugin
app.register(fastifyPlugin(async (fastify) => {
  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}));

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


// Start the server
async function start() {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' }); // Use host 0.0.0.0 to work inside Docker
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();