import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RIVER, COLORS } from './config.js';
import { waveHeight } from './water.js';
import { TEXTURES } from './materials.js';

const MAX_SPEED = 9;
const MAX_REVERSE = -2.5;
const ACCELERATION = 6;
const DRAG = 0.6;
const TURN_RATE = 0.9;

// Boats. The bow points to +Z, +X is the port side and the waterline sits at
// y = 0. Each type is a set of hull lines, given as functions of t from -1 at
// the stern to +1 at the bow, plus its rig and crew.
const STATIONS = 18;
const GIRTH = 12;

export const BOAT_TYPES = {
  // The flat-bottomed boat of the Albufera: long, low and double-ended, with
  // a tarred hull, a big lateen sail and a boatman poling from the stern.
  albufera: {
    length: 9.5,
    halfBeam: (t) => 1.0 * (1 - Math.abs(t) ** 2.4) ** 0.8,
    sheer: (t) => 0.3 + 0.16 * t * t + 0.22 * t ** 4,
    keel: (t) => -0.14 + 0.3 * t ** 4,
    flare: 0.35, // low values square the sides off into a chine
    turn: 5, // high values flatten the bottom
    hull: 0x2e2620,
    sole: { height: -0.03, width: 0.86 },
    thwarts: [-0.42, 0.3],
    mast: { foot: [0, 0, 1.6], head: [0, 6.1, 2.1] },
    sail: { tack: [0.12, 0.9, 4.55], peak: [0.12, 8.3, -1.2], clew: [1.65, 0.8, -3.5] },
    rudder: { height: 0.6, depth: 0.34, drop: -0.06 },
    crew: 'poling',
    cargo: -0.6,
  },
  // A rounder, deeper river boat with the boatman sitting at the tiller.
  lateen: {
    length: 7,
    halfBeam: (t) => 1.15 * (1 - Math.abs(t) ** (t < 0 ? 3 : 2.2)) ** 0.75,
    sheer: (t) => 0.55 + 0.3 * t * t + 0.18 * Math.max(t, 0) ** 3,
    keel: (t) => -0.36 + 0.5 * Math.abs(t) ** 3,
    flare: 0.6,
    turn: 2.2,
    hull: 0x8a5a34,
    sole: { height: 0.02, width: 0.72 },
    thwarts: [-0.5, -0.05, 0.42],
    mast: { foot: [0, 0.05, 0.9], head: [0, 5.4, 1.15] },
    sail: { tack: [0.12, 1.5, 3.3], peak: [0.12, 6.2, -1.5], clew: [1.35, 1.25, -2.3] },
    rudder: { height: 0.95, depth: 0.42, drop: 0.02 },
    crew: 'seated',
    cargo: 1.9,
  },
};
export const DEFAULT_BOAT = 'albufera';
// Not of the period, and not pretending to be: a jet ski and a motor launch,
// three and five times as fast as a boat under sail.
const FAST_CRAFT = {
  jetski: { pace: 3, build: createJetSki },
  speedboat: { pace: 5, build: createSpeedboat },
};

const stationZ = (type, t) => (t * type.length) / 2;

function sharedMaterials() {
  const planks = TEXTURES.planks.clone();
  planks.repeat.set(2, 1.6);
  const hull = (color) =>
    new THREE.MeshStandardMaterial({ map: planks, color, roughness: 0.8, side: THREE.DoubleSide });
  return {
    hulls: Object.fromEntries(Object.entries(BOAT_TYPES).map(([name, type]) => [name, hull(type.hull)])),
    trim: new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.7 }),
    deck: new THREE.MeshStandardMaterial({
      map: TEXTURES.planks,
      color: 0xb08a5c,
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
    // A touch of glow keeps the sail readable when it is seen against the light.
    sail: new THREE.MeshStandardMaterial({
      map: TEXTURES.cloth,
      color: COLORS.sail,
      emissive: COLORS.sail,
      emissiveIntensity: 0.1,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 1 }),
    breeches: new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc9946f, roughness: 0.9 }),
    straw: new THREE.MeshStandardMaterial({ color: 0xd9b96a, roughness: 1 }),
    sack: new THREE.MeshStandardMaterial({ map: TEXTURES.cloth, color: 0xb9a27a, roughness: 1 }),
    rope: new THREE.LineBasicMaterial({ color: 0x3a2e22 }),
  };
}
const MATERIALS = sharedMaterials();

