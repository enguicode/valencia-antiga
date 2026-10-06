import * as THREE from 'three';
import { createRiverPath } from './path.js';
import { createEnvironment } from './environment.js';
import { createWater } from './water.js';
import { createWalls } from './walls.js';
import { createCity } from './city.js';
import { createBridges } from './bridges.js';
import { createLandmarks, landmarkClearings } from './landmarks.js';
import { createRiverside } from './riverside.js';
import { createBoat } from './boat.js';
import { createInput } from './input.js';
import { cullInstances } from './instancing.js';
import { createGuide, createTour } from './guide.js';
import { createMinimap } from './minimap.js';
import { createAtmosphere } from './atmosphere.js';
import { createLife } from './life.js';
import { createSound } from './sound.js';
import { createQuality } from './quality.js';

const debug = new URLSearchParams(location.search).has('debug');

const [layout, points] = await Promise.all(
  ['./data/layout.json', './data/points.json'].map(async (url) => (await fetch(url)).json()),
);
const path = createRiverPath(layout);

const canvas = document.getElementById('scene');
// Dense screens hide jagged edges on their own, so antialiasing is only worth
// its cost on the others.
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: window.devicePixelRatio < 2,
  powerPreference: 'high-performance',
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000);

const environment = createEnvironment(scene, path, landmarkClearings(layout));
const { sky } = environment;
const water = createWater(path);
const boat = createBoat(path);
const city = createCity(layout);
const life = createLife(layout, path, city.userData.chimneys);
scene.add(
  water.mesh,
  createWalls(layout),
  city,
  life.group,
  createBridges(layout, path),
  createLandmarks(layout, path),
  createRiverside(layout, path),
  boat.mesh,
);

const input = createInput(canvas, document.getElementById('joystick'));
const distanceLabel = document.getElementById('distance');
document.getElementById('total').textContent = Math.round(path.end - path.start);
const helpPanel = document.getElementById('help');
const debugPanel = document.getElementById('debug');
const guide = createGuide(points, layout, path, document.getElementById('card'));
const tour = createTour(path, document.getElementById('tour'));
const minimap = createMinimap(document.getElementById('minimap'), layout, path, guide.stations);
const atmosphere = createAtmosphere(scene, environment, water.material, document.getElementById('clock'));
const sound = createSound(document.getElementById('sound'));

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 1 ? 72 : 55; // widen in portrait so both banks stay in view
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const quality = createQuality(document.getElementById('quality'), (level) => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, level.pixelRatio));
  atmosphere.state.fogScale = level.fogScale;
  life.setExtras(level.extras);
  resize();
});

// Start screen: until the visitor sets off, the boat stays moored and the
// camera drifts around it.
let started = false;
const startButton = document.getElementById('start');
const startTourButton = document.getElementById('start-tour');
const infoDialog = document.getElementById('info');

function start(withTour) {
  started = true;
  document.body.classList.add('started');
  orbit.idle = ORBIT.holdSeconds;
  if (withTour) document.getElementById('tour').click();
}
startButton.addEventListener('click', () => start(false));
startTourButton.addEventListener('click', () => start(true));
for (const opener of document.querySelectorAll('[data-open]')) {
  opener.addEventListener('click', () => {
    infoDialog.showModal();
    document.getElementById(opener.dataset.open).scrollIntoView();
  });
}
document.getElementById('close-info').addEventListener('click', () => infoDialog.close());

// Third-person camera: sits behind and above the boat and eases towards that spot.
const CAMERA_BACK = 15;
const CAMERA_UP = 6.5;
const ORBIT = { yawPerPixel: 0.006, liftPerPixel: 0.06, maxLift: 30, holdSeconds: 2, returnRate: 2 };
const cameraGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const viewDirection = new THREE.Vector3();
const orbit = { yaw: 0, lift: 0, idle: ORBIT.holdSeconds };

// Dragging with a second finger swings the camera around the boat and raises
// it. Once released it stays put for a moment, then drifts back astern.
function updateOrbit(dt, axes) {
  if (axes.looking) {
    orbit.yaw += axes.lookX * ORBIT.yawPerPixel;
    orbit.lift = THREE.MathUtils.clamp(orbit.lift + axes.lookY * ORBIT.liftPerPixel, -4, ORBIT.maxLift);
    orbit.idle = 0;
    return;
  }
  orbit.idle += dt;
  if (orbit.idle < ORBIT.holdSeconds) return;
  const keep = Math.exp(-dt * ORBIT.returnRate);
  orbit.yaw = Math.atan2(Math.sin(orbit.yaw), Math.cos(orbit.yaw)) * keep;
  orbit.lift *= keep;
}

function updateCamera(dt, snap = false) {
  const angle = boat.state.heading + orbit.yaw;
  viewDirection.set(Math.sin(angle), 0, Math.cos(angle));
  cameraGoal.copy(boat.mesh.position).addScaledVector(viewDirection, -CAMERA_BACK);
  cameraGoal.y = CAMERA_UP + orbit.lift;
  lookGoal.copy(boat.mesh.position).addScaledVector(viewDirection, 8);
  lookGoal.y = 2;

  const ease = snap ? 1 : 1 - Math.exp(-dt * (orbit.idle < ORBIT.holdSeconds ? 9 : 3));
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
  if (!started) {
    axes.throttle = 0;
    axes.steer = 0;
    axes.used = false;
    orbit.yaw += dt * 0.06;
    orbit.lift = 2;
    orbit.idle = 0;
  }
  if (tour.active) {
    // Taking the helm ends the guided tour.
    if (axes.throttle !== 0 || axes.steer !== 0) tour.stop();
    else Object.assign(axes, tour.drive(boat.state));
  }

  atmosphere.update(dt);
  boat.update(dt, axes, time);
  water.update(time, boat.state.row);
  life.update(dt, time, boat.state, atmosphere.state);
  sound.update(boat.state.speed, atmosphere.state.hour);
  if (started) updateOrbit(dt, axes);
  updateCamera(dt);
  cullInstances(camera, scene.fog.far);
  quality.update(dt);
  renderer.render(scene, camera);
  guide.update(boat.state.s);
  minimap.update(boat.state);

  const distance = Math.round(boat.state.s - path.start);
  if (distance !== shownDistance) {
    shownDistance = distance;
    distanceLabel.textContent = distance;
  }
  if (axes.used || tour.active) helpPanel.classList.add('dismissed');

  if (debug) {
    frames++;
    const now = performance.now();
    if (now - fpsWindowStart >= 500) {
      const fps = Math.round((frames * 1000) / (now - fpsWindowStart));
      const { calls, triangles } = renderer.info.render;
      debugPanel.textContent = `${fps} fps · ${calls} draw calls · ${triangles.toLocaleString('es-ES')} triángulos · ${quality.describe()}`;
      frames = 0;
      fpsWindowStart = now;
    }
  }
}

boat.update(0, input.update(), 0);
updateCamera(0, true);
renderer.setAnimationLoop(frame);

startButton.textContent = 'Navegar';
startButton.disabled = false;
startTourButton.disabled = false;
window.__valenciaReady = true;

if (debug) {
  debugPanel.hidden = false;
  window.__valencia = { boat, renderer, scene, camera, path, layout, orbit, guide, tour, atmosphere, sound };
}
