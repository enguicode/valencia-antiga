import * as THREE from 'three';
import { createRiverPath } from './path.js';
import { createEnvironment } from './environment.js';
import { createSea } from './sea.js';
import { createWater } from './water.js';
import { createWalls } from './walls.js';
import { createCity } from './city.js';
import { createBridges, createBridgeGuide } from './bridges.js';
import { createLandmarks, landmarkClearings } from './landmarks.js';
import { createRiverside } from './riverside.js';
import { createBoat, DRAW_ORDER } from './boat.js';
import { createBoatPicker } from './boatpicker.js';
import { createInput } from './input.js';
import { cullInstances } from './instancing.js';
import { createGuide, createTour, sourceLabel } from './guide.js';
import { createMinimap } from './minimap.js';
import { createAtmosphere } from './atmosphere.js';
import { createLife } from './life.js';
import { createSound } from './sound.js';
import { createQuality } from './quality.js';
import { createNightLights } from './lights.js';
import { t, localized, getLanguage, setLanguage, onLanguageChange } from './i18n.js';

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000);

const environment = createEnvironment(scene, path, landmarkClearings(layout));
const { sky } = environment;
const water = createWater(path);
const bridgeGuide = createBridgeGuide(layout, path);
const boat = createBoat(path, bridgeGuide);

// The type of boat is chosen in the settings and remembered between visits.
const boatSelect = document.getElementById('boat-type');
try {
  const stored = localStorage.getItem('valencia-antiga.boat');
  if ([...boatSelect.options].some((option) => option.value === stored)) boatSelect.value = stored;
} catch {
  // Storage unavailable: keep the default.
}
boat.setType(boatSelect.value);
boatSelect.addEventListener('change', () => {
  boat.setType(boatSelect.value);
  try {
    localStorage.setItem('valencia-antiga.boat', boatSelect.value);
  } catch {
    // Private browsing: the choice simply lasts for this visit.
  }
});
water.mesh.renderOrder = DRAW_ORDER.water;
const city = createCity(layout);
const life = createLife(layout, path, city.userData.chimneys, bridgeGuide);
const nightLights = createNightLights(layout, path);
const sea = createSea(scene, path, layout, water.material);
scene.add(
  water.mesh,
  createWalls(layout, path),
  city,
  life.group,
  nightLights.points,
  createBridges(layout, path),
  createLandmarks(layout, path),
  createRiverside(layout, path),
  boat.mesh,
);

const input = createInput(canvas, document.getElementById('joystick'), {
  moveStick: document.getElementById('move-stick'),
  lookStick: document.getElementById('look-stick'),
});
// Phones and tablets get the two fixed sticks; "?touch" forces them on elsewhere.
if (matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('touch')) {
  document.body.classList.add('touch');
}
const distanceLabel = document.getElementById('distance');
const totalLabel = document.getElementById('total');
const tourMetres = Math.round(path.end - path.start);
const seaMetres = Math.round(path.seaEnd - path.end);
totalLabel.textContent = tourMetres;
const helpPanel = document.getElementById('help');
const debugPanel = document.getElementById('debug');
const guide = createGuide(points, layout, path, camera, {
  card: document.getElementById('card'),
  counter: document.getElementById('found'),
  pointer: document.getElementById('pointer'),
  // On entering a ring the camera turns to the place it is about.
  onEnter: (marker, requested) => {
    let { subject } = marker;
    // The moon is not a place: look up at it from wherever the boat is.
    // By day the sky would be empty, so arriving (or asking from the
    // logbook) brings the night for as long as the card stays up.
    let borrowed = false;
    if (subject.moon) {
      subject = {
        x: boat.state.x + MOON_DIRECTION.x * 700,
        y: MOON_DIRECTION.y * 700,
        z: boat.state.z + MOON_DIRECTION.z * 700,
        span: 90, // narrow, so the lens closes in on it
        moon: true,
      };
      borrowed = borrowNight();
    }
    focus.subject = subject;
    // Places close to the river get a zoom from the boat; far ones, and any
    // asked for from the logbook, a flight, with a longer look when asked for.
    const distance = Math.hypot(subject.x - boat.state.x, subject.z - boat.state.z);
    focus.flight = !subject.moon && (requested || subject.fly || distance > FLIGHT.beyond);
    focus.hold = requested ? FLIGHT.hold * 2 : FLIGHT.hold;
    const stretch = THREE.MathUtils.clamp(distance / LONG_FLIGHT.speed / FLIGHT.out, 1, LONG_FLIGHT.slowest);
    focus.out = FLIGHT.out * stretch;
    focus.back = FLIGHT.back * stretch;
    focus.bend = subject.facing
      ? THREE.MathUtils.clamp((distance - LONG_FLIGHT.bendFrom) * LONG_FLIGHT.bend, 0, LONG_FLIGHT.widest)
      : 0;
    focus.total = focus.flight ? focus.out + focus.hold + focus.back : FOCUS.seconds;
    if (borrowed) focus.total += 4; // stay with the moon once the light has gone
    focus.left = focus.total;
  },
  onLeave: () => restoreBorrowedNight(),
  isShowing: () => focus.left > 0,
});
scene.add(guide.group);