export function setSailLight(light) {
  MATERIALS.sail.emissiveIntensity = 0.1 * light;
}

// A lantern at the bow of every boat: a small bright core and a soft halo,
// both faded in at night.
function createHaloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 200, 120, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 160, 70, 0.45)');
  gradient.addColorStop(1, 'rgba(255, 140, 50, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
const LANTERN = {
  core: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 }),
  halo: new THREE.SpriteMaterial({
    map: createHaloTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  }),
  geometry: new THREE.SphereGeometry(0.09, 8, 6),
};

export function setLanternLight(night) {
  LANTERN.core.opacity = night;
  LANTERN.halo.opacity = night;
}

function createHullGeometry(type) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= STATIONS; i++) {
    const t = (i / STATIONS) * 2 - 1;
    for (let j = 0; j <= GIRTH; j++) {
      const a = (j / GIRTH) * 2 - 1; // -1 and +1 are the gunwales, 0 is the keel
      positions.push(
        type.halfBeam(t) * Math.sign(a) * Math.abs(a) ** type.flare,
        type.keel(t) + (type.sheer(t) - type.keel(t)) * Math.abs(a) ** type.turn,
        stationZ(type, t),
      );
      uvs.push(i / STATIONS, j / GIRTH);
    }
  }
  const row = GIRTH + 1;
  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < GIRTH; j++) {
      const a = i * row + j;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// An unseen lid over the open hull, from gunwale to gunwale. It is drawn
// after the boat and before the river, into the depth buffer only, so the
// water surface that would otherwise show inside the hull is discarded.
function createLidGeometry(type) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= STATIONS; i++) {
    const t = (i / STATIONS) * 2 - 1;
    const z = stationZ(type, t);
    positions.push(-type.halfBeam(t), type.sheer(t), z, type.halfBeam(t), type.sheer(t), z);
    if (i < STATIONS) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

// Draw order for the trick above: boats first, then their lids, then the river.
export const DRAW_ORDER = { lid: 1, water: 2 };
const LID_MATERIAL = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });

// Floorboards: the hull's outline, narrowed, laid flat near the bottom.
function createSoleGeometry(type) {
  const outline = new THREE.Shape();
  const steps = 14;
  const edge = (i) => {
    const t = -0.86 + (1.72 * i) / steps;
    return [type.halfBeam(t) * type.sole.width, stationZ(type, t)];
  };
  for (let i = 0; i <= steps; i++) {
    const [x, z] = edge(i);
    outline[i ? 'lineTo' : 'moveTo'](x, z);
  }
  for (let i = steps; i >= 0; i--) {
    const [x, z] = edge(i);
    outline.lineTo(-x, z);
  }
  const geometry = new THREE.ShapeGeometry(outline);
  geometry.rotateX(Math.PI / 2); // the shape's y becomes z
  geometry.translate(0, type.sole.height, 0);
  return geometry;
}

