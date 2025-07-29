import * as THREE from 'three';
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

// variable! <- should be assigned before use

class localGame {
    private container: HTMLElement;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private paddle1!: THREE.Mesh;
    private paddle2!: THREE.Mesh;
    private ball!: THREE.Mesh;
    private ballVelocity: THREE.Vector3;
    private paddleSpeed: number;
    private ballSpeed: number;
    private keys: { [key: string]: boolean };
    private score1: number;
    private score2: number;
    private scoreElement: HTMLElement;

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

        this.setupEventListeners();
        this.keys = {};
        this.paddleSpeed = 0.2;
        this.ballSpeed = 0.1;
        this.ballVelocity = new THREE.Vector3(this.ballSpeed, 0, 0);

        this.animate();
    }

    private setupEventListeners(): void {
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private resetBall(): void {
        this.ball.position.set(0, 0, 0);
        const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
        this.ballVelocity.set(
            Math.random() > 0.5 ? this.ballSpeed : -this.ballSpeed,
            0,
            Math.sin(angle) * this.ballSpeed
        );
    }

    private update(): void {
        // Player 1 controls (W/S)
        if (this.keys['w'] && this.paddle1.position.z < 3.5) {
            this.paddle1.position.z += this.paddleSpeed;
        }
        if (this.keys['s'] && this.paddle1.position.z > -3.5) {
            this.paddle1.position.z -= this.paddleSpeed;
        }
        
        // Player 2 controls (up/down arrows)
        if (this.keys['ArrowUp'] && this.paddle2.position.z < 3.5) {
            this.paddle2.position.z += this.paddleSpeed;
        }
        if (this.keys['ArrowDown'] && this.paddle2.position.z > -3.5) {
            this.paddle2.position.z -= this.paddleSpeed;
        }
        
        this.ball.position.add(this.ballVelocity);
        
        if (this.ball.position.z > 4 || this.ball.position.z < -4) {
            this.ballVelocity.z *= -1;
        }
        
        if (
            this.ball.position.x < -8.5 && 
            this.ball.position.x > -9.5 &&
            Math.abs(this.ball.position.z - this.paddle1.position.z) < 1.5
        ) {
            this.ballVelocity.x *= -1;
            this.ballVelocity.z = (this.ball.position.z - this.paddle1.position.z) * 0.3;
        }
        
        if (
            this.ball.position.x > 8.5 && 
            this.ball.position.x < 9.5 &&
            Math.abs(this.ball.position.z - this.paddle2.position.z) < 1.5
        ) {
            this.ballVelocity.x *= -1;
            this.ballVelocity.z = (this.ball.position.z - this.paddle2.position.z) * 0.3;
        }
        
        if (this.ball.position.x < -10) {
            this.score2++;
            this.updateScore();
            this.resetBall();
        }
        
        if (this.ball.position.x > 10) {
            this.score1++;
            this.updateScore();
            this.resetBall();
        }
    }

    private updateScore(): void {
        this.scoreElement.textContent = `Player 1: ${this.score1} - Player 2: ${this.score2}`;
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export default localGame;