import { gameRooms, getLobbyState } from "./gameData.js";

export function setupGame(io) {
    const gameNamespace = io.of('/game');
    const lobbyNamespace = io.of('/lobby');

    function resetAll() {
        return {
            ball: { x: 0, z: 0, vx: 0.1, vz: 0 },
            paddles: {
              left: { z: 0, moveUp: false, moveDown: false },
              right: { z: 0, moveUp: false, moveDown: false }
            },
            scores: [0, 0]
        };
    }

    function resetBall(gameState) {
        const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
        const speed = 0.1;
        gameState.ball.x = 0;
        gameState.ball.z = 0;
        gameState.ball.vx = Math.random() > 0.5 ? speed : -speed;
        gameState.ball.vz = Math.sin(angle) * speed;
    }

    function startLoop(roomId) {
        const game = gameRooms.find(g => g.id === roomId);
        if (!game || game.loop) return;
        if (!game.state) game.state = resetAll();

        game.loop = setInterval(() => {
            const state = game.state;

            if (Object.keys(game.players).length < 2) {
                gameNamespace.to(roomId).emit('waiting');
                return;
            }

            const ball = state.ball;
            ball.x += ball.vx;
            ball.z += ball.vz;
        
            if (ball.z > 4 || ball.z < -4) {
                ball.vz *= -1;
            }
        
            const left = state.paddles.left;
            const right = state.paddles.right;
        
            if (left.moveUp && left.z > -3.5) left.z -= game.paddleSpeed;
            if (left.moveDown && left.z < 3.5) left.z += game.paddleSpeed;
            if (right.moveUp && right.z > -3.5) right.z -= game.paddleSpeed;
            if (right.moveDown && right.z < 3.5) right.z += game.paddleSpeed;
        
            if (ball.x < -8.5 && ball.x > -9.5 && Math.abs(ball.z - left.z) < 1.5) {
                ball.vx *= -1;
                ball.vz = (ball.z - left.z) * 0.3;
            }
        
            if (ball.x > 8.5 && ball.x < 9.5 && Math.abs(ball.z - right.z) < 1.5) {
                ball.vx *= -1;
                ball.vz = (ball.z - right.z) * 0.3;
            }
        
            if (ball.x < -10) {
                state.scores[1]++;
                resetBall(state);     
            }
        
            if (ball.x > 10) {
                state.scores[0]++; 
                resetBall(state);     
            }
        
            gameNamespace.to(roomId).emit('stateUpdate', state);
        }, 1000 / 60);
    }
    
    function stopLoop(roomId) {
        const game = gameRooms.find(g => g.id === roomId);
        if (!game || !game.loop) return;
        if (game.loop) {
            clearInterval(game.loop);
            game.loop = null;
        }
    }

    gameNamespace.on('connection', (socket) => {
        console.log('Player connected to game');
  
        socket.on('join_game_room', (roomId, name) => {
            const gameRoom = gameRooms.find(g => g.id === roomId);
            if (!gameRoom) {
                gameRoom = {
                    id: roomId,
                    players: {},
                    state: resetAll(),
                    loop: null,
                    paddleSpeed: 0.2,
                    status: 'waiting'
                };
                gameRooms.push(gameRoom);
            }
            
            socket.roomId = roomId;
            let playerSide = null;

            if (Object.keys(gameRoom.players).length === 0) {
                playerSide = 'left';
                gameRoom.player1name = name;
            }
            else if (Object.keys(gameRoom.players).length === 1){
                for (const player of Object.values(gameRoom.players))
                    {
                        if (player.side === 'left')
                            playerSide = 'right'
                        else if (player.side === 'right')
                            playerSide = 'left';
                    }
                // playerSide = 'right';
                gameRoom.player2name = name;
            }

            gameRoom.players[socket.id] = { side: playerSide, name: name };

            socket.join(roomId);

            if (Object.keys(gameRoom.players).length === 2) {
                gameRoom.status = "in-progress";
                gameNamespace.emit('playerNames', gameRoom.players);
                lobbyNamespace.emit("lobby_update", getLobbyState());
            }

            console.log('player side: ', playerSide);
            console.log('players: ', gameRoom.players);
                
            socket.emit('playerSide', playerSide);
            socket.emit('stateUpdate', gameRoom.state);

            startLoop(roomId);
                
            socket.on('move', (direction, bool) => {
                if (!gameRoom) return;
                if (direction === 'up')
                    gameRoom.state.paddles[playerSide].moveUp = bool;
                else
                    gameRoom.state.paddles[playerSide].moveDown = bool;       
            });
        });
                
        socket.on('disconnect', () => {
            if (!socket.roomId) return;

            const game = gameRooms.find(g => g.id === socket.roomId);
            if (!game) return;

            delete game.players[socket.id];

            if (Object.keys(game.players).length < 2) {
                stopLoop(socket.roomId);
            }

            game.status = "waiting";
            lobbyNamespace.emit("lobby_update", getLobbyState());    

            if (Object.keys(game.players).length === 0) {
                const i = gameRooms.findIndex(g => g.id === socket.roomId);
                if (i !== -1) gameRooms.splice(i, 1);
                lobbyNamespace.emit('lobby_update', getLobbyState());
            }
        });
    });
}