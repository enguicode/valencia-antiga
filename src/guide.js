import * as THREE from 'three';
import { BANK } from './config.js';
import { PRETIL } from './riverside.js';

// Points of interest. Each one has a pale ring floating on the river beside
// the place it talks about, with a pin over it so it can be seen from afar.
// Sailing into the ring shows its history card and counts the point as
// found. Finding them all is the visitor's errand.

const STORAGE_KEY = 'valencia-antiga.found';
const RING_RADIUS = 18;
const RING_OFFSET = 14; // from the middle of the river, towards the place
const CARD_STAYS_WITHIN = 75; // metres from the ring before the card goes
const VISIBLE_WITHIN = 750;
const PIN_SIZE = 0.05; // of the viewport's height
// What the camera turns to on entering a ring: how high to aim on the place
// itself and how wide a view it needs, in metres.
const SUBJECTS = {
  bridge: { aim: 4, span: 150 },
  gate: { aim: 12, span: 52 },
  start: { aim: 2, span: 60 },
  micalet: { aim: 34, span: 110 },
  palace: { aim: 14, span: 150 },
  convent: { aim: 14, span: 110 },
};

const PALE = 0xf4e9d2; // the parchment of the panels, so the rings do not shout
const GREEN = 0x4a7a4e;

function drawPin(found) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.beginPath();
  context.arc(48, 46, 38, Math.PI * 0.82, Math.PI * 0.18);
  context.lineTo(48, 124);
  context.closePath();
  context.fillStyle = found ? 'rgba(74, 122, 78, 0.85)' : 'rgba(244, 233, 210, 0.92)';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = found ? 'rgba(244, 233, 210, 0.9)' : '#5a4a36';
  context.stroke();
  context.fillStyle = context.strokeStyle;
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
  const { card, counter, pointer, onEnter } = elements;
  const found = readFound();
  const pins = {
    pending: new THREE.SpriteMaterial({ map: drawPin(false), sizeAttenuation: false, fog: false }),
    found: new THREE.SpriteMaterial({ map: drawPin(true), sizeAttenuation: false, fog: false, opacity: 0.7 }),
  };
  const flat = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const rings = {
    pending: { edge: flat(PALE, 0.6), fill: flat(PALE, 0.1) },
    found: { edge: flat(GREEN, 0.4), fill: flat(GREEN, 0.06) },
  };
  const edgeGeometry = new THREE.RingGeometry(RING_RADIUS - 2.4, RING_RADIUS, 48).rotateX(-Math.PI / 2);
  const fillGeometry = new THREE.CircleGeometry(RING_RADIUS - 2.4, 48).rotateX(-Math.PI / 2);

  // The ring sits on the water at the point of the river nearest the place,
  // pulled towards that bank but still within reach of the middle.
  // Also works out the subject: the spot on the place itself to look at.
  const locate = ({ type, id, offset = 0 }) => {
    if (type === 'start') {
      const wall = path.pointAt(path.start + offset + 40);
      return {
        s: path.start + offset,
        side: 1,
        subject: { ...SUBJECTS.start, x: wall.x + wall.rx * PRETIL.offset, z: wall.z + wall.rz * PRETIL.offset },
      };
    }
    let x;
    let z;
    let kind = type;
    if (type === 'gate') {
      [x, z] = layout.wall[layout.gates.find((gate) => gate.id === id).vertex];
    } else if (type === 'bridge') {
      const bridge = layout.bridges.find((item) => item.id === id);
      const { sample } = path.project(bridge.x, bridge.z);
      ({ x, z } = sample);
    } else {
      const landmark = layout.landmarks.find((item) => item.id === id);
      ({ x, z } = landmark);
      kind = landmark.kind;
    }
    const { s, lateral } = path.project(x, z);
    return {
      s: s + offset,
      side: type === 'bridge' ? 0 : Math.sign(lateral),
      subject: { ...(SUBJECTS[kind] ?? SUBJECTS.convent), x, z },
    };
  };

  const group = new THREE.Group();
  const markers = points.map((point, i) => {
    const { s, side, subject } = locate(point.at);
    subject.y = (point.at.type === 'bridge' || point.at.type === 'start' ? 0 : BANK.height) + subject.aim;
    const centre = path.pointAt(s);
    const x = centre.x + centre.rx * side * RING_OFFSET;
    const z = centre.z + centre.rz * side * RING_OFFSET;
    const state = found.has(point.id) ? 'found' : 'pending';

    const ring = new THREE.Group();
    ring.position.set(x, 0.55, z);
    const edge = new THREE.Mesh(edgeGeometry, rings[state].edge);
    const fill = new THREE.Mesh(fillGeometry, rings[state].fill);
    edge.renderOrder = fill.renderOrder = 3; // over the water
    ring.add(fill, edge);

    const pin = new THREE.Sprite(pins[state]);
    pin.center.set(0.5, 0); // the tip of the pin is the anchor
    pin.scale.set(PIN_SIZE * 0.75, PIN_SIZE, 1);
    pin.renderOrder = 4;
    group.add(ring, pin);
    return { ...point, x, z, subject, ring, edge, fill, pin, phase: i * 1.7 };
  });

  const showCount = () => {
    counter.textContent = `${found.size} de ${markers.length}`;
  };
  showCount();

  const paint = (marker) => {
    const state = found.has(marker.id) ? 'found' : 'pending';
    marker.edge.material = rings[state].edge;
    marker.fill.material = rings[state].fill;
    marker.pin.material = pins[state];
  };

  let shown = null;

  function show(marker) {
    shown = marker;
    card.classList.toggle('visible', Boolean(marker));
    if (!marker) return;
    const first = !found.has(marker.id);
    if (first) {
      found.add(marker.id);
      paint(marker);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...found]));
      } catch {
        // Private browsing: the tally simply lasts for this visit.
      }
      showCount();
    }
    onEnter?.(marker);
    card.querySelector('h2').textContent = marker.title;
    card.querySelector('.text').textContent = marker.text;
    card.querySelector('a').href = marker.source;
    card.querySelector('.tally').textContent =
      found.size === markers.length
        ? `Has encontrado los ${markers.length} puntos.`
        : `${found.size} de ${markers.length}${first ? '' : ' · ya lo tenías'}`;
  }

  function reset() {
    found.clear();
    markers.forEach(paint);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was stored.
    }
    showCount();
    show(null);
  }

  const projected = new THREE.Vector3();
  const cameraSpace = new THREE.Vector3();

  function update(time, boatState) {
    let nearest = null;
    let nearestDistance = Infinity;
    let entered = null;
    for (const marker of markers) {
      const distance = Math.hypot(marker.x - boatState.x, marker.z - boatState.z);
      marker.distance = distance;
      const visible = distance < VISIBLE_WITHIN;
      marker.ring.visible = visible;
      marker.pin.visible = visible;
      marker.ring.scale.setScalar(1 + Math.sin(time * 2 + marker.phase) * 0.035);
      marker.pin.position.set(marker.x, 5 + Math.sin(time * 1.6 + marker.phase) * 0.6, marker.z);
      if (distance < RING_RADIUS) entered = marker;
      if (!found.has(marker.id) && distance < nearestDistance) {
        nearest = marker;
        nearestDistance = distance;
      }
    }

    // The card comes up on entering a ring and stays a while after leaving
    // it, so there is time to read it without stopping.
    if (entered && entered !== shown) show(entered);
    else if (shown && !entered && shown.distance > CARD_STAYS_WITHIN) show(null);

    // An arrow at the edge of the screen points to the nearest ring still to
    // be found whenever it is out of view.
    if (!nearest) {
      pointer.classList.remove('visible');
      return;
    }
    projected.set(nearest.x, 6, nearest.z).project(camera);
    const screenX = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const margin = 46;
    const top = 150;
    const bottom = window.innerHeight - 96;
    const onScreen =
      projected.z < 1 &&
      nearest.pin.visible &&
      screenX > 16 &&
      screenX < window.innerWidth - 16 &&
      screenY > 0 &&
      screenY < bottom;
    pointer.classList.toggle('visible', !onScreen);
    if (onScreen) return;

    cameraSpace.set(nearest.x, 6, nearest.z).applyMatrix4(camera.matrixWorldInverse);
    const angle = Math.atan2(-cameraSpace.y, cameraSpace.x); // screen y grows downwards
    const reach = Math.min(
      (window.innerWidth / 2 - margin) / Math.max(Math.abs(Math.cos(angle)), 0.001),
      (bottom - top) / 2 / Math.max(Math.abs(Math.sin(angle)), 0.001),
    );
    pointer.style.left = `${window.innerWidth / 2 + Math.cos(angle) * reach}px`;
    pointer.style.top = `${(top + bottom) / 2 + Math.sin(angle) * reach}px`;
    pointer.querySelector('svg').style.transform = `rotate(${angle}rad)`;
    pointer.querySelector('span').textContent = `${Math.round(nearestDistance / 10) * 10} m`;
  }

  // The points in the order the river reaches them, for the logbook.
  const entries = () =>
    [...markers]
      .sort((a, b) => path.project(a.x, a.z).s - path.project(b.x, b.z).s)
      .map((marker) => ({ ...marker, found: found.has(marker.id) }));

  return { group, markers, found, update, reset, entries };
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
    button.querySelector('.label').textContent = label;
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
