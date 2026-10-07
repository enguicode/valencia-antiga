import * as THREE from 'three';
import { BANK } from './config.js';
import { PRETIL } from './riverside.js';
import { t, localized, onLanguageChange } from './i18n.js';

// Points of interest. Each one has a pale ring floating on the river beside
// the place it talks about, with a pin over it so it can be seen from afar.
// Sailing into the ring shows its history card and counts the point as
// found. Finding them all is the visitor's errand.

const STORAGE_KEY = 'valencia-antiga.found';
const RING_RADIUS = 18;
// No ring sits upstream of this, measured from the head of the navigable
// reach. Quart's nearest water is just beyond the weir.
const EARLIEST_RING = 90;
const RING_OFFSET = 14; // from the middle of the river, towards the place
const CARD_STAYS_WITHIN = 75; // metres from the ring before the card goes
const VISIBLE_WITHIN = 750;
const PIN_SIZE = 0.05; // of the viewport's height
// What the camera turns to on entering a ring: how high to aim on the place
// itself and how wide a view it needs, in metres.
const SUBJECTS = {
  // A bridge is always shown whole, from upstream and a little above its deck.
  bridge: { aim: 4, span: 150, fly: true, standOff: 0.8, above: 8 },
  gate: { aim: 12, span: 52 },
  // A stretch of curtain, at the corner where it meets the river.
  wall: { aim: 5, span: 130 },
  start: { aim: 2, span: 60 },
  // Seen from the west, where the cathedral stands behind it and not in front.
  micalet: { aim: 34, span: 110, facing: [-0.94, 0.34], above: 32 },
  // Off the river, on the west wall. Close on the two towers and from below.
  // The way there is over open country, outside the wall.
  quart: { aim: 18, span: 46, standOff: 1, above: -9 },
  // Far from the water: the camera goes in closer than its width would ask.
  palace: { aim: 12, span: 150, standOff: 0.75, above: 14 },
  // Convents stand back from the bank: the camera goes over to them.
  convent: { aim: 9, span: 90, fly: true, standOff: 0.8, above: 9 },
};

const PALE = 0xf4e9d2; // the parchment of the panels, so the rings do not shout
const GREEN = 0x4a7a4e;