function createSailGeometry(tack, peak, clew) {
  const rows = 9;
  const positions = [];
  const uvs = [];
  const indices = [];
  const indexOf = [];
  for (let i = 0; i <= rows; i++) {
    indexOf.push([]);
    for (let j = 0; j <= rows - i; j++) {
      const u = i / rows;
      const v = j / rows;
      // The belly is deepest in the middle of the cloth and nil at its edges.
      const belly = 27 * u * v * (1 - u - v) * 0.6;
      indexOf[i].push(positions.length / 3);
      positions.push(
        tack.x + u * (peak.x - tack.x) + v * (clew.x - tack.x) + belly,
        tack.y + u * (peak.y - tack.y) + v * (clew.y - tack.y),
        tack.z + u * (peak.z - tack.z) + v * (clew.z - tack.z),
      );
      uvs.push(u, v);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows - i; j++) {
      indices.push(indexOf[i][j], indexOf[i + 1][j], indexOf[i][j + 1]);
      if (j < rows - i - 1) indices.push(indexOf[i + 1][j], indexOf[i + 1][j + 1], indexOf[i][j + 1]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A spar between two points.
function spar(from, to, radius) {
  const axis = to.clone().sub(from);
  const geometry = new THREE.CylinderGeometry(radius * 0.8, radius, axis.length(), 8);
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize()),
  );
  geometry.translate(...from.clone().add(to).multiplyScalar(0.5).toArray());
  return geometry;
}

// Each type is built once: a boat is then a handful of meshes over these
// shared geometries, one per material.
function createParts(type) {
  const pieces = {};
  const add = (material, geometry, x = 0, y = 0, z = 0) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    piece.translate(x, y, z);
    (pieces[material] ??= []).push(piece);
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  // The rig is kept apart, measured from the foot of the mast, so that it can
  // be lowered as one piece to pass under a bridge.
  const rigPieces = {};
  const mastFoot = v(...type.mast.foot);
  const addRig = (material, geometry) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    piece.translate(-mastFoot.x, -mastFoot.y, -mastFoot.z);
    (rigPieces[material] ??= []).push(piece);
  };
  // So are the boatman's arms and his pole, which swing from the shoulders.
  const strokePieces = {};
  let shoulders = null;
  const addStroke = (material, geometry) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    piece.translate(-shoulders.x, -shoulders.y, -shoulders.z);
    (strokePieces[material] ??= []).push(piece);
  };
  const { halfBeam, sheer } = type;
  const z = (t) => stationZ(type, t);

  add('hull', createHullGeometry(type));
  add('deck', createSoleGeometry(type));

  // Gunwales, stem and stern posts
  for (const side of [-1, 1]) {
    const rail = [];
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * 2 - 1;
      rail.push(v(side * halfBeam(t), sheer(t) + 0.02, z(t)));
    }
    add('trim', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 32, 0.055, 6));
  }
  add('trim', new THREE.BoxGeometry(0.09, 0.85, 0.12), 0, sheer(1) + 0.35, z(1) - 0.03);
  add('trim', new THREE.BoxGeometry(0.09, 0.4, 0.12), 0, sheer(-1) + 0.12, z(-1) + 0.03);

  for (const t of type.thwarts) {
    add('deck', new THREE.BoxGeometry(halfBeam(t) * 1.86, 0.06, 0.3), 0, sheer(t) - 0.14, z(t));
  }

  // Rig: raked mast, yard and a lateen sail sheeted out to port
  const mastHead = v(...type.mast.head);
  const tack = v(...type.sail.tack);
  const peak = v(...type.sail.peak);
  const clew = v(...type.sail.clew);
  addRig('trim', spar(mastFoot, mastHead, 0.085));
  addRig('trim', spar(tack.clone().lerp(peak, -0.05), peak.clone().lerp(tack, -0.04), 0.05));
  // The sail is built in a frame of its own, lying along the yard, so that it
  // can be gathered up to the yard instead of trailing in the water when the
  // rig comes down: x runs from tack to peak, y towards the clew.
  const along = peak.clone().sub(tack).normalize();
  const toClew = clew.clone().sub(tack);
  const across = toClew.sub(along.clone().multiplyScalar(toClew.dot(along))).normalize();
  const sailFrame = new THREE.Matrix4()
    .makeBasis(along, across, along.clone().cross(across))
    .setPosition(tack.clone().sub(mastFoot));
  const sailGeometry = createSailGeometry(tack, peak, clew);
  sailGeometry.translate(-mastFoot.x, -mastFoot.y, -mastFoot.z);
  sailGeometry.applyMatrix4(sailFrame.clone().invert());

  // Rudder and tiller
  const { rudder } = type;
  add('trim', new THREE.BoxGeometry(0.06, rudder.height, rudder.depth), 0, rudder.drop, z(-1) - rudder.depth / 2);
  add('trim', spar(v(0, sheer(-1) - 0.05, z(-1) - 0.1), v(0.1, sheer(-1) + 0.35, z(-1) + 1.15), 0.035));

  if (type.crew === 'seated') {
    // The boatman sits aft with a hand on the tiller; an oar lies along the side.
    const seat = z(-0.62);
    add('breeches', new THREE.BoxGeometry(0.36, 0.22, 0.5), 0.12, 0.5, seat + 0.2);
    add('shirt', new THREE.CapsuleGeometry(0.19, 0.36, 4, 10), 0.12, 0.92, seat);
    add('shirt', spar(v(0.0, 1.05, seat), v(0.06, 0.9, seat - 0.55), 0.06));
    add('skin', new THREE.SphereGeometry(0.14, 12, 10), 0.12, 1.38, seat);
    add('straw', new THREE.CylinderGeometry(0.3, 0.3, 0.025, 14), 0.12, 1.49, seat);
    add('straw', new THREE.CylinderGeometry(0.12, 0.15, 0.13, 12), 0.12, 1.56, seat);
    add('deck', spar(v(-0.55, 0.42, -2.2), v(-0.62, 0.5, 1.9), 0.035));
    add('deck', new THREE.BoxGeometry(0.16, 0.03, 0.6), -0.63, 0.5, 2.1);
  } else {
    // The boatman stands aft and pushes on a long pole that reaches the bottom.
    const post = z(-0.72);
    const floor = type.sole.height;
    add('breeches', new THREE.BoxGeometry(0.32, 0.8, 0.24), 0, floor + 0.4, post);
    add('shirt', new THREE.CapsuleGeometry(0.18, 0.4, 4, 10), 0, floor + 1.15, post);
    add('skin', new THREE.SphereGeometry(0.14, 12, 10), 0, floor + 1.66, post);
    add('straw', new THREE.CylinderGeometry(0.3, 0.3, 0.025, 14), 0, floor + 1.77, post);
    add('straw', new THREE.CylinderGeometry(0.12, 0.15, 0.13, 12), 0, floor + 1.84, post);
    shoulders = v(0, floor + 1.35, post);
    const grip = v(-0.42, floor + 1.25, post - 0.15);
    addStroke('shirt', spar(v(-0.12, floor + 1.35, post), grip, 0.055));
    addStroke('shirt', spar(v(0.12, floor + 1.3, post), grip.clone().add(v(0.05, 0.35, 0.2)), 0.055));
    addStroke('deck', spar(v(-0.5, -1.6, post - 2.1), v(-0.36, floor + 2.5, post + 0.75), 0.03));
  }

  // Cargo: sacks and a barrel
  const sack = () => new THREE.SphereGeometry(0.3, 10, 8).scale(1, 0.62, 1.25);
  const load = type.cargo;
  const floor = type.sole.height;
  add('sack', sack(), 0.3, floor + 0.2, load);
  add('sack', sack(), -0.25, floor + 0.2, load + 0.15);
  add('sack', sack().rotateY(0.9), 0.05, floor + 0.52, load + 0.05);
  add('deck', new THREE.CylinderGeometry(0.24, 0.2, 0.5, 12), -0.3, floor + 0.27, load - 1.1);

  const geometries = Object.fromEntries(
    Object.entries(pieces).map(([material, list]) => [material, mergeGeometries(list)]),
  );

  // Standing and running rigging, as plain lines
  const lines = [
    [mastHead, v(halfBeam(0.1), sheer(0.1), z(0.1))],
    [mastHead, v(-halfBeam(0.1), sheer(0.1), z(0.1))],
    [mastHead, tack.clone().lerp(peak, 0.45)],
    [clew, v(0.6, sheer(-0.8), z(-0.8))],
    [tack, v(0, sheer(1) + 0.3, z(1))],
  ];
  const rigging = new THREE.BufferGeometry().setFromPoints(lines.flat().map((point) => point.clone().sub(mastFoot)));
  const rigGeometries = Object.fromEntries(
    Object.entries(rigPieces).map(([material, list]) => [material, mergeGeometries(list)]),
  );

  const strokeGeometries = Object.fromEntries(
    Object.entries(strokePieces).map(([material, list]) => [material, mergeGeometries(list)]),
  );

  return {
    geometries,
    rigGeometries,
    rigFoot: mastFoot.toArray(),
    sailGeometry,
    sailFrame,
    strokeGeometries,
    shoulders: shoulders?.toArray() ?? null,
    rigging,
    lid: createLidGeometry(type),
    lantern: [0, sheer(1) + 0.75, z(1) - 0.05],
  };
}

