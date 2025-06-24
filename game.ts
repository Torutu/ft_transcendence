import * as THREE from "/three";


// variable! <- should be assigned before use

class PingPongGame {
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

    constructor() {
        this.initScene();
        this.createObjects();
        this.setupEventListeners();
        this.keys = {};
        this.paddleSpeed = 0.2;
        this.ballSpeed = 0.1;
        this.ballVelocity = new THREE.Vector3(this.ballSpeed, 0, 0);
        this.score1 = 0;
        this.score2 = 0;
        
        this.scoreElement = document.createElement('div');
        this.scoreElement.style.position = 'absolute';
        this.scoreElement.style.top = '10px';
        this.scoreElement.style.width = '100%';
        this.scoreElement.style.textAlign = 'center';
        this.scoreElement.style.color = 'white';
        this.scoreElement.style.fontFamily = 'Arial';
        this.scoreElement.style.fontSize = '24px';
        this.scoreElement.textContent = 'Player 1: 0 - Player 2: 0';
        document.body.appendChild(this.scoreElement);
        
        this.animate();
    }

    private initScene(): void {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    private createObjects(): void {
        // Table
        const tableGeometry = new THREE.BoxGeometry(20, 0.5, 10);
        const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x006600 });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.y = -0.25;
        this.scene.add(table);
        
        // Net
        const netGeometry = new THREE.PlaneGeometry(20, 2);
        const netMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const net = new THREE.Mesh(netGeometry, netMaterial);
        net.rotation.x = Math.PI / 2;
        this.scene.add(net);
        
        // Paddles
        const paddleGeometry = new THREE.BoxGeometry(0.5, 0.5, 2);
        const paddleMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        
        this.paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.paddle1.position.set(-9, 0, 0);
        this.scene.add(this.paddle1);
        
        this.paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.paddle2.position.set(9, 0, 0);
        this.scene.add(this.paddle2);
        
        // Ball
        const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.resetBall();
        this.scene.add(this.ball);
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

new PingPongGame();