// `moon` swaps the i of a pending pin for a crescent: the night-only point.
function drawPin(found, moon = false) {
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
  } else if (moon) {
    context.beginPath();
    context.arc(48, 46, 21, Math.PI * 0.5, Math.PI * 1.5);
    context.arc(60, 46, 23, Math.PI * 1.36, Math.PI * 0.64, true);
    context.closePath();
    context.fill();
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

// Most cards cite Wikipedia; the few that do not name their source.
export const sourceLabel = (point) =>
  point.sourceName ? t('card.sourceNamed', { name: point.sourceName }) : t('card.source');

export function createGuide(points, layout, path, camera, elements) {
  const { card, counter, pointer, onEnter, onLeave, isShowing } = elements;
  const found = readFound();
  const pins = {
    pending: new THREE.SpriteMaterial({ map: drawPin(false), sizeAttenuation: false, fog: false }),
    moon: new THREE.SpriteMaterial({ map: drawPin(false, true), sizeAttenuation: false, fog: false }),
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
  const cityCentre = layout.wall
    .reduce((sum, [x, z]) => [sum[0] + x, sum[1] + z], [0, 0])
    .map((total) => total / layout.wall.length);

  // Also works out the subject: the spot on the place itself to look at.
  const locate = ({ type, id, vertex, offset = 0 }) => {
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
    let facing = null;
    if (type === 'gate') {
      [x, z] = layout.wall[layout.gates.find((gate) => gate.id === id).vertex];
      // A gate is best seen from in front: straight out from the city.
      const out = Math.hypot(x - cityCentre[0], z - cityCentre[1]);
      facing = [(x - cityCentre[0]) / out, (z - cityCentre[1]) / out];
    } else if (type === 'wall') {
      [x, z] = layout.wall[vertex];
    } else if (type === 'bridge') {
      const bridge = layout.bridges.find((item) => item.id === id);
      const { sample } = path.project(bridge.x, bridge.z);
      ({ x, z } = sample);
      facing = [-sample.tx, -sample.tz];
    } else {
      const landmark = layout.landmarks.find((item) => item.id === id);
      ({ x, z } = landmark);
      kind = landmark.kind;
    }
    const { s, lateral, sample } = path.project(x, z);
    facing = SUBJECTS[kind]?.facing ?? facing;
    // Buildings are shown from the river, which is the side they are seen from.
    if (!facing) {
      const reach = Math.hypot(sample.x - x, sample.z - z) || 1;
      facing = [(sample.x - x) / reach, (sample.z - z) / reach];
    }
    const preset = type === 'gate' && id === 'quart' ? SUBJECTS.quart : (SUBJECTS[kind] ?? SUBJECTS.convent);
    return {
      s: Math.max(s + offset, path.start + EARLIEST_RING),
      side: type === 'bridge' ? 0 : Math.sign(lateral) || 1,
      subject: { ...preset, x, z, facing },
    };
  };

  const group = new THREE.Group();
  const markers = points.map((point, i) => {
    const { s, side, subject } = locate(point.at);
    // The night-only point is about the moon: that is what the camera turns to.
    if (point.bonus) subject.moon = true;
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

    const pin = new THREE.Sprite(pins[state === 'pending' && point.bonus ? 'moon' : state]);
    pin.center.set(0.5, 0); // the tip of the pin is the anchor
    pin.scale.set(PIN_SIZE * 0.75, PIN_SIZE, 1);
    pin.renderOrder = 4;
    group.add(ring, pin);
    return { ...point, x, z, subject, ring, edge, fill, pin, phase: i * 1.7 };
  });

  // The tally counts the ordinary points; the night-only one is an extra.
  const regular = markers.filter((marker) => !marker.bonus);
  [...regular]
    .sort((a, b) => path.project(a.x, a.z).s - path.project(b.x, b.z).s)
    .forEach((marker, i) => (marker.number = i + 1));
  const tally = () => ({ found: regular.filter((marker) => found.has(marker.id)).length, total: regular.length });
  const showCount = () => {
    counter.textContent = t('count', tally());
  };
  showCount();

  const paint = (marker) => {
    const state = found.has(marker.id) ? 'found' : 'pending';
    marker.edge.material = rings[state].edge;
    marker.fill.material = rings[state].fill;
    marker.pin.material = pins[state === 'pending' && marker.bonus ? 'moon' : state];
  };

  let shown = null;

  // `requested` is set when the visitor asks to see a place from the logbook
  // rather than sailing into its ring.
  function show(marker, requested = false) {
    const leaving = shown && shown !== marker ? shown : null;
    shown = marker;
    card.classList.toggle('visible', Boolean(marker));
    if (!marker) {
      if (leaving) onLeave?.();
      return;
    }
    // Leaving the moon's ring is what brings the daylight back.
    if (leaving?.bonus) onLeave?.();
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
    onEnter?.(marker, requested);
    marker.repeat = !first;
    write(marker);
  }

  function write(marker) {
    card.querySelector('h2').textContent = localized(marker.title);
    card.querySelector('.text').textContent = localized(marker.text);
    card.querySelector('a').href = marker.source;
    card.querySelector('a').textContent = sourceLabel(marker);
    const count = tally();
    // The card says which point this is, going down the river; how many
    // have been found is the counter's business.
    card.querySelector('.tally').textContent = marker.bonus
      ? t('card.bonus')
      : count.found === count.total && !marker.repeat
        ? t('card.all', count)
        : t('card.number', { number: marker.number, total: count.total }) + (marker.repeat ? t('card.again') : '');
  }
  onLanguageChange(() => {
    showCount();
    if (shown) write(shown);
  });

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
    // it, so there is time to read it without stopping. The moon's ring
    // is the same: arriving is what brings the night.
    if (entered && entered !== shown) show(entered);
    else if (shown && !entered && shown.distance > CARD_STAYS_WITHIN && !isShowing?.()) show(null);

    // An arrow at the edge of the screen points to the nearest ring still to
    // be found whenever it is out of view. A detail view is looking at one
    // place already, so the arrow stays out of that shot.
    if (!nearest || isShowing?.()) {
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
      .sort((a, b) => Boolean(a.bonus) - Boolean(b.bonus) || path.project(a.x, a.z).s - path.project(b.x, b.z).s)
      .map((marker) => ({ ...marker, found: found.has(marker.id) }));

  // Shows a place that has already been found, from wherever the boat is.
  const visit = (id) => {
    const marker = markers.find((item) => item.id === id);
    if (marker && found.has(id)) show(marker, true);
  };

  return { group, markers, found, update, reset, entries, visit, tally };
}

// Autopilot for the guided tour: holds a steady speed down the middle of the
// river until the end of the stretch.
export function createTour(path, button) {
  const CRUISE = 0.6; // throttle that settles at about 6 m/s
  const LOOK_AHEAD = 30;
  let active = false;

  const set = (value) => {
    active = value;
    const name = t(active ? 'tour.stop' : 'tour');
    button.querySelector('.label').textContent = name;
    button.setAttribute('aria-label', name);
    button.title = name;
    button.classList.toggle('active', active);
  };
  button.addEventListener('click', () => set(!active));
  onLanguageChange(() => set(active));

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