// The jet ski: a closed hull with a saddle and the same boatman astride it
// with his straw hat on. Both fast craft throw a plume of spray astern that
// grows with the speed.
function createJetSki() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const pieces = {};
  const add = (material, geometry, x = 0, y = 0, z = 0) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    piece.translate(x, y, z);
    (pieces[material] ??= []).push(piece);
  };
  // Hull and deck: two flattened shells, the upper one narrower
  add('shell', new THREE.SphereGeometry(1, 20, 12).scale(0.58, 0.3, 1.65), 0, 0.12, 0);
  add('accent', new THREE.SphereGeometry(1, 20, 12).scale(0.46, 0.3, 1.35), 0, 0.3, 0.12);
  add('shell', new THREE.BoxGeometry(0.5, 0.34, 0.9).rotateX(-0.3), 0, 0.62, 0.62); // cowl
  add('saddle', new THREE.BoxGeometry(0.36, 0.16, 1.15), 0, 0.62, -0.55);
  // Steering column, handlebar and a low screen
  add('saddle', spar(v(0, 0.7, 0.55), v(0, 1.02, 0.36), 0.05));
  add('saddle', new THREE.CylinderGeometry(0.035, 0.035, 0.78, 8).rotateZ(Math.PI / 2), 0, 1.03, 0.36);
  add('saddle', new THREE.BoxGeometry(0.42, 0.2, 0.03).rotateX(-0.6), 0, 0.9, 0.78);
  // The boatman, sitting astride and leaning into it
  const seat = -0.4;
  for (const side of [-1, 1]) {
    add('breeches', spar(v(side * 0.2, 0.74, seat), v(side * 0.36, 0.34, seat + 0.42), 0.085));
    add('shirt', spar(v(side * 0.2, 1.36, seat + 0.16), v(side * 0.36, 1.05, 0.34), 0.055));
  }
  add('breeches', new THREE.BoxGeometry(0.38, 0.2, 0.42), 0, 0.78, seat);
  add('shirt', new THREE.CapsuleGeometry(0.19, 0.38, 4, 10).rotateX(0.22), 0, 1.2, seat + 0.08);
  add('skin', new THREE.SphereGeometry(0.14, 12, 10), 0, 1.68, seat + 0.2);
  add('straw', new THREE.CylinderGeometry(0.3, 0.3, 0.025, 14), 0, 1.79, seat + 0.2);
  add('straw', new THREE.CylinderGeometry(0.12, 0.15, 0.13, 12), 0, 1.86, seat + 0.2);

  return {
    geometries: Object.fromEntries(Object.entries(pieces).map(([name, list]) => [name, mergeGeometries(list)])),
    materials: { ...MATERIALS, shell: paint(0xf1efe8, 0.35), accent: paint(0xc4372c, 0.4), saddle: paint(0x24211e, 0.8) },
    spray: { at: [0, 0.2, -1.45], width: 1 },
    lantern: [0, 0.82, 1.2],
  };
}

