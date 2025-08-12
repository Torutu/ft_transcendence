import * as THREE from 'three';

export default class PingPongGame {
  private groundEmission = 0.5;
  private groundColor = 0xffffff;
  private hitter = 0;
  private leftPlayer = 'Guest';
  private rightPlayer = 'Guest';
  private leftScore = 0;
  private rightScore = 0;
  private maxScore = 3;
  private animationRunning = true;
  private currentRotationY = 0;
  private currentLookTarget = new THREE.Vector3(0, 0, 0);

  private container: HTMLDivElement;
  private scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;

  private lineMaterial: THREE.LineBasicMaterial;
  private gridLines: THREE.Group;

  private paddleGeo = new THREE.BoxGeometry(1.5, 0.4, 3);
  private leftMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, emissive: 0x331111 });
  private rightMat = new THREE.MeshStandardMaterial({ color: 0x6b8cff, emissive: 0x112233 });

  private leftPaddle: THREE.Mesh;
  private rightPaddle: THREE.Mesh;

  private ballGeo = new THREE.SphereGeometry(0.45, 32, 32);
  private ballMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveIntensity: 1.1,
    roughness: 0.2,
    metalness: 0.8,
  });
  private ball: THREE.Mesh;

  private bounds = { x: 9.6, z: 5.6 };
  private ballVel = new THREE.Vector3(6.0, 0, 3.5);
  private paddleSpeed = 12;
  private keys = { w: false, s: false, ArrowUp: false, ArrowDown: false };

  private hud: HTMLDivElement;
  private scoreDisplay: HTMLDivElement;
  private restartButton: HTMLButtonElement;
  private timerDisplay: HTMLDivElement;

  private last = performance.now();
  private gameDuration = 120000;
  private gameEndTime = performance.now() + this.gameDuration;

