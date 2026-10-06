import * as THREE from 'three';
import { RIVER } from './config.js';
import { createEnvironment } from './environment.js';
import { createWater } from './water.js';
import { createWalls } from './walls.js';
import { createBoat } from './boat.js';
import { createInput } from './input.js';

const debug = new URLSearchParams(location.search).has('debug');

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000);

const { sky } = createEnvironment(scene);
const water = createWater();
const boat = createBoat();
scene.add(water.mesh, createWalls(), boat.mesh);

const input = createInput(canvas, document.getElementById('joystick'));
const distanceLabel = document.getElementById('distance');
const helpPanel = document.getElementById('help');
const debugPanel = document.getElementById('debug');

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 1 ? 72 : 55; // widen in portrait so both banks stay in view
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Third-person camera: sits behind and above the boat and eases towards that spot.
const CAMERA_BACK = 15;
const CAMERA_UP = 6.5;
const cameraGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const lookAt = new THREE.Vector3();

function updateCamera(dt, snap = false) {
  const forward = boat.getForward();
  cameraGoal.copy(boat.mesh.position).addScaledVector(forward, -CAMERA_BACK);
  cameraGoal.y = CAMERA_UP;
  lookGoal.copy(boat.mesh.position).addScaledVector(forward, 8);
  lookGoal.y = 2;

  const ease = snap ? 1 : 1 - Math.exp(-dt * 3);
  camera.position.lerp(cameraGoal, ease);
  lookAt.lerp(lookGoal, ease);
  camera.lookAt(lookAt);
  sky.position.copy(camera.position);
}

const clock = new THREE.Clock();
let shownDistance = -1;
let frames = 0;
let fpsWindowStart = performance.now();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const axes = input.update();

  water.update(time);
  boat.update(dt, axes, time);
  updateCamera(dt);
  renderer.render(scene, camera);

  const distance = Math.round(THREE.MathUtils.clamp(boat.state.z, 0, RIVER.length));
  if (distance !== shownDistance) {
    shownDistance = distance;
    distanceLabel.textContent = distance;
  }
  if (axes.used) helpPanel.classList.add('dismissed');

  if (debug) {
    frames++;
    const now = performance.now();
    if (now - fpsWindowStart >= 500) {
      const fps = Math.round((frames * 1000) / (now - fpsWindowStart));
      const { calls, triangles } = renderer.info.render;
      debugPanel.textContent = `${fps} fps · ${calls} draw calls · ${triangles.toLocaleString('es-ES')} triángulos`;
      frames = 0;
      fpsWindowStart = now;
    }
  }
}

boat.update(0, input.update(), 0);
updateCamera(0, true);
renderer.setAnimationLoop(frame);

if (debug) {
  debugPanel.hidden = false;
  window.__valencia = { boat, renderer, scene, camera };
}