// The motor launch: a planing hull with a varnished foredeck, a screen, two
// seats and an outboard, and the boatman at the wheel.
const LAUNCH = {
  length: 6,
  halfBeam: (t) => (t < 0 ? 1 - 0.07 * t * t : (1 - t ** 2.3) ** 0.75),
  sheer: (t) => 0.58 + 0.14 * Math.max(t, 0) ** 2,
  keel: (t) => -0.28 + 0.6 * Math.max(t, 0) ** 3,
  flare: 0.55,
  turn: 2.6,
  sole: { height: 0.02, width: 0.8 },
};

function createSpeedboat() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const pieces = {};
  const add = (material, geometry, x = 0, y = 0, z = 0) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    for (const name of Object.keys(piece.attributes)) if (name !== 'position' && name !== 'normal') piece.deleteAttribute(name);
    if (!piece.attributes.normal) piece.computeVertexNormals();
    piece.translate(x, y, z);
    (pieces[material] ??= []).push(piece);
  };
  const z = (t) => stationZ(LAUNCH, t);
  add('shell', createHullGeometry(LAUNCH));
  add('shell', new THREE.BoxGeometry(LAUNCH.halfBeam(-1) * 2, 0.8, 0.06), 0, 0.17, z(-1));
  add('saddle', createSoleGeometry(LAUNCH));
  // Foredeck: the outline of the hull forward of the screen, laid on the sheer
  const deck = new THREE.Shape();
  const steps = 10;
  const edge = (i) => {
    const t = 0.12 + (0.88 * i) / steps;
    return [LAUNCH.halfBeam(t), z(t)];
  };
  for (let i = 0; i <= steps; i++) deck[i ? 'lineTo' : 'moveTo'](...edge(i));
  for (let i = steps; i >= 0; i--) deck.lineTo(-edge(i)[0], edge(i)[1]);
  add('accent', new THREE.ShapeGeometry(deck).rotateX(Math.PI / 2), 0, LAUNCH.sheer(0.4) + 0.02, 0);
  // Screen, wheel, seats and the outboard
  add('glass', new THREE.BoxGeometry(1.7, 0.42, 0.04).rotateX(-0.55), 0, LAUNCH.sheer(0.12) + 0.2, z(0.1));
  add('saddle', new THREE.TorusGeometry(0.17, 0.025, 6, 14).rotateX(-0.5), -0.4, 0.78, z(0.02));
  for (const side of [-1, 1]) {
    add('accent', new THREE.BoxGeometry(0.62, 0.14, 0.6), side * 0.4, 0.36, z(-0.22));
    add('accent', new THREE.BoxGeometry(0.62, 0.5, 0.12), side * 0.4, 0.55, z(-0.33));
  }
  add('accent', new THREE.BoxGeometry(1.5, 0.14, 0.5), 0, 0.36, z(-0.78));
  add('saddle', new THREE.BoxGeometry(0.34, 0.5, 0.42), 0, 0.85, z(-1) - 0.2);
  add('saddle', new THREE.BoxGeometry(0.12, 0.9, 0.16), 0, 0.2, z(-1) - 0.22);
  // The boatman at the wheel, on the port seat
  const seat = z(-0.22);
  add('breeches', new THREE.BoxGeometry(0.36, 0.2, 0.5), -0.4, 0.52, seat + 0.1);
  add('shirt', new THREE.CapsuleGeometry(0.19, 0.38, 4, 10), -0.4, 0.94, seat - 0.05);
  for (const side of [-1, 1]) {
    add('shirt', spar(v(-0.4 + side * 0.2, 1.1, seat), v(-0.4 + side * 0.14, 0.82, z(0.0)), 0.055));
  }
  add('skin', new THREE.SphereGeometry(0.14, 12, 10), -0.4, 1.42, seat - 0.02);
  add('straw', new THREE.CylinderGeometry(0.3, 0.3, 0.025, 14), -0.4, 1.53, seat - 0.02);
  add('straw', new THREE.CylinderGeometry(0.12, 0.15, 0.13, 12), -0.4, 1.6, seat - 0.02);

  const shell = paint(0xf3f1ea, 0.35);
  shell.side = THREE.DoubleSide;
  return {
    geometries: Object.fromEntries(Object.entries(pieces).map(([name, list]) => [name, mergeGeometries(list)])),
    materials: {
      ...MATERIALS,
      shell,
      accent: paint(0x7a3b1e, 0.45),
      saddle: paint(0x24211e, 0.8),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d4, roughness: 0.1, transparent: true, opacity: 0.45 }),
    },
    spray: { at: [0, 0.15, z(-1) - 0.4], width: 1.7 },
    lantern: [0, LAUNCH.sheer(1) + 0.3, z(1) - 0.1],
    lid: createLidGeometry(LAUNCH),
  };
}