// The logbook: tapping the tally lists every point. Those not yet found are
// there too, as blanks: known to exist, not what they are.
const journal = document.getElementById('journal');
document.getElementById('status').addEventListener('click', () => {
  const entries = guide.entries();
  const count = guide.shownTally();
  const seaSheet = guide.isBeyond();
  journal.querySelector('h2').textContent = t(seaSheet ? 'journal.sea' : 'journal.title');
  journal.querySelector('.tally').textContent = t(
    count.found === count.total ? (seaSheet ? 'journal.sea.all' : 'journal.all') : (seaSheet ? 'journal.sea.some' : 'journal.some'),
    count,
  );
  journal.querySelector('ol').replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement('li');
      const title = document.createElement('h3');
      const text = document.createElement('p');
      item.append(title, text);
      if (!entry.found) {
        item.className = 'unknown';
        title.textContent = entry.bonus === 'night' ? '☾ ? ? ?' : '? ? ?'; // a moon, as a clue
        text.textContent = t(entry.bonus === 'night' ? 'journal.night' : 'journal.unknown');
        return item;
      }
      title.textContent = localized(entry.title);
      text.textContent = localized(entry.text);
      const source = document.createElement('a');
      source.href = entry.source;
      source.target = '_blank';
      source.rel = 'noopener';
      source.textContent = sourceLabel(entry);
      // An eye: fly over to the place and look at it again
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'view';
      view.title = t('journal.view');
      view.setAttribute('aria-label', t('journal.view'));
      view.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
      view.addEventListener('click', () => {
        journal.close();
        guide.visit(entry.id);
      });
      item.append(source, view);
      return item;
    }),
  );
  journal.showModal();
});
document.getElementById('close-journal').addEventListener('click', () => journal.close());
const tour = createTour(path, document.getElementById('tour'));
const minimap = createMinimap(document.getElementById('minimap'), layout, path, guide);
// Everything is lit by the sky as well as by the sun: the sky dome is
// rendered into an environment map whenever the atmosphere asks for it.
const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene();
skyScene.add(new THREE.Mesh(sky.geometry, environment.skyMaterial));
let skyTarget = null;
function refreshEnvironment() {
  const next = pmrem.fromScene(skyScene, 0, 1, 2000);
  scene.environment = next.texture;
  skyTarget?.dispose();
  skyTarget = next;
}

const atmosphere = createAtmosphere(
  scene,
  environment,
  water.material,
  document.getElementById('hour'),
  document.getElementById('sky'),
  refreshEnvironment,
);

// The sun casts shadows over a square around the boat, which it follows.
const SHADOW = { reach: 120, distance: 300 };
const { sun } = environment;
Object.assign(sun.shadow.camera, {
  left: -SHADOW.reach,
  right: SHADOW.reach,
  top: SHADOW.reach,
  bottom: -SHADOW.reach,
  near: 1,
  far: SHADOW.distance * 2,
});
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.traverse((object) => {
  // Depth-only helpers, such as the boats' lids, take no part in the shadows.
  if (!object.isMesh || object === sky || !object.material.colorWrite) return;
  object.castShadow = object !== water.mesh;
  object.receiveShadow = true;
});
const sound = createSound(document.getElementById('sound'));

