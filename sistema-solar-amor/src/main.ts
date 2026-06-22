import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// ============================================================
// 1. CONFIGURACIÓN BASE
// ============================================================
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = '<canvas id="game-canvas"></canvas>';
const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas")!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020005);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 25); 

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.display = "block";

function createCircleTexture() {
  const canvasObj = document.createElement("canvas");
  canvasObj.width = 32;
  canvasObj.height = 32;
  const ctx = canvasObj.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  return new THREE.CanvasTexture(canvasObj);
}
const starTexture = createCircleTexture();

const universe = new THREE.Group();
scene.add(universe);

const galaxySystem = new THREE.Group();
galaxySystem.rotation.x = Math.PI / 8; 
universe.add(galaxySystem);

// ============================================================
// 2. CORAZÓN DESDE IMAGEN CON TEXTURA 3D (DISPERSIÓN Z)
// ============================================================

function createHeartFromImage() {
  const heartGroup = new THREE.Group();
  
  const img = new Image();
  img.src = "/heart.jpg"; 
  
  img.onload = () => {
    const size = 128; 
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    
    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size).data;

    const positions = [];

    const dispersionZAmount = 0.8; 
    const dispersionXYAmount = 0.08; 

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2], a = imgData[i + 3];

        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        
        // ✅ CAMBIADO: antes era luminance > 150 (partes blancas)
        // Ahora tomamos las partes OSCURAS (negras)
        if (a > 50 && luminance < 100) {
          
          const posX = (x - size / 2) * 0.12;
          const posY = -(y - size / 2) * 0.12; 
          
          const jitterX = (Math.random() - 0.5) * dispersionXYAmount;
          const jitterY = (Math.random() - 0.5) * dispersionXYAmount;
          const jitterZ = (Math.random() - 0.5) * dispersionZAmount; 

          positions.push(posX + jitterX, posY + jitterY, jitterZ); 
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    // ✅ CAMBIADO: color dorado fijo, sin vertexColors
    const material = new THREE.PointsMaterial({
      size: 0.12,
      color: 0xFFF9CC,       // dorado
      map: starTexture,
      transparent: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const heartParticles = new THREE.Points(geometry, material);
    heartParticles.position.y = 2; 
    heartParticles.scale.set(1.2, 1.2, 1.2); 
    
    heartGroup.add(heartParticles);
  };

  return heartGroup;
}


const evelynnHeart = createHeartFromImage();
galaxySystem.add(evelynnHeart);

// ============================================================
// 3. ESPIRALES CENTRÍFUGAS HORIZONTALES (Igual que antes)
// ============================================================
function createCentrifugalSpirals() {
  const positions = [];
  const colors = [];
  const arms = 2; 
  const particlesPerArm = 8000;
  
  const colorInner = new THREE.Color(0xff00ee); 
  const colorOuter = new THREE.Color(0x2a0066); 

  for (let arm = 0; arm < arms; arm++) {
    const angleOffset = arm * Math.PI;

    for (let i = 0; i < particlesPerArm; i++) {
      const t = Math.pow(Math.random(), 1.5) * Math.PI * 4; 
      const radius = 2.0 + (t * 3.5); 
      
      const spread = 0.5 + (t * 0.8);
      const jitterX = (Math.random() - 0.5) * spread;
      const jitterZ = (Math.random() - 0.5) * spread;
      const jitterY = (Math.random() - 0.5) * (1.0 + t * 0.2);

      const x = Math.cos(t + angleOffset) * radius + jitterX;
      const z = Math.sin(t + angleOffset) * radius + jitterZ;
      const y = -3 + jitterY; 

      positions.push(x, y, z);

      const color = colorInner.clone().lerp(colorOuter, t / (Math.PI * 4));
      colors.push(color.r, color.g, color.b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}
function createSpiralingText() {
  const textGroup = new THREE.Group();

  const img = new Image();
  img.src = "/teamo.png";

  img.onload = () => {
    const size = 256;
    const h = 128;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = size;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, size, h);
    const imgData = ctx.getImageData(0, 0, size, h).data;

    const positions: number[] = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2], a = imgData[i + 3];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (a > 50 && luminance < 100) {
          const posX = (x - size / 2) * 0.04;
          const posY = -(y - h / 2) * 0.04;
          const jitterZ = (Math.random() - 0.5) * 0.3;
          positions.push(posX, posY, jitterZ);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xFF5968,
      map: starTexture,
      transparent: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 3 instancias separadas 120° entre sí sobre la espiral
    const count = 3;
    for (let i = 0; i < count; i++) {
      const t = Math.PI * 1.2 + (i * (Math.PI * 2) / count);
      const radius = 2.0 + t * 3.5;

      const textPoints = new THREE.Points(geometry, material);
      textPoints.position.set(
        Math.cos(t) * radius,
        -3,
        Math.sin(t) * radius
      );

      // Guardamos t en userData para el billboard en animate()
      textPoints.userData.t = t;

      textGroup.add(textPoints);
    }
  };

  return textGroup;
}
function createSpiralingTextMigue() {
  const textGroup = new THREE.Group();

  const img = new Image();
  img.src = "/migue.png";

  img.onload = () => {
    const size = 256;
    const h = 128;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = size;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, size, h);
    const imgData = ctx.getImageData(0, 0, size, h).data;

    const positions: number[] = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2], a = imgData[i + 3];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (a > 50 && luminance < 100) {
          const posX = (x - size / 2) * 0.04;
          const posY = -(y - h / 2) * 0.04;
          const jitterZ = (Math.random() - 0.5) * 0.3;
          positions.push(posX, posY, jitterZ);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      color: 0x57EDFA,
      map: starTexture,
      transparent: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Offset de PI/3 (60°) para que intercale con los "Te Amo"
    const count = 3;
    for (let i = 0; i < count; i++) {
      const t = Math.PI * 1.2 + Math.PI / 3 + (i * (Math.PI * 2) / count);
      const radius = 2.0 + t * 3.5;

      const textPoints = new THREE.Points(geometry, material);
      textPoints.position.set(
        Math.cos(t) * radius,
        -3,
        Math.sin(t) * radius
      );

      textPoints.userData.t = t;
      textGroup.add(textPoints);
    }
  };

  return textGroup;
}

const migueText = createSpiralingTextMigue();
galaxySystem.add(migueText);
const loveText = createSpiralingText();
galaxySystem.add(loveText);


const spirals = createCentrifugalSpirals();
galaxySystem.add(spirals);

// ============================================================
// 4. ESTRELLAS DE FONDO DEL UNIVERSO (Igual que antes)
// ============================================================
const starsCount = 2000;
const starsGeometry = new THREE.BufferGeometry();
const posArray = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount * 3; i++) {
  posArray[i] = (Math.random() - 0.5) * 400; 
}
starsGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));