const paint = (color, roughness) => new THREE.MeshStandardMaterial({ color, roughness });
const SPRAY = {
  // A cone lying astern, its point at the jet
  geometry: new THREE.ConeGeometry(0.55, 2.6, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, -1.3),
  material: new THREE.MeshBasicMaterial({
    color: 0xf4f7f2,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
};

function createFastModel(typeName) {
  const craft = FAST_CRAFT[typeName];
  const parts = (builtParts[typeName] ??= craft.build());
  const model = new THREE.Group();
  for (const [name, geometry] of Object.entries(parts.geometries)) {
    const mesh = new THREE.Mesh(geometry, parts.materials[name]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    model.add(mesh);
  }
  const spray = new THREE.Mesh(SPRAY.geometry, SPRAY.material);
  spray.position.set(...parts.spray.at);
  spray.rotation.x = -0.22; // thrown up as well as back
  spray.visible = false;
  model.add(spray);
  model.userData.spray = spray;
  model.userData.sprayWidth = parts.spray.width;
  model.userData.topSpeed = MAX_SPEED * craft.pace;

  const core = new THREE.Mesh(LANTERN.geometry, LANTERN.core);
  core.position.set(...parts.lantern);
  const halo = new THREE.Sprite(LANTERN.halo);
  halo.position.set(...parts.lantern);
  halo.scale.setScalar(2.4);
  model.add(core, halo);
  if (parts.lid) {
    const lid = new THREE.Mesh(parts.lid, LID_MATERIAL);
    lid.renderOrder = DRAW_ORDER.lid;
    model.add(lid);
  }
  return model;
}

const builtParts = {};

export function createBoatModel(typeName = DEFAULT_BOAT) {
  if (typeName in FAST_CRAFT) return createFastModel(typeName);
  const parts = (builtParts[typeName] ??= createParts(BOAT_TYPES[typeName]));
  const model = new THREE.Group();
  for (const [material, geometry] of Object.entries(parts.geometries)) {
    const mesh = new THREE.Mesh(geometry, material === 'hull' ? MATERIALS.hulls[typeName] : MATERIALS[material]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    model.add(mesh);
  }
  const rig = new THREE.Group();
  rig.position.set(...parts.rigFoot);
  for (const [material, geometry] of Object.entries(parts.rigGeometries)) {
    const mesh = new THREE.Mesh(geometry, MATERIALS[material]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rig.add(mesh);
  }
  const sailHolder = new THREE.Group();
  sailHolder.applyMatrix4(parts.sailFrame);
  const sail = new THREE.Mesh(parts.sailGeometry, MATERIALS.sail);
  sail.castShadow = true;
  sailHolder.add(sail);
  const lines = new THREE.LineSegments(parts.rigging, MATERIALS.rope);
  rig.add(sailHolder, lines);
  model.add(rig);
  model.userData.rig = rig;
  model.userData.sail = sail;
  model.userData.lines = lines;
  model.userData.rigDown = 0;

  if (parts.shoulders) {
    const stroke = new THREE.Group();
    stroke.position.set(...parts.shoulders);
    stroke.userData.rest = parts.shoulders[1];
    for (const [material, geometry] of Object.entries(parts.strokeGeometries)) {
      const mesh = new THREE.Mesh(geometry, MATERIALS[material]);
      mesh.castShadow = true;
      stroke.add(mesh);
    }
    model.add(stroke);
    model.userData.stroke = stroke;
  }

  const core = new THREE.Mesh(LANTERN.geometry, LANTERN.core);
  core.position.set(...parts.lantern);
  const halo = new THREE.Sprite(LANTERN.halo);
  halo.position.set(...parts.lantern);
  halo.scale.setScalar(2.4);
  model.add(core, halo);

  const lid = new THREE.Mesh(parts.lid, LID_MATERIAL);
  lid.renderOrder = DRAW_ORDER.lid;
  model.add(lid);
  return model;
}

// Below this speed a boat with a poling boatman goes under the pole, sail down.
const SAILING_SPEED = 3.2;

// Moves what moves on a boat. The rig is laid back over the stern near a
// bridge and, where the boatman poles, whenever the boat is going too slowly
// to sail; then he works the pole, the faster the boat the quicker.
// `underSail` keeps the sail up whatever the speed, as on the boats that are
// only scenery.
export function animateBoat(model, dt, time, { closeness, speed, underSail = false }) {
  const data = model.userData;
  if (data.spray) {
    const thrust = THREE.MathUtils.clamp(speed / data.topSpeed, 0, 1);
    data.spray.visible = thrust > 0.03;
    data.spray.scale.set(
      (0.5 + thrust * 0.6) * data.sprayWidth,
      0.4 + thrust * 0.9,
      0.25 + thrust * (1 + 0.08 * Math.sin(time * 31)),
    );
    return;
  }
  const poling = Boolean(data.stroke) && !underSail && Math.abs(speed) < SAILING_SPEED;
  const wanted = Math.max(THREE.MathUtils.smoothstep(closeness, 0.12, 0.55), poling ? 1 : 0);
  data.rigDown += (wanted - data.rigDown) * (1 - Math.exp(-dt * 2.2));
  // Down, the yard lies back over the stern with the sail gathered up to it.
  data.rig.rotation.x = -data.rigDown * 0.92;
  data.sail.scale.y = 1 - data.rigDown * 0.93;
  data.lines.visible = data.rigDown < 0.5;

  if (!data.stroke) return;
  const effort = data.rigDown * Math.min(1, Math.abs(speed) / 1.2);
  const beat = Math.sin(time * (1.6 + Math.abs(speed) * 0.35) + model.id);
  data.stroke.rotation.x = beat * 0.3 * effort;
  data.stroke.position.y = data.stroke.userData.rest + Math.max(0, -beat) * 0.12 * effort;
}

export function createBoat(path, bridgeGuide) {
  // The visitor's boat is a holder whose model can be swapped for another type.
  const mesh = new THREE.Group();
  mesh.rotation.order = 'YXZ';
  let model = null;
  let pace = 1; // how many times faster than a boat under sail
  function setType(typeName) {
    if (model) mesh.remove(model);
    const known = typeName in FAST_CRAFT || typeName in BOAT_TYPES;
    model = createBoatModel(known ? typeName : DEFAULT_BOAT);
    pace = FAST_CRAFT[typeName]?.pace ?? 1;
    mesh.add(model);
  }
  setType(DEFAULT_BOAT);

  // Heading is measured so that forward = (sin h, cos h) on the (x, z) plane.
  const launch = path.sampleAt(path.start + 8);
  const state = {
    x: launch.x,
    z: launch.z,
    heading: Math.atan2(launch.tx, launch.tz),
    speed: 0,
    s: path.start + 8, // distance along the river
    row: 0, // nearest centreline sample
    underBridge: 0, // 0 in open water, 1 right under a bridge
  };
  const limit = RIVER.width / 2 - RIVER.margin;
  const forward = new THREE.Vector3();

  function update(dt, input, time, speedLimit = Infinity) {
    state.speed += input.throttle * ACCELERATION * pace * dt;
    state.speed -= state.speed * DRAG * dt;
    state.speed = THREE.MathUtils.clamp(state.speed, MAX_REVERSE, MAX_SPEED * pace);
    // A limit is eased into rather than snapped to.
    if (state.speed > speedLimit) state.speed = Math.max(speedLimit, state.speed - 9 * dt);

    // The rudder needs way on to bite; keep a little authority at rest so the
    // boat can still be pointed somewhere.
    let rudder = THREE.MathUtils.clamp(state.speed / 3, -1, 1);
    if (Math.abs(rudder) < 0.25) rudder = 0.25;
    state.heading -= input.steer * TURN_RATE * rudder * dt;

    const dirX = Math.sin(state.heading);
    const dirZ = Math.cos(state.heading);
    state.x += dirX * state.speed * dt;
    state.z += dirZ * state.speed * dt;

    const { sample, s, lateral, index } = path.project(state.x, state.z);
    if (Math.abs(lateral) > limit) {
      const excess = lateral - Math.sign(lateral) * limit;
      state.x -= sample.rx * excess;
      state.z -= sample.rz * excess;
      // Scrape along the bank: only the part of the motion aimed at it is lost.
      const intoBank = Math.abs(dirX * sample.rx + dirZ * sample.rz);
      state.speed *= 1 - Math.min(1, 2.5 * intoBank * dt);
    }
    // Near a bridge the boat is eased into an arch, and its rig comes down.
    const held = THREE.MathUtils.clamp(lateral, -limit, limit);
    const guided = bridgeGuide(s, held);
    state.x += sample.rx * (guided.lateral - held);
    state.z += sample.rz * (guided.lateral - held);
    state.underBridge = guided.closeness;
    animateBoat(model, dt, time, { closeness: guided.closeness, speed: state.speed });

    const overshoot = s < path.start ? s - path.start : s > path.end ? s - path.end : 0;
    if (overshoot !== 0) {
      state.x -= sample.tx * overshoot;
      state.z -= sample.tz * overshoot;
      state.speed = 0;
    }
    state.s = s - overshoot;
    state.row = index;

    const bow = waveHeight(state.x + dirX * 2.5, state.z + dirZ * 2.5, time);
    const stern = waveHeight(state.x - dirX * 2.5, state.z - dirZ * 2.5, time);
    mesh.position.set(state.x, (bow + stern) / 2, state.z);
    mesh.rotation.y = state.heading;
    mesh.rotation.x = (stern - bow) * 0.2;
    mesh.rotation.z = input.steer * (state.speed / (MAX_SPEED * pace)) * (pace > 1 ? 0.3 : 0.12);
  }

  function getForward() {
    return forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  }

  return { mesh, state, update, getForward, setType };
}
