import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';
import {
    createScene,
    createCamera,
    createRenderer,
    addLights,
    createTable,
    createNet,
    createPaddle,
    createBall,    
    createScoreElement,
    updateScoreDisplay,    
  } from './common/SceneSetup';

class LANGame {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private paddle1!: THREE.Mesh;
    private paddle2!: THREE.Mesh;
    private ball!: THREE.Mesh;
    private score1: number;
    private score2: number;
    private scoreElement: HTMLElement;
    private container: HTMLElement;
    private playerSide: 'left' | 'right' | null = null; 
    private socket: Socket;

    constructor(container: HTMLElement) {
        this.container = container;
        this.scene = createScene();
        this.camera = createCamera(this.container);
        this.renderer = createRenderer(this.container);
        addLights(this.scene);
        
        const table = createTable();
        this.scene.add(table);
        
        const net = createNet();
        this.scene.add(net);
        
        this.paddle1 = createPaddle();
        this.paddle1.position.set(-9, 0, 0);
        this.scene.add(this.paddle1);
        
        this.paddle2 = createPaddle();
        this.paddle2.position.set(9, 0, 0);
        this.scene.add(this.paddle2);
        
        this.ball = createBall();
        this.scene.add(this.ball);

        this.score1 = 0;
        this.score2 = 0;    
        this.scoreElement = createScoreElement(this.container);

        this.animate();
        this.onWindowResize();  // initial size adjustment

        const host_ip = import.meta.env.VITE_HOST_IP;
        this.socket = io(`wss://${host_ip}`, {
            path: '/socket.io',
            transports: ['websocket'],
            secure: true
        });
        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
          });

        this.socket.on('playerSide', (side) => {
            this.playerSide = side;
            this.setupEventListeners();
        });
        
        this.socket.on('stateUpdate', (state) => {
            this.paddle1.position.z = state.paddles.left.z;
            this.paddle2.position.z = state.paddles.right.z;
            this.ball.position.set(state.ball.x, 0, state.ball.z);
            this.score1 = state.scores[0];
            this.score2 = state.scores[1];
            this.updateScore();
        });

        this.socket.on('waiting', () => {
            this.scoreElement.textContent = 'Waiting for opponent...';
        });
    }

    private setupEventListeners(): void {  
        window.addEventListener('keydown', (e) => {
            if (!this.playerSide) {
                return;
              }    
            if (e.key === 'w' || e.key === 'ArrowUp') {
                this.socket.emit('move', 'up', true);
            }
            if (e.key === 's' || e.key === 'ArrowDown') {
                this.socket.emit('move', 'down', true);
            }
        });
        window.addEventListener('keyup', (e) => {
            if (!this.playerSide) {
                return;
              }            
            if (e.key === 'w' || e.key === 'ArrowUp') {
                this.socket.emit('move', 'up', false);                
            }
            if (e.key === 's' || e.key === 'ArrowDown') {
                this.socket.emit('move', 'down', false);
            }
        });
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private onWindowResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private updateScore(): void {
        this.scoreElement.textContent = `Player 1: ${this.score1} - Player 2: ${this.score2}`;
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

export default LANGame;