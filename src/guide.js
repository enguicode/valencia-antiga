import * as THREE from 'three';
import { BANK } from './config.js';
import { PRETIL } from './riverside.js';

// Points of interest. Each one has a golden marker floating over the place
// it talks about; tapping the marker opens its history card and counts the
// point as found. Finding them all is the visitor's errand.

const STORAGE_KEY = 'valencia-antiga.found';
const VISIBLE_WITHIN = 750; // metres from the boat
const TAP_RADIUS = 44; // pixels
const MARKER_SIZE = 0.085; // of the viewport's height

// How high the marker floats, by what it marks.
const HEIGHTS = { bridge: 13, gate: 24, start: 5, micalet: 60, cathedral: 44, palace: 36, convent: 34, church: 38 };
const TALL_GATES = { serrans: 36, quart: 36, mar: 28, 'sant-vicent': 28 };

function drawMarker(found) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  // A pin: a disc with a point at the bottom, aimed at the place.
  context.beginPath();
  context.arc(48, 46, 38, Math.PI * 0.82, Math.PI * 0.18);
  context.lineTo(48, 124);
  context.closePath();
  context.fillStyle = found ? 'rgba(74, 122, 78, 0.9)' : '#e2a52e';
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = found ? 'rgba(244, 233, 210, 0.9)' : '#2e2418';
  context.stroke();
  context.fillStyle = context.strokeStyle;
  context.strokeStyle = context.fillStyle;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (found) {
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(30, 47);
    context.lineTo(43, 60);
    context.lineTo(67, 33);
    context.stroke();
  } else {
    context.beginPath();
    context.arc(48, 27, 6.5, 0, Math.PI * 2);
    context.fill();
    context.fillRect(42, 40, 12, 30);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function readFound() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function createGuide(points, layout, path, camera, elements) {
  const { dialog, counter, pointer } = elements;
  const found = readFound();
  const materials = {
    pending: new THREE.SpriteMaterial({ map: drawMarker(false), sizeAttenuation: false, fog: false }),
    found: new THREE.SpriteMaterial({ map: drawMarker(true), sizeAttenuation: false, fog: false, opacity: 0.8 }),
  };

  // Where the marker stands: over the thing itself, not at a spot on the river.
  const locate = ({ type, id, offset = 0 }) => {
    if (type === 'start') {
      const point = path.pointAt(path.start + offset);
      return [point.x + point.rx * PRETIL.offset, BANK.height + HEIGHTS.start, point.z + point.rz * PRETIL.offset];
    }
    if (type === 'bridge') {
      const bridge = layout.bridges.find((item) => item.id === id);
      const { sample } = path.project(bridge.x, bridge.z);
      return [sample.x, HEIGHTS.bridge, sample.z];
    }
    if (type === 'gate') {
      const [x, z] = layout.wall[layout.gates.find((gate) => gate.id === id).vertex];
      return [x, BANK.height + (TALL_GATES[id] ?? HEIGHTS.gate), z];
    }
    const landmark = layout.landmarks.find((item) => item.id === id);
    return [landmark.x, BANK.height + (HEIGHTS[landmark.kind] ?? 36), landmark.z];
  };

  const group = new THREE.Group();
  const markers = points.map((point, i) => {
    const [x, y, z] = locate(point.at);
    const sprite = new THREE.Sprite(found.has(point.id) ? materials.found : materials.pending);
    sprite.center.set(0.5, 0); // the tip of the pin is the anchor
    sprite.scale.set(MARKER_SIZE * 0.75, MARKER_SIZE, 1);
    sprite.renderOrder = 3;
    group.add(sprite);
    return { ...point, x, y, z, sprite, phase: i * 1.7 };
  });

  const showCount = () => {
    counter.textContent = `${found.size} de ${markers.length}`;
  };
  showCount();

  function open(marker) {
    const first = !found.has(marker.id);
    if (first) {
      found.add(marker.id);
      marker.sprite.material = materials.found;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...found]));
      } catch {
        // Private browsing: the tally simply lasts for this visit.
      }
      showCount();
    }
    dialog.querySelector('h2').textContent = marker.title;
    dialog.querySelector('.text').textContent = marker.text;
    dialog.querySelector('a').href = marker.source;
    const left = markers.length - found.size;
    dialog.querySelector('.tally').textContent =
      left === 0
        ? `Has encontrado los ${markers.length} puntos de interés.`
        : `${found.size} de ${markers.length} encontrados${first ? '' : ' (este ya lo tenías)'}.`;
    dialog.showModal();
  }

  function reset() {
    found.clear();
    for (const marker of markers) marker.sprite.material = materials.pending;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was stored.
    }
    showCount();
  }

  const projected = new THREE.Vector3();
  const toScreen = (marker) => {
    projected.set(marker.x, marker.sprite.position.y + 2, marker.z).project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
      ahead: projected.z < 1,
    };
  };

  // A tap opens the marker under the finger, if there is one.
  function tap(x, y) {
    let best = null;
    let bestDistance = TAP_RADIUS;
    for (const marker of markers) {
      if (!marker.sprite.visible) continue;
      const screen = toScreen(marker);
      if (!screen.ahead) continue;
      // The pin is taller than it is wide: measure from its middle.
      const middle = y + MARKER_SIZE * window.innerHeight * 0.4;
      const distance = Math.hypot(screen.x - x, screen.y - middle);
      if (distance < bestDistance) {
        best = marker;
        bestDistance = distance;
      }
    }
    if (best) open(best);
    return Boolean(best);
  }

  const cameraSpace = new THREE.Vector3();

  function update(time, boatState) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const marker of markers) {
      const distance = Math.hypot(marker.x - boatState.x, marker.z - boatState.z);
      marker.sprite.visible = distance < VISIBLE_WITHIN;
      marker.sprite.position.set(marker.x, marker.y + Math.sin(time * 1.6 + marker.phase) * 0.8, marker.z);
      if (!found.has(marker.id) && distance < nearestDistance) {
        nearest = marker;
        nearestDistance = distance;
      }
    }

    // An arrow at the edge of the screen points to the nearest point still to
    // be found whenever its marker is out of view.
    if (!nearest) {
      pointer.classList.remove('visible');
      return;
    }
    const screen = toScreen(nearest);
    const margin = 46;
    const top = 210;
    const bottom = window.innerHeight - 96;
    const onScreen =
      screen.ahead &&
      nearest.sprite.visible &&
      screen.x > 16 &&
      screen.x < window.innerWidth - 16 &&
      screen.y > 0 &&
      screen.y < bottom;
    pointer.classList.toggle('visible', !onScreen);
    if (onScreen) return;

    cameraSpace.set(nearest.x, nearest.y, nearest.z).applyMatrix4(camera.matrixWorldInverse);
    const angle = Math.atan2(-cameraSpace.y, cameraSpace.x); // screen y grows downwards
    const centreX = window.innerWidth / 2;
    const centreY = (top + bottom) / 2;
    const reach = Math.min(
      (window.innerWidth / 2 - margin) / Math.max(Math.abs(Math.cos(angle)), 0.001),
      ((bottom - top) / 2) / Math.max(Math.abs(Math.sin(angle)), 0.001),
    );
    pointer.style.left = `${centreX + Math.cos(angle) * reach}px`;
    pointer.style.top = `${centreY + Math.sin(angle) * reach}px`;
    pointer.querySelector('svg').style.transform = `rotate(${angle}rad)`;
    pointer.querySelector('span').textContent = `${Math.round(nearestDistance / 10) * 10} m`;
  }

  return { group, markers, found, tap, update, reset };
}

// Autopilot for the guided tour: holds a steady speed down the middle of the
// river until the end of the stretch.
export function createTour(path, button) {
  const CRUISE = 0.6; // throttle that settles at about 6 m/s
  const LOOK_AHEAD = 30;
  let active = false;

  const set = (value) => {
    active = value;
    const label = active ? 'Detener el recorrido guiado' : 'Recorrido guiado';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.classList.toggle('active', active);
  };
  button.addEventListener('click', () => set(!active));

  function drive(state) {
    if (state.s >= path.end - 2) {
      set(false);
      return { throttle: 0, steer: 0 };
    }
    const target = path.sampleAt(state.s + LOOK_AHEAD);
    const wanted = Math.atan2(target.x - state.x, target.z - state.z);
    const error = Math.atan2(Math.sin(wanted - state.heading), Math.cos(wanted - state.heading));
    return { throttle: CRUISE, steer: Math.max(-1, Math.min(1, -error * 2.5)) };
  }

  return {
    get active() {
      return active;
    },
    stop: () => set(false),
    drive,
  };
}