const starsMaterial = new THREE.PointsMaterial({
  size: 0.4,
  color: 0xddddff,
  map: starTexture,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending
});

const backgroundStars = new THREE.Points(starsGeometry, starsMaterial);
universe.add(backgroundStars);

// ============================================================
// 5. EFECTO NEÓN (BLOOM - AJUSTE DE LUZ) (Igual que antes)
// ============================================================
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,  // Intensidad baja para no saturar al alejar la cámara
  0.3,  // Radio muy corto para evitar la bruma
  0.4   // Umbral alto (solo los píxeles muy brillantes generan luz)
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ============================================================
// 6. CONTROLES DE MOUSE (Igual que antes)
// ============================================================
// ============================================================
// 6. CONTROLES — drag con inercia, scroll suave, límites
// ============================================================
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Velocidad acumulada para inercia
let velocityX = 0;
let velocityY = 0;
const FRICTION = 0.88;          // cuánto se frena por frame (0=para inmediato, 1=nunca para)
const DRAG_SPEED = 0.004;
const ZOOM_SPEED = 0.06;
const ZOOM_MIN = 8;
const ZOOM_MAX = 120;

// Límites verticales
const ROT_X_MAX =  Math.PI * 0.85;   // ~153° arriba — prácticamente libre
const ROT_X_MIN = -0.35;             // ~-20° abajo — tope natural

window.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("mousedown", (e) => {
  isDragging = true;
  velocityX = 0;
  velocityY = 0;
  previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  // La inercia sigue corriendo en animate()
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const dx = e.clientX - previousMousePosition.x;
  const dy = e.clientY - previousMousePosition.y;

  if (e.buttons === 1) {
    // Rotación orbital — acumula velocidad
    velocityY = dx * DRAG_SPEED;
    velocityX = dy * DRAG_SPEED;

    universe.rotation.y += velocityY;
    universe.rotation.x += velocityX;
    universe.rotation.x = Math.max(ROT_X_MIN, Math.min(ROT_X_MAX, universe.rotation.x));

  } else if (e.buttons === 2) {
    // Pan — movimiento lateral de cámara, más suave
    camera.position.x -= dx * 0.04;
    camera.position.y += dy * 0.04;
  }

  previousMousePosition = { x: e.clientX, y: e.clientY };
});

// Scroll suave con lerp hacia target
let zoomTarget = camera.position.z;
window.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoomTarget += e.deltaY * ZOOM_SPEED;
  zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget));
}, { passive: false });

// Touch — soporte móvil básico
let lastTouchDist = 0;
window.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    velocityX = 0; velocityY = 0;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    isDragging = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.hypot(dx, dy);
  }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (e.touches.length === 1 && isDragging) {
    const dx = e.touches[0].clientX - previousMousePosition.x;
    const dy = e.touches[0].clientY - previousMousePosition.y;
    velocityY = dx * DRAG_SPEED;
    velocityX = dy * DRAG_SPEED;
    universe.rotation.y += velocityY;
    universe.rotation.x += velocityX;
    universe.rotation.x = Math.max(ROT_X_MIN, Math.min(ROT_X_MAX, universe.rotation.x));
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    zoomTarget -= (dist - lastTouchDist) * 0.1;
    zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget));
    lastTouchDist = dist;
  }
}, { passive: true });

window.addEventListener("touchend", () => { isDragging = false; });

// ============================================================
// 7. RESPONSIVE (Igual que antes)
// ============================================================
// ============================================================
// 7. RESPONSIVE
// ============================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// 8. ANIMATE
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  galaxySystem.rotation.y += 0.002;

  // Inercia de rotación
  if (!isDragging) {
    velocityX *= FRICTION;
    velocityY *= FRICTION;
    universe.rotation.y += velocityY;
    universe.rotation.x += velocityX;
    universe.rotation.x = Math.max(ROT_X_MIN, Math.min(ROT_X_MAX, universe.rotation.x));
  }

  // Zoom suave
  camera.position.z += (zoomTarget - camera.position.z) * 0.08;

  // Billboard — calcular quaternion inverso del padre UNA sola vez
  const parentQuat = new THREE.Quaternion();
  galaxySystem.getWorldQuaternion(parentQuat);
  const parentQuatInv = parentQuat.clone().invert();

  loveText.children.forEach((child) => {
    child.quaternion.copy(camera.quaternion);
    child.quaternion.premultiply(parentQuatInv.clone());
  });

  migueText.children.forEach((child) => {
    child.quaternion.copy(camera.quaternion);
    child.quaternion.premultiply(parentQuatInv.clone());
  });

  composer.render();
}

animate();