let baseFov = 55; // the lens when nothing is being singled out

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  baseFov = camera.aspect < 1 ? 72 : 55; // widen in portrait so both banks stay in view
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const quality = createQuality(document.getElementById('quality'), (level) => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, level.pixelRatio));
  sun.castShadow = level.shadows > 0;
  if (sun.shadow.mapSize.x !== level.shadows && level.shadows > 0) {
    sun.shadow.mapSize.setScalar(level.shadows);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
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
const boatPicker = createBoatPicker(document.getElementById('boat-picker'), boatSelect, () => infoDialog.open);

function start(withTour) {
  started = true;
  document.body.classList.add('started');
  orbit.idle = ORBIT.holdSeconds;
  if (withTour) document.getElementById('tour').click();
}
// The start screen and the settings offer the same four moments of the day.
// Each is a button; they drive the same setting as the sky button, which is
// kept in a list that is not shown.
const hourSelect = document.getElementById('hour');
const momentButtons = [...document.querySelectorAll('#intro .moments button, #info .hours button')];
const showMoment = () => {
  for (const button of momentButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.hour === hourSelect.value));
  }
};
for (const button of momentButtons) {
  button.addEventListener('click', () => {
    hourSelect.value = button.dataset.hour;
    hourSelect.dispatchEvent(new Event('change'));
  });
}
hourSelect.addEventListener('change', () => {
  showMoment();
  // Choosing another hour by hand cancels the borrowed night, and that
  // change should settle at the usual pace rather than the long dusk.
  if (borrowedHour !== null && hourSelect.value !== '23.5') {
    borrowedHour = null;
    atmosphere.cancelEase();
  }
});

// The moon achievement, asked for by day, would look at a blank sky. Keep
// the visitor's hour and lend them the night until that look is over.
let borrowedHour = null;

// Wall-clock seconds for the sky to arrive at night, and to come back.
// Long enough to watch the light go; short enough that leaving does not drag.
const MOON_DUSK = 5;
const MOON_DAWN = 4;

function borrowNight() {
  const hour = Number(hourSelect.value);
  if (hour >= 21 || hour < 5.5) return false;
  if (borrowedHour === null) borrowedHour = hourSelect.value;
  atmosphere.easeOver(MOON_DUSK);
  hourSelect.value = '23.5';
  hourSelect.dispatchEvent(new Event('change'));
  return true;
}

function restoreBorrowedNight() {
  if (borrowedHour === null) return;
  const hour = borrowedHour;
  borrowedHour = null;
  if (hourSelect.value !== '23.5') return;
  atmosphere.easeOver(MOON_DAWN);
  hourSelect.value = hour;
  hourSelect.dispatchEvent(new Event('change'));
}
showMoment();

// Language: three buttons on the start screen and a list in the settings.
const languageSelect = document.getElementById('language');
const languageButtons = [...document.querySelectorAll('#intro .languages button')];
const showLanguage = () => {
  languageSelect.value = getLanguage();
  for (const button of languageButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.language === getLanguage()));
  }
};
for (const button of languageButtons) button.addEventListener('click', () => setLanguage(button.dataset.language));
languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));
onLanguageChange(showLanguage);
showLanguage();

// Tapping the map opens it out; tapping again folds it back.
const minimapCanvas = document.getElementById('minimap');
minimapCanvas.addEventListener('click', () => {
  minimapCanvas.classList.toggle('large');
  minimap.resize();
});

startButton.addEventListener('click', () => start(false));
startTourButton.addEventListener('click', () => start(true));
// The menu under the map folds and unfolds the column of actions.
const menuToggle = document.getElementById('menu-toggle');
const setMenu = (open) => {
  document.body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
};
menuToggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
// Opening a dialog is the end of the errand: fold it away.

// Resetting forgets the points already found. Ask first, and say what that does.
const resetDialog = document.getElementById('reset-confirm');
function explainReset() {
  const count = guide.tally();
  const night = guide.found.has('lluna');
  const sea = guide.markers.some((marker) => marker.bonus === 'sea' && guide.found.has(marker.id));
  const nothing = count.found === 0 && !night && !sea;
  document.getElementById('reset-do').hidden = nothing;
  const cancel = document.getElementById('reset-cancel');
  cancel.dataset.i18n = nothing ? 'close' : 'reset.no';
  cancel.textContent = t(cancel.dataset.i18n);
  const parts = [nothing ? t('reset.none') : t('reset.body', count)];
  if (!nothing && night) parts.push(t('reset.night'));
  if (!nothing && sea) parts.push(t('reset.sea'));
  document.getElementById('reset-explain').textContent = parts.join(' ');
}
for (const button of document.querySelectorAll('.reset-found')) {
  button.addEventListener('click', () => {
    setMenu(false);
    explainReset();
    if (!resetDialog.open) resetDialog.showModal();
  });
}
document.getElementById('reset-cancel').addEventListener('click', () => resetDialog.close());
document.getElementById('reset-do').addEventListener('click', () => {
  guide.reset();
  resetDialog.close();
});
onLanguageChange(() => {
  if (resetDialog.open) explainReset();
});

