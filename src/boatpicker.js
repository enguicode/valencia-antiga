import * as THREE from 'three';
import { createBoatModel, animateBoat } from './boat.js';
import { COLORS } from './config.js';
import { onLanguageChange } from './i18n.js';

// The boats, shown one at a time on a little stage of their own in the
// settings: slide sideways to see the next one; saving the sheet chooses it.
// The list underneath is the plain <select>, which stays the source of truth.

const GAP = 22; // metres between one boat and the next on the stage
// How big each one is drawn and how far it is lifted, so that a jet ski fills
// the stage as well as a boat under sail does.
const STAGING = {
  albufera: { scale: 1, lift: 0 },
  lateen: { scale: 1.3, lift: 0 },
  jetski: { scale: 3.1, lift: 1.2 },
  speedboat: { scale: 2, lift: 1.3 },
};
const SLIDE_PIXELS = 46; // a drag longer than this moves on to the next boat

export function createBoatPicker(root, select, isShowing) {
  const canvas = root.querySelector('canvas');
  const name = root.querySelector('.name');
  const dots = root.querySelector('.dots');
  const types = [...select.options].map((option) => option.value);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6a7a80, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(6, 12, 9);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1.6, 0.5, 200);

  const water = new THREE.MeshStandardMaterial({ color: COLORS.water, roughness: 0.4, transparent: true, opacity: 0.8 });
  const boats = types.map((type, i) => {
    const stage = STAGING[type] ?? STAGING.albufera;
    const turntable = new THREE.Group();
    turntable.position.x = i * GAP;
    const model = createBoatModel(type);
    model.scale.setScalar(stage.scale);
    model.position.y = stage.lift;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(7.2, 48).rotateX(-Math.PI / 2), water);
    pool.position.y = stage.lift;
    turntable.add(model, pool);
    scene.add(turntable);
    return { type, turntable, model };
  });

  let shown = Math.max(0, types.indexOf(select.value));
  let position = shown; // where the camera is along the row, in boats
  let drag = null;

  for (const type of types) {
    const dot = document.createElement('span');
    dot.dataset.type = type;
    dots.append(dot);
  }

  function describe() {
    name.textContent = select.options[shown].textContent;
    for (const dot of dots.children) dot.classList.toggle('on', dot.dataset.type === types[shown]);
    root.classList.toggle('current', types[shown] === select.value);
  }

  function show(index) {
    shown = (index + types.length) % types.length;
    describe();
  }

  root.querySelector('.prev').addEventListener('click', () => show(shown - 1));
  root.querySelector('.next').addEventListener('click', () => show(shown + 1));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(shown - 1);
    if (event.key === 'ArrowRight') show(shown + 1);
  });

  canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, moved: 0 };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drag) drag.moved = event.clientX - drag.x;
  });
  const release = () => {
    if (!drag) return;
    // Dragging to the left brings on the next boat, as a page would turn.
    if (Math.abs(drag.moved) > SLIDE_PIXELS) {
      show(shown - Math.sign(drag.moved));
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // The list can also change from outside: the remembered choice at startup.
  select.addEventListener('change', () => {
    shown = Math.max(0, types.indexOf(select.value));
    describe();
  });
  onLanguageChange(describe);
  describe();

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!isShowing()) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (canvas.width !== Math.round(width * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    // The row eases over to the boat that is shown; while a finger is down it
    // follows the finger instead.
    const pulled = drag ? shown - drag.moved / width : shown;
    // Going round from the last boat to the first, take the short way.
    if (Math.abs(pulled - position) > types.length / 2) position += Math.sign(pulled - position) * types.length;
    position += (pulled - position) * (1 - Math.exp(-dt * (drag ? 30 : 9)));
    const time = clock.elapsedTime;
    for (const [i, boat] of boats.entries()) {
      // Each boat sits at its place in the row, wrapped round the ends.
      let slot = i - position;
      slot -= Math.round(slot / types.length) * types.length;
      boat.turntable.position.x = slot * GAP;
      boat.turntable.visible = Math.abs(slot) < 1.2;
      boat.turntable.rotation.y = 0.9 + time * 0.35;
      animateBoat(boat.model, dt, time, { closeness: 0, speed: 0, underSail: true });
    }
    camera.position.set(0, 7, 23.5);
    camera.lookAt(0, 3.6, 0);
    renderer.render(scene, camera);
  }
  frame();

  return {
    // The boat on the stage, which becomes the visitor's when the sheet is saved.
    get shown() {
      return types[shown];
    },
    // Back to the boat in use, when the sheet is closed without saving.
    reset() {
      shown = Math.max(0, types.indexOf(select.value));
      position = shown;
      describe();
    },
  };
}
