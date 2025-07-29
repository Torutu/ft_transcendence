import Fastify from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import fs from 'fs';

const prisma = new PrismaClient();

const app = Fastify();

const host_ip = process.env.VITE_HOST_IP;

const io = new Server(app.server, {
    cors: {
        origin: `https://${host_ip}`,
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

io.on('connection', (socket) => {
    console.log('Player connected');

    let playerSide = null;
    if (Object.keys(players).length === 0)
        playerSide = 'left';
    else if (Object.keys(players).length === 1)
        playerSide = 'right';
    players[socket.id] = playerSide;
    console.log('player: ', playerSide);
    console.log('players size: ', Object.keys(players));
        
    socket.emit('playerSide', playerSide);
    socket.emit('stateUpdate', gameState);
        
    socket.on('move', (direction, bool) => {
        if (direction === 'up')
            gameState.paddles[playerSide].moveUp = bool;
        else
            gameState.paddles[playerSide].moveDown = bool;       
    });
        
    socket.on('disconnect', () => {
        console.log(`Player disconnected:`);
        delete players[socket.id];
    });
});

// Register Prisma plugin
app.register(fastifyPlugin(async (fastify) => {
    fastify.decorate('prisma', prisma);
    fastify.addHook('onClose', async () => {
        await prisma.$disconnect();
    });
}));
// POST /register
app.post('/register', async (request, reply) => {
    const { email, password, name } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { email, password: hashedPassword, name },
    });
    reply.send(user);
});
// POST /login
app.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        reply.send({ token });
    }
    else {
        reply.status(401).send({ message: 'Invalid credentials' });
    }
});
// PUT /profile
app.put('/profile', async (request, reply) => {
    const { userId, name, avatarUrl } = request.body;
    const user = await prisma.user.update({
        where: { id: userId },
        data: { name, avatarUrl },
    });
    reply.send(user);
});
// POST /match
app.post('/match', async (request, reply) => {
    const { player1Id, player2Id, winnerId } = request.body;
    const match = await prisma.match.create({
        data: { player1Id, player2Id, winnerId },
    });
    reply.send(match);
});
// GET /matches/:userId
app.get('/matches/:userId', async (request, reply) => {
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

let players = {};
let gameState = {
ball: { x: 0, z: 0, vx: 0.1, vz: 0 },
paddles: { left: { z: 0, moveUp: false, moveDown: false }, 
            right: { z: 0, moveUp: false, moveDown: false } },
scores: [0, 0]
};
const paddleSpeed = 0.2;

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
    if (Object.keys(players).length < 2) {
        io.emit('waiting');
        return;
    }

    const ball = gameState.ball;

    ball.x += ball.vx;
    ball.z += ball.vz;

    if (ball.z > 4 || ball.z < -4) {
        ball.vz *= -1;
    }

    const left = gameState.paddles.left;
    const right = gameState.paddles.right;

    if (left.moveUp && left.z > -3.5) left.z -= paddleSpeed;
    if (left.moveDown && left.z < 3.5) left.z += paddleSpeed;
    if (right.moveUp && right.z > -3.5) right.z -= paddleSpeed;
    if (right.moveDown && right.z < 3.5) right.z += paddleSpeed;

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

    io.emit('stateUpdate', gameState);
}, 1000 / 60);


// Start the server
async function start() {
    try {
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Server running at https://${host_ip}`);
    }
    catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
}
start();