for (const opener of document.querySelectorAll('[data-open]')) {
  opener.addEventListener('click', () => {
    setMenu(false);
    // The sheet holds the controls, the settings and the credits; only the
    // part that was asked for is shown.
    for (const section of infoDialog.querySelectorAll('section')) section.hidden = section.id !== opener.dataset.open;
    const settings = opener.dataset.open === 'settings-section';
    infoDialog.classList.toggle('plain', !settings);
    infoDialog.showModal();
    infoDialog.scrollTop = 0;
    if (settings) openSettings();
  });
}
document.getElementById('close-info').addEventListener('click', () => {
  revertSettings();
  infoDialog.close();
});

// The settings are tried out as they are changed, and kept only if the sheet
// is saved: closing it any other way puts back what there was.
const settingSelects = [languageSelect, document.getElementById('quality'), hourSelect];
const hourCards = document.querySelector('#info .hours');
let settingsBefore = null;
// The old sheet was a sideways strip: the card left in the middle was the hour.
// The four skies sit in view, so that only applies if the row still overflows.
function centreHour(smooth) {
  if (hourCards.scrollWidth <= hourCards.clientWidth + 4) return;
  const card = hourCards.querySelector('[aria-pressed="true"]');
  if (!card) return;
  hourCards.scrollTo({ left: card.offsetLeft - (hourCards.clientWidth - card.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' });
}
function openSettings() {
  settingsBefore = settingSelects.map((select) => select.value);
  boatPicker.reset();
  centreHour(false);
}
// Put back the hour, the language and the quality unless the sheet was saved.
// Some Chromium builds close a dialog without firing `close`, so the button
// and Escape revert on their own and this stays safe to call twice.
function revertSettings() {
  if (!settingsBefore) return;
  const snapshot = settingsBefore;
  settingsBefore = null;
  settingSelects.forEach((select, i) => {
    if (select.value === snapshot[i]) return;
    select.value = snapshot[i];
    select.dispatchEvent(new Event('change'));
  });
}
document.getElementById('save-settings').addEventListener('click', () => {
  settingsBefore = null;
  if (boatSelect.value !== boatPicker.shown) {
    boatSelect.value = boatPicker.shown;
    boatSelect.dispatchEvent(new Event('change'));
  }
  infoDialog.close();
});
infoDialog.addEventListener('close', revertSettings);
infoDialog.addEventListener('cancel', () => revertSettings());
// Sliding the cards changes the hour: the one left in the middle is it.
let hourSettling = 0;
hourCards.addEventListener('scroll', () => {
  if (hourCards.scrollWidth <= hourCards.clientWidth + 4) return;
  clearTimeout(hourSettling);
  hourSettling = setTimeout(() => {
    const middle = hourCards.scrollLeft + hourCards.clientWidth / 2;
    const nearest = [...hourCards.children].reduce((best, card) =>
      Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - middle) ? card : best);
    if (nearest.dataset.hour === hourSelect.value) return;
    hourSelect.value = nearest.dataset.hour;
    hourSelect.dispatchEvent(new Event('change'));
  }, 110);
});
for (const card of hourCards.children) card.addEventListener('click', () => centreHour(true));

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

// For a few seconds after entering a ring the camera leaves the stern, steps
// to one side of the boat and zooms in on the place the card is about.
const FOCUS = { seconds: 7, back: 13, aside: 8, up: 9, narrowest: 12, speed: 2.2 };
// Going under a bridge the camera drops and closes up, to stay in the same arch as the boat.
const UNDER_BRIDGE = { back: 8.5, up: 2.9 };
// A place too far to zoom in on is visited instead: the camera flies out to
// a spot in front of it, hovers, and flies back to the boat.
// It does not park there: it comes in on an arc of `swing` radians, closing
// and sinking a little through a longer lens, as a crane shot would.
const FLIGHT = { beyond: 200, out: 3.5, hold: 4.5, back: 3, standOff: 1.25, above: 20, swing: 0.45, lens: 0.8 };
// A long flight takes longer, so it does not rush, and swings wide so that
// it reaches the place from the front instead of sliding in sideways.
const LONG_FLIGHT = { speed: 75, slowest: 2, bendFrom: 150, bend: 0.4, widest: 140 };
const focus = { subject: null, left: 0, total: 0, out: 0, hold: 0, back: 0, bend: 0, flight: false };
const MOON_DIRECTION = new THREE.Vector3(-0.4, 0.8, -0.3).normalize(); // where the moon hangs in the sky
// Radians a second at most, how quickly it gets there and how soon it eases off.
const TURN = { fastest: 1.9, gather: 5, settle: 6 };
let turnRate = 0;
const turnFrom = new THREE.Quaternion();
const turnTo = new THREE.Quaternion();
const flightSpot = new THREE.Vector3();
const flightBend = new THREE.Vector3();
const chasePosition = new THREE.Vector3();
const chaseLook = new THREE.Vector3();

// Aims a little above the moon so its disc clears the history card. Does
// nothing when the card is off to one side, as it is on a wide screen.
function dropMoonBelowCard(fovDeg) {
  const card = document.getElementById('card').getBoundingClientRect();
  if (card.height < 2) return;
  const half = THREE.MathUtils.degToRad(fovDeg) / 2;
  const radiusPx = (Math.atan(38 / 1080) / (half * 2)) * window.innerHeight;
  const centerX = window.innerWidth / 2;
  if (card.right < centerX - radiusPx || card.left > centerX + radiusPx) return;
  if (card.bottom < window.innerHeight / 2 - radiusPx) return;
  const floor = window.innerHeight - (document.body.classList.contains('touch') ? 210 : 100);
  const targetY = Math.min(card.bottom + 16 + radiusPx, floor - radiusPx);
  const ndcY = 1 - (2 * targetY) / window.innerHeight;
  const pitch = -Math.atan(Math.tan(half) * ndcY);
  const span = Math.hypot(MOON_DIRECTION.x, MOON_DIRECTION.z);
  const elev = THREE.MathUtils.clamp(Math.asin(MOON_DIRECTION.y) + pitch, 0.15, 1.2);
  viewDirection.set(
    (MOON_DIRECTION.x / span) * Math.cos(elev),
    Math.sin(elev),
    (MOON_DIRECTION.z / span) * Math.cos(elev),
  );
  lookGoal.copy(cameraGoal).addScaledVector(viewDirection, 400);
}

// How far down the picture has to slide, as a share of half its height, for
// the middle of the view to land in the middle of what the card leaves
// free. Nothing when the card is off to one side, as on a wide screen.
let viewShift = 0;
let viewShifted = false;
const cardElement = document.getElementById('card');
function shiftBelowCard() {
  const card = cardElement.getBoundingClientRect();
  if (card.height < 2 || card.width < window.innerWidth * 0.5) return 0;
  const floor = window.innerHeight - (document.body.classList.contains('touch') ? 210 : 100);
  const middle = (card.bottom + floor) / 2;
  return Math.max(0, (2 * middle) / window.innerHeight - 1);
}
// On a phone the card shows its first lines; a tap opens and closes it.
cardElement.addEventListener('click', (event) => {
  if (!event.target.closest('a')) cardElement.classList.toggle('open');
});

function updateCamera(dt, snap = false) {
  let wantedFov = baseFov;
  focus.left -= dt;

  // Where the camera would be if it were simply following the boat.
  const tucked = THREE.MathUtils.smoothstep(boat.state.underBridge, 0.3, 0.75);
  const angle = boat.state.heading + orbit.yaw * (1 - tucked);
  viewDirection.set(Math.sin(angle), 0, Math.cos(angle));
  chasePosition
    .copy(boat.mesh.position)
    .addScaledVector(viewDirection, -THREE.MathUtils.lerp(CAMERA_BACK, UNDER_BRIDGE.back, tucked));
  chasePosition.y = THREE.MathUtils.lerp(CAMERA_UP + orbit.lift, UNDER_BRIDGE.up, tucked);
  chaseLook.copy(boat.mesh.position).addScaledVector(viewDirection, 8);
  chaseLook.y = 2;

  if (focus.left > 0 && focus.flight) {
    const { subject } = focus;
    const elapsed = focus.total - focus.left;
    const going = THREE.MathUtils.smootherstep(elapsed, 0, focus.out);
    const returning = THREE.MathUtils.smootherstep(elapsed, focus.out + focus.hold, focus.total);
    const away = going - returning; // 0 at the boat, 1 at the place
    // Hover in front of the place if it has a front, otherwise on the boat's side of it.
    let [dx, dz] = subject.facing ?? [boat.mesh.position.x - subject.x, boat.mesh.position.z - subject.z];
    const distance = Math.hypot(dx, dz) || 1;
    // The arc, from just before arriving until it has started back.
    const drift = THREE.MathUtils.smoothstep(elapsed, focus.out * 0.5, focus.out + focus.hold + focus.back * 0.3);
    const swing = (drift - 0.5) * FLIGHT.swing;
    [dx, dz] = [
      (dx * Math.cos(swing) - dz * Math.sin(swing)) / distance,
      (dx * Math.sin(swing) + dz * Math.cos(swing)) / distance,
    ];
    // Upright, a phone's lens is narrow across: stand further back, or the
    // place does not fit. The longer lens asks for a little more as well.
    const fit = Math.max(1, 0.8 / camera.aspect) / Math.sqrt(FLIGHT.lens);
    const standOff = subject.span * (subject.standOff ?? FLIGHT.standOff) * fit * (1.12 - 0.2 * drift);
    const above = (subject.above ?? FLIGHT.above) * Math.sqrt(fit) * (1.15 - 0.3 * drift);
    flightSpot.set(subject.x + dx * standOff, subject.y + above, subject.z + dz * standOff);
    wantedFov = THREE.MathUtils.lerp(baseFov, baseFov * FLIGHT.lens, away);
    // A curve from the boat to the spot, pulled out in front of the place.
    flightBend.set(flightSpot.x + dx * focus.bend, flightSpot.y, flightSpot.z + dz * focus.bend);
    cameraGoal.lerpVectors(flightBend, flightSpot, away);
    flightBend.lerpVectors(chasePosition, flightBend, away);
    cameraGoal.lerpVectors(flightBend, cameraGoal, away);
    // Rise over the roofs on the way there and back, unless it is a short hop.
    cameraGoal.y += Math.sin(away * Math.PI) * (subject.fly ? 4 : 18);
    lookGoal.set(subject.x, subject.y, subject.z).lerp(chaseLook, 1 - Math.min(1, away * 2.5));
  } else if (focus.left > 0) {
    const { subject } = focus;
    const dx = subject.x - boat.mesh.position.x;
    const dz = subject.z - boat.mesh.position.z;
    const distance = Math.hypot(dx, dz) || 1;
    // Too close to step back from: the place is all around the boat already.
    if (distance < 25) focus.left = 0;
    viewDirection.set(dx / distance, 0, dz / distance);
    cameraGoal
      .copy(boat.mesh.position)
      .addScaledVector(viewDirection, -FOCUS.back)
      .add(lookGoal.set(-viewDirection.z, 0, viewDirection.x).multiplyScalar(FOCUS.aside));
    cameraGoal.y = FOCUS.up;
    lookGoal.set(subject.x, subject.y, subject.z);
    // Narrow the lens until the place fills the view, however far it is.
    const fitting = THREE.MathUtils.radToDeg(2 * Math.atan(subject.span / 2 / distance));
    wantedFov = THREE.MathUtils.clamp(fitting / Math.min(camera.aspect, 1), FOCUS.narrowest, baseFov);
    // The history card sits on the upper left. On a phone it is wide enough
    // to cover a moon framed in the middle, so aim above the disc and let it
    // sit in the clear band under the card.
    if (subject.moon) dropMoonBelowCard(wantedFov);
  } else {
    cameraGoal.copy(chasePosition);
    lookGoal.copy(chaseLook);
  }

  const quick = orbit.idle < ORBIT.holdSeconds || boat.state.underBridge > 0.3 || (focus.left > 0 && focus.flight);
  // A fast craft would leave the camera far astern: it keeps up the faster it goes.
  const ease = snap ? 1 : 1 - Math.exp(-dt * (quick ? 9 : Math.max(3, boat.state.speed / 7)));
  camera.position.lerp(cameraGoal, ease);
  lookAt.lerp(lookGoal, ease);
  // The camera never whips round: when the place a card is about lies astern,
  // it gathers speed, turns no faster than a set rate and slows into the
  // view. Dragging by hand is not held back.
  turnFrom.copy(camera.quaternion);
  camera.lookAt(lookAt);
  if (!snap && orbit.idle >= ORBIT.holdSeconds) {
    turnTo.copy(camera.quaternion);
    const wanted = Math.min(TURN.fastest, turnFrom.angleTo(turnTo) * TURN.settle);
    turnRate = Math.min(wanted, turnRate + TURN.gather * dt);
    camera.quaternion.copy(turnFrom).rotateTowards(turnTo, turnRate * dt);
  }
  if (Math.abs(camera.fov - wantedFov) > 0.05) {
    camera.fov += (wantedFov - camera.fov) * (snap ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.updateProjectionMatrix();
  }
  // Where the card lies across the top of the screen, the picture slides
  // down, so that what the camera is looking at sits in the clear part and
  // not behind the text. The moon is aimed for the card already.
  const wantedShift = focus.left > 0 && !focus.subject.moon ? shiftBelowCard() : 0;
  viewShift += (wantedShift - viewShift) * (snap ? 1 : 1 - Math.exp(-dt * 3));
  if (Math.abs(viewShift) > 0.002 || viewShifted) {
    viewShifted = Math.abs(viewShift) > 0.002;
    camera.updateProjectionMatrix();
    if (viewShifted) {
      camera.projectionMatrix.elements[9] = viewShift;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
  }
  sky.position.copy(camera.position);
}

const tourNotice = document.getElementById('tour-notice');
let tourWasActive = false;
let tourNoticeTimer = 0;
function showTourNotice() {
  tourNotice.classList.add('visible');
  clearTimeout(tourNoticeTimer);
  tourNoticeTimer = setTimeout(() => tourNotice.classList.remove('visible'), 4500);
}

// Once, on leaving the tour. Sailing back upstream arms it again.
const seaNotice = document.getElementById('sea-notice');
let seaAnnounced = false;
let seaNoticeTimer = 0;
function updateSeaNotice() {
  if (!seaNotice || !started) return;
  if (boat.state.s > path.end + 8 && !seaAnnounced) {
    seaAnnounced = true;
    seaNotice.classList.add('visible');
    clearTimeout(seaNoticeTimer);
    seaNoticeTimer = setTimeout(() => seaNotice.classList.remove('visible'), 6500);
  } else if (boat.state.s < path.end - 40) {
    seaAnnounced = false;
    seaNotice.classList.remove('visible');
  }
}

// Where the mist starts to close in before the end of the river, where it is
// at its thickest, how near the end the way through is, and the seconds it
// takes to lift once through.
const MIST = { from: 170, thick: 30, gate: 3, lifts: 5 };
const mistVeil = document.getElementById('mist');
let arriving = 0;
let shownMist = 0;
// Seen from upstream it is a pale wall across the river, the colour of the haze.
const mistBank = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const pen = canvas.getContext('2d');
  const fade = pen.createLinearGradient(0, 0, 0, 128);
  fade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  fade.addColorStop(0.55, 'rgba(255, 255, 255, 0.75)');
  fade.addColorStop(1, 'rgba(255, 255, 255, 1)');
  pen.fillStyle = fade;
  pen.fillRect(0, 0, 4, 128);
  const material = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  const bank = new THREE.Group();
  for (const beyond of [20, 55, 95]) {
    const at = path.pointAt(path.seaEnd + beyond);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1400, 90), material);
    sheet.position.set(at.x, 45, at.z);
    sheet.rotation.y = Math.atan2(at.tx, at.tz);
    bank.add(sheet);
  }
  bank.material = material;
  scene.add(bank);
  return bank;
})();

