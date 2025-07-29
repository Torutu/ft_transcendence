import * as THREE from 'three';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);
  return scene;
}

export function createCamera(container: HTMLElement): THREE.PerspectiveCamera {
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  return renderer;
}

export function addLights(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0x404040);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(ambientLight);
  scene.add(directionalLight);
}


export function createTable(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(20, 0.5, 10);
  const material = new THREE.MeshPhongMaterial({ color: 0x006600 });
  const table = new THREE.Mesh(geometry, material);
  table.position.y = -0.25;
  return table;
}

export function createNet(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(20, 2);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const net = new THREE.Mesh(geometry, material);
  net.rotation.x = Math.PI / 2;
  return net;
}

export function createPaddle(color = 0xff0000): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 2);
  const material = new THREE.MeshPhongMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

export function createBall(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
  return new THREE.Mesh(geometry, material);
}

export function createScoreElement(container: HTMLElement): HTMLDivElement {
  const scoreboard = document.createElement('div');
  scoreboard.style.position = 'absolute';
  scoreboard.style.top = '10px';
  scoreboard.style.width = '100%';
  scoreboard.style.textAlign = 'center';
  scoreboard.style.color = 'white';
  scoreboard.style.fontFamily = 'Arial';
  scoreboard.style.fontSize = '24px';
  scoreboard.style.pointerEvents = 'none';
  scoreboard.textContent = 'Player 1: 0 - Player 2: 0';

  const containerStyle = getComputedStyle(container);
  if (containerStyle.position === 'static' || !containerStyle.position) {
    container.style.position = 'relative';
  }

  container.appendChild(scoreboard);
  return scoreboard;
}

export function updateScoreDisplay(
  scoreboard: HTMLElement,
  score1: number,
  score2: number
) {
  scoreboard.textContent = `Player 1: ${score1} - Player 2: ${score2}`;
}