constructor(containerId: string | HTMLElement) {
  if (typeof containerId === 'string') {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container with id "${containerId}" not found`);
    this.container = el as HTMLDivElement;
  } else if (containerId instanceof HTMLElement) {
    this.container = containerId as HTMLDivElement;
  } else {
    throw new Error('Invalid container argument');
  }
    this.animate = this.animate.bind(this);

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleResize = this.handleResize.bind(this);

    // Add event listeners with bound handlers
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 20, 10);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffeebb, 0x080820, 0.9);
    this.scene.add(hemi);
    const p1 = new THREE.PointLight(0xff4d4d, 1.2, 50);
    p1.position.set(10, 8, 6);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0x66ccff, 1.0, 50);
    p2.position.set(-10, 8, -6);
    this.scene.add(p2);

    // Ground grid
    this.lineMaterial = new THREE.LineBasicMaterial({ color: this.groundColor, transparent: true, opacity: this.groundEmission });
    this.gridLines = new THREE.Group();
    for (let i = -10; i <= 10; i++) {
      const geometryH = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, 0, i * 0.6),
        new THREE.Vector3(10, 0, i * 0.6),
      ]);
      const lineH = new THREE.Line(geometryH, this.lineMaterial);
      this.gridLines.add(lineH);

      const geometryV = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i, 0, -6),
        new THREE.Vector3(i, 0, 6),
      ]);
      const lineV = new THREE.Line(geometryV, this.lineMaterial);
      this.gridLines.add(lineV);
    }
    this.gridLines.position.y = 0.26;
    this.scene.add(this.gridLines);

    // Paddles
    this.leftPaddle = new THREE.Mesh(this.paddleGeo, this.leftMat);
    this.rightPaddle = new THREE.Mesh(this.paddleGeo, this.rightMat);
    this.leftPaddle.position.set(-8.2, 0.5, 0);
    this.rightPaddle.position.set(8.2, 0.5, 0);
    this.scene.add(this.leftPaddle, this.rightPaddle);

    // Ball
    this.ball = new THREE.Mesh(this.ballGeo, this.ballMat);
    this.ball.position.set(0, 0.6, 0);
    this.scene.add(this.ball);

    // HUD
    this.hud = document.createElement('div');
    this.hud.className = 'overlay';
    this.hud.innerHTML = 'W/S: left paddle &nbsp; ArrowUp/Down: right paddle &nbsp; Esc: pause';
    document.body.appendChild(this.hud);

    // Score Display
    this.scoreDisplay = document.createElement('div');
    Object.assign(this.scoreDisplay.style, {
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'white',
      fontSize: '24px',
      fontFamily: 'monospace',
      userSelect: 'none',
    });
    document.body.appendChild(this.scoreDisplay);

    // Restart Button
    this.restartButton = document.createElement('button');
    this.restartButton.textContent = 'Restart';
    Object.assign(this.restartButton.style, {
      position: 'absolute',
      top: '50px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 18px',
      fontSize: '18px',
      marginTop: '15px',
      cursor: 'pointer',
      display: 'none',
    });
    document.body.appendChild(this.restartButton);
    this.restartButton.addEventListener('click', () => this.resetGame());

    // Timer Display
    this.timerDisplay = document.createElement('div');
    Object.assign(this.timerDisplay.style, {
      position: 'absolute',
      top: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'yellow',
      fontSize: '20px',
      fontFamily: 'monospace',
    });
    document.body.appendChild(this.timerDisplay);

    this.updateScoreDisplay();

    this.last = performance.now();
    this.gameEndTime = this.last + this.gameDuration;

    this.animate(this.last);
  }

  private handleKeyDown(e: KeyboardEvent) {
  if (e.key in this.keys) this.keys[e.key as keyof typeof this.keys] = true;
  if (e.key === 'Escape') this.togglePause();
    }

    private handleKeyUp(e: KeyboardEvent) {
    if (e.key in this.keys) this.keys[e.key as keyof typeof this.keys] = false;
    }

    private handleResize() {
    this.onResize();
    }

  private updateScoreDisplay() {
    this.scoreDisplay.textContent = `${this.leftPlayer}: ${this.leftScore}  —  ${this.rightPlayer}: ${this.rightScore}`;
  }

  private resetGame() {
    this.leftScore = 0;
    this.rightScore = 0;
    this.hitter = 0;
    this.updateScoreDisplay();

    this.ball.position.set(0, 0.6, 0);
    this.ballVel.set((Math.random() > 0.5 ? 1 : -1) * 6, 0, (Math.random() - 0.5) * 4);
    this.ball.material.color.set(0xffffff);
    this.ball.material.emissive.set(0xffffff);

    this.leftPaddle.position.set(-8.2, 0.5, 0);
    this.rightPaddle.position.set(8.2, 0.5, 0);

    if (!this.animationRunning) {
      this.animationRunning = true;
      this.last = performance.now();
      this.restartButton.style.display = 'none';
      this.gameEndTime = this.last + this.gameDuration;
      this.animate(this.last);
    }
  }

  private togglePause() {
    this.animationRunning = !this.animationRunning;
    if (this.animationRunning) {
      this.restartButton.style.display = 'none';
      this.last = performance.now();
      this.animate(this.last);
    } else {
      this.restartButton.style.display = 'block';
    }
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private paddleHit(paddle: THREE.Mesh) {
    const dx = Math.abs(this.ball.position.x - paddle.position.x);
    const dz = Math.abs(this.ball.position.z - paddle.position.z);
    return dx < 1.5 && dz < 2.0;
  }

    dispose() {
    this.animationRunning = false;

    // Remove renderer DOM element
    if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    // Remove HUD, Score Display, Timer Display, Restart Button from DOM
    [this.hud, this.scoreDisplay, this.timerDisplay, this.restartButton].forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });

    // Remove event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    // Dispose three.js renderer
    this.renderer.dispose();
    }

  private animate(now: number) {
    if (!this.animationRunning) return;

    const totalSecondsLeft = Math.max(0, Math.floor((this.gameEndTime - now) / 1000));
    const minutes = String(Math.floor(totalSecondsLeft / 60)).padStart(2, '0');
    const seconds = String(totalSecondsLeft % 60).padStart(2, '0');
    this.timerDisplay.textContent = `${minutes}:${seconds}`;

    if (now >= this.gameEndTime) {
      this.animationRunning = false;
      if (this.leftScore > this.rightScore) {
        this.scoreDisplay.textContent = `${this.leftPlayer} Wins!`;
      } else if (this.rightScore > this.leftScore) {
        this.scoreDisplay.textContent = `${this.rightPlayer} Wins!`;
      } else {
        this.scoreDisplay.textContent = `It's a tie!`;
      }
      this.restartButton.style.display = 'block';
      return;
    }

    const dt = Math.min((now - this.last) / 1000, 0.033);
    this.last = now;

    if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
      this.scoreDisplay.textContent = `Game Over! ${
        this.leftScore >= this.maxScore ? `${this.leftPlayer} Wins!` : `${this.rightPlayer} Wins!`
      }`;
      this.restartButton.style.display = 'block';
      this.animationRunning = false;
      return;
    }

    // Move paddles
    if (this.keys.w) this.leftPaddle.position.z -= this.paddleSpeed * dt;
    if (this.keys.s) this.leftPaddle.position.z += this.paddleSpeed * dt;
    if (this.keys.ArrowUp) this.rightPaddle.position.z -= this.paddleSpeed * dt;
    if (this.keys.ArrowDown) this.rightPaddle.position.z += this.paddleSpeed * dt;

    // Clamp paddles
    this.leftPaddle.position.z = THREE.MathUtils.clamp(this.leftPaddle.position.z, -this.bounds.z, this.bounds.z);
    this.rightPaddle.position.z = THREE.MathUtils.clamp(this.rightPaddle.position.z, -this.bounds.z, this.bounds.z);

    // Move ball
    this.ball.position.addScaledVector(this.ballVel, dt);

    // Bounce on table sides (z)
    if (this.ball.position.z > this.bounds.z || this.ball.position.z < -this.bounds.z) {
      this.ball.position.z = THREE.MathUtils.clamp(this.ball.position.z, -this.bounds.z, this.bounds.z);
      this.ballVel.z *= -1;
    }

    // Paddle collision
    if (this.paddleHit(this.leftPaddle) && this.ballVel.x < 0) {
      this.ballVel.x *= -1.05;
      const deltaZ = (this.ball.position.z - this.leftPaddle.position.z) * 2.0;
      this.ballVel.z += deltaZ;
      this.ball.material.color.set(0xff6b6b);
      this.ball.material.emissive.set(0xff6b6b);
      this.hitter = 1;
    }

    if (this.paddleHit(this.rightPaddle) && this.ballVel.x > 0) {
      this.ballVel.x *= -1.05;
      const deltaZ = (this.ball.position.z - this.rightPaddle.position.z) * 2.0;
      this.ballVel.z += deltaZ;
      this.ball.material.color.set(0x6b8cff);
      this.ball.material.emissive.set(0x6b8cff);
      this.hitter = 2;
    }

    // Score and reset
    if (this.ball.position.x < -this.bounds.x || this.ball.position.x > this.bounds.x) {
      if (this.ball.position.x < -this.bounds.x && this.hitter != 0) {
        this.hitter = 0;
        this.rightScore++;
      } else if (this.ball.position.x > this.bounds.x && this.hitter != 0) {
        this.hitter = 0;
        this.leftScore++;
      }
      this.updateScoreDisplay();

      this.ball.position.set(0, 0.6, 0);
      this.ballVel.set((Math.random() > 0.5 ? 1 : -1) * 6, 0, (Math.random() - 0.5) * 4);
      this.ball.material.color.set(0xffffff);
      this.ball.material.emissive.set(0xffffff);
    }

    // Camera rotation based on ball
    const targetRotationY = THREE.MathUtils.clamp(this.ball.position.z / this.bounds.z, -0.9, 0.9);
    const smoothingFactor = 0.1;
    this.currentRotationY = THREE.MathUtils.lerp(this.currentRotationY, targetRotationY, smoothingFactor);
    this.camera.rotation.y = this.currentRotationY;

    // Camera look target lerp
    const targetLookTarget = new THREE.Vector3(this.ball.position.x * 0.1, this.ball.position.y, this.ball.position.z * 0.2);
    this.currentLookTarget.lerp(targetLookTarget, smoothingFactor);
    this.camera.lookAt(this.currentLookTarget);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}