const clock = new THREE.Clock();
let shownDistance = -1;
let shownTotal = tourMetres;
let onSea = false;
let frames = 0;
let fpsWindowStart = performance.now();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  input.setLookOnly(tour.active);
  const axes = input.update(dt);
  if (!started) {
    axes.throttle = 0;
    axes.steer = 0;
    axes.used = false;
    orbit.yaw += dt * 0.06;
    orbit.lift = 2;
    orbit.idle = 0;
  }
  if (tour.active) {
    // On the guided tour the boat steers itself and dragging only looks
    // around. Trying to steer brings up a reminder of how to take the helm.
    if (!tourWasActive || axes.throttle !== 0 || axes.steer !== 0 || axes.lookStarted) showTourNotice();
    Object.assign(axes, tour.drive(boat.state));
  } else if (tourWasActive) {
    tourNotice.classList.remove('visible');
  }
  tourWasActive = tour.active;
  updateSeaNotice();

  // The river ends in a bank of mist, out at sea. Sailed through, it comes
  // out at the head of the river, where it lifts. The tour itself ends earlier.
  const toEnd = path.seaEnd - boat.state.s;
  let returned = false;
  if (started && toEnd <= MIST.gate) {
    boat.relaunch();
    tour.stop();
    focus.left = 0;
    orbit.yaw = 0;
    orbit.lift = 0;
    arriving = 1;
    returned = true;
  }
  arriving = Math.max(0, arriving - dt / MIST.lifts);
  const closing = returned ? 0 : THREE.MathUtils.smoothstep(MIST.from - toEnd, 0, MIST.from - MIST.thick);
  atmosphere.state.mist = Math.max(closing, arriving);
  if (atmosphere.state.mist !== shownMist) {
    shownMist = atmosphere.state.mist;
    mistVeil.style.opacity = (shownMist ** 1.6 * 0.94).toFixed(3);
  }

  atmosphere.update(dt);
  if (shownMist > 0) mistVeil.style.backgroundColor = `#${scene.fog.color.getHexString()}`;
  mistBank.material.color.copy(scene.fog.color);
  // While the camera is showing a place off, the boat idles along.
  boat.update(dt, axes, time, focus.left > 0 ? FOCUS.speed : Infinity);
  sun.target.position.copy(boat.mesh.position);
  sun.position.copy(boat.mesh.position).addScaledVector(atmosphere.state.sunDirection, SHADOW.distance);
  // On a flight the water is animated and drawn around the camera, not the boat.
  const flying = focus.left > 0 && focus.flight;
  const waterRow = flying ? path.project(camera.position.x, camera.position.z).index : boat.state.row;
  water.update(time, waterRow);
  sea.update(time, waterRow);
  life.update(dt, time, boat.state, atmosphere.state);
  sound.update(dt, boat.state.speed);
  nightLights.update(time, atmosphere.state.night);
  const windowGlow = atmosphere.state.night * 1.4;
  city.userData.facades.emissiveIntensity = windowGlow;
  if (sea.facades) sea.facades.emissiveIntensity = windowGlow;
  if (started) updateOrbit(dt, axes);
  if (axes.looking) focus.left = 0; // looking around by hand takes the camera back
  updateCamera(dt, returned);
  cullInstances(camera, scene.fog.far);
  quality.update(dt);
  renderer.render(scene, camera);
  // The pale line is the join. A few metres of slack, the same as the notice,
  // so the sheet does not flicker while the boat sits on it.
  if (onSea) {
    if (boat.state.s < path.end - 40) onSea = false;
  } else if (boat.state.s > path.end + 8) onSea = true;
  guide.setBeyond(onSea);
  if (started) guide.update(time, boat.state);
  minimap.update(boat.state, onSea);

  // In the city the metres are the tour. Past the line they start again,
  // from there to the mist at the end of the river.
  const distance = onSea
    ? Math.round(Math.min(Math.max(boat.state.s, path.end), path.seaEnd) - path.end)
    : Math.round(Math.min(boat.state.s, path.end) - path.start);
  const total = onSea ? seaMetres : tourMetres;
  if (distance !== shownDistance || total !== shownTotal) {
    shownDistance = distance;
    shownTotal = total;
    distanceLabel.textContent = distance;
    totalLabel.textContent = total;
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

startButton.dataset.i18n = 'start.go';
startButton.textContent = t('start.go');
startButton.disabled = false;
startTourButton.disabled = false;
window.__valenciaReady = true;

if (debug) {
  debugPanel.hidden = false;
  window.__valencia = { boat, renderer, scene, camera, path, layout, orbit, guide, tour, atmosphere, sound, focus };
}
