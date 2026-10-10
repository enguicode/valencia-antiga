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
    // A barquetot: flat bottom, hard chine, ends alike, beam invented at about 2.1 m.
    halfBeam: (t) => 1.06 * (1 - Math.abs(t) ** 2.15) ** 0.7,
    sheer: (t) => 0.34 + 0.18 * t * t + 0.28 * t ** 4,
    keel: (t) => -0.18 + 0.26 * t ** 4,
    flare: 0.42,
    turn: 6, // keeps the floor flat until the chine
    chine: 0.82, // |a| where the side leaves the floor; normals break here
    stations: 22,
    girth: 16,
    hull: 0xffffff, // the tar is painted into the texture
    sole: { height: -0.04, width: 0.9 },
    thwarts: [-0.4, 0.05, 0.42],
    // Short mast, raked forward. The yard (entena) is longer than the boat.
    mast: { foot: [0, 0.02, 0.7], head: [0, 5.25, 2.05] },
    sail: { tack: [0.05, 0.48, 5.7], peak: [0.05, 7.7, -2.7], clew: [1.9, 0.62, -3.65], depth: 0.85 },
    rudder: { height: 0.72, depth: 0.4, drop: -0.08 },
    crew: 'poling',
    cargo: -0.85,
  },
  // A rounder, deeper river boat with the boatman sitting at the tiller.
  // Generic lateen hull: no documented lines, drawn to read as a river boat.
  lateen: {
    length: 7,
    halfBeam: (t) => 1.15 * (1 - Math.abs(t) ** (t < 0 ? 3 : 2.2)) ** 0.75,
    sheer: (t) => 0.55 + 0.3 * t * t + 0.18 * Math.max(t, 0) ** 3,
    keel: (t) => -0.36 + 0.5 * Math.abs(t) ** 3,
    flare: 0.6,
    turn: 2.2,
    stations: 20,
    girth: 14,
    hull: 0x8a5a34,
    sole: { height: 0.02, width: 0.72 },
    thwarts: [-0.55, -0.08, 0.4],
    mast: { foot: [0, 0.06, 0.55], head: [0, 5.2, 1.45] },
    sail: { tack: [0.08, 1.05, 3.7], peak: [0.08, 6.45, -1.9], clew: [1.6, 0.95, -2.45], depth: 0.58 },
    rudder: { height: 0.95, depth: 0.46, drop: 0.02 },
    crew: 'seated',
    cargo: 1.7,
  },
};
export const DEFAULT_BOAT = 'albufera';
// Gondola and junk are of the period, just not of this river. The rest are
// not pretending to be: the jet ski three times, the launch five, the
// offshore eight, the hydroplane ten and the record jet sixteen. The pontoon
// sits between the launch and the offshore, at six.
const CRAFT = {
  gondola: { pace: 1, build: createGondola },
  junk: { pace: 1, build: createJunk },
  jetski: { pace: 3, build: createJetSki },
  speedboat: { pace: 5, build: createSpeedboat },
  hydroplane: { pace: 10, build: createHydroplane },
  offshore: { pace: 8, build: createOffshore },
  pontoon: { pace: 6, build: createPontoon },
  spirit: { pace: 16, build: createSpirit },
};

// How many times faster than a boat under sail each one goes.
export const boatPace = (typeName) => CRAFT[typeName]?.pace ?? 1;

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
      map: createLateenSailTexture(),
      color: COLORS.sail,
      emissive: COLORS.sail,
      emissiveIntensity: 0.1,
      roughness: 0.92,
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

// One strip of the hull, a from a0 to a1. Normals stay inside the strip, so a
// hard chine is just three strips that do not share their edge vertices.
function hullPatch(type, stations, rows, a0, a1) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= stations; i++) {
    const t = (i / stations) * 2 - 1;
    for (let j = 0; j <= rows; j++) {
      const a = a0 + ((a1 - a0) * j) / rows; // -1 and +1 are the gunwales, 0 the keel
      positions.push(
        type.halfBeam(t) * Math.sign(a) * Math.abs(a) ** type.flare,
        type.keel(t) + (type.sheer(t) - type.keel(t)) * Math.abs(a) ** type.turn,
        stationZ(type, t),
      );
      uvs.push(i / stations, (a + 1) / 2);
    }
  }
  const row = rows + 1;
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < rows; j++) {
      const q = i * row + j;
      indices.push(q, q + row, q + 1, q + 1, q + row, q + row + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createHullGeometry(type) {
  const stations = type.stations ?? STATIONS;
  const girth = type.girth ?? GIRTH;
  if (!type.chine) return hullPatch(type, stations, girth, -1, 1);
  const chine = type.chine;
  const sideRows = Math.max(3, Math.round((girth * (1 - chine)) / 2));
  const floorRows = Math.max(4, Math.round(girth * chine));
  return mergeGeometries([
    hullPatch(type, stations, sideRows, -1, -chine),
    hullPatch(type, stations, floorRows, -chine, chine),
    hullPatch(type, stations, sideRows, chine, 1),
  ]);
}

// Tarred pine: longitudinal strakes, darker under the waterline. The hull's
// v runs from gunwale to gunwale, so the keel sits on the middle of the cloth.
function createTarredPlankTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const fromKeel = Math.abs((i + 0.5) / bands - 0.5) * 2;
    const light = 34 + fromKeel * 46 + (i % 2) * 10;
    context.fillStyle = `rgb(${light}, ${Math.round(light * 0.8)}, ${Math.round(light * 0.64)})`;
    context.fillRect(0, (i * size) / bands, size, size / bands + 1);
  }
  context.fillStyle = 'rgba(6, 4, 3, 0.9)';
  for (let i = 1; i < bands; i++) context.fillRect(0, (i * size) / bands, size, 3);
  context.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let i = 0; i < bands; i++) {
    const y = ((i + 0.55) * size) / bands;
    for (let x = 10; x < size; x += 22) context.fillRect(x, y, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
MATERIALS.hulls.albufera.map = createTarredPlankTexture();
MATERIALS.hulls.albufera.roughness = 0.9;

// Cloths run from the yard down to the foot. UV u follows the yard, v the foot.
function createLateenSailTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const cloths = 8;
  for (let i = 0; i < cloths; i++) {
    const shade = 214 + (i % 2) * 14;
    context.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 16})`;
    context.fillRect((i * size) / cloths, 0, size / cloths + 1, size);
  }
  for (let y = 0; y < size; y += 2) {
    context.fillStyle = 'rgba(80, 60, 30, 0.05)';
    context.fillRect(0, y, size, 1);
  }
  context.fillStyle = 'rgba(48, 30, 14, 0.8)';
  for (let i = 1; i < cloths; i++) {
    const x = (i * size) / cloths;
    context.fillRect(x, 0, 2, size);
    for (let y = 3; y < size; y += 6) context.fillRect(x - 1, y, 4, 2);
  }
  // A reef band parallel to the yard, and the bolt rope along the three edges.
  context.fillStyle = 'rgba(62, 40, 18, 0.45)';
  context.fillRect(0, size * 0.58, size, 6);
  context.fillStyle = 'rgba(42, 26, 12, 0.9)';
  context.fillRect(0, 0, 4, size);
  context.fillRect(0, size - 5, size, 5);
  context.beginPath();
  for (let i = 0; i < size; i += 2) {
    context.rect(i, i, 4, 2);
  }
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
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

// Half the hull's width at a given height. Zero once that height is below
// the keel, which is what kept the flat sole sticking out under the stern.
function hullHalfWidth(type, t, y) {
  const rise = type.sheer(t) - type.keel(t);
  const fraction = rise > 1e-4 ? (y - type.keel(t)) / rise : 0;
  if (fraction <= 0) return 0;
  const a = Math.min(1, fraction ** (1 / type.turn));
  return type.halfBeam(t) * a ** type.flare;
}

// Floorboards: the hull's outline at the sole's height, laid flat.
function createSoleGeometry(type) {
  const outline = new THREE.Shape();
  const steps = 16;
  const edge = (i) => {
    const t = -0.92 + (1.84 * i) / steps;
    const inside = hullHalfWidth(type, t, type.sole.height);
    const half = Math.min(type.halfBeam(t) * type.sole.width, inside * 0.92);
    return [half, stationZ(type, t)];
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

function createSailGeometry(tack, peak, clew, depth = 0.7) {
  const rows = 12;
  const positions = [];
  const uvs = [];
  const indices = [];
  const indexOf = [];
  // Draft along the sail's own normal. A sideways offset used to stay inside
  // the cloth, so the sail read as a flat board from abeam.
  const along = peak.clone().sub(tack).normalize();
  const toClew = clew.clone().sub(tack);
  const across = toClew.clone().sub(along.clone().multiplyScalar(toClew.dot(along))).normalize();
  const normal = along.clone().cross(across);
  // Sheeted out to one side: the belly leaves the cloth on that side, so the
  // sail reads as a volume from astern and from abeam.
  if (normal.x * (clew.x - tack.x) < 0) normal.negate();
  for (let i = 0; i <= rows; i++) {
    indexOf.push([]);
    for (let j = 0; j <= rows - i; j++) {
      const u = i / rows;
      const v = j / rows;
      // Deepest in the middle of the cloth, nothing along the bolt rope.
      const belly = 27 * u * v * (1 - u - v) * depth;
      indexOf[i].push(positions.length / 3);
      positions.push(
        tack.x + u * (peak.x - tack.x) + v * (clew.x - tack.x) + normal.x * belly,
        tack.y + u * (peak.y - tack.y) + v * (clew.y - tack.y) + normal.y * belly,
        tack.z + u * (peak.z - tack.z) + v * (clew.z - tack.z) + normal.z * belly,
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

// A rectangular timber following a polyline. Each face keeps its own vertices,
// so the corners stay creased and the shading stays smooth along the run.
function timberStrip(points, width, depth) {
  const halfW = width / 2;
  const halfD = depth / 2;
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const sections = points.map((point, i) => {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    const dir = after.clone().sub(before);
    if (dir.lengthSq() < 1e-8) dir.set(0, 0, 1);
    dir.normalize();
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const up = new THREE.Vector3().crossVectors(side, dir);
    if (up.y < 0) up.negate();
    if (up.lengthSq() < 1e-8) up.set(0, 1, 0);
    up.normalize();
    return { point, side, up };
  });
  const positions = [];
  const uvs = [];
  const indices = [];
  const span = Math.max(1, sections.length - 1);
  for (let c = 0; c < 4; c++) {
    const [sx0, uy0] = corners[c];
    const [sx1, uy1] = corners[(c + 1) % 4];
    const base = positions.length / 3;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      for (const [sx, uy] of [[sx0, uy0], [sx1, uy1]]) {
        const point = section.point.clone()
          .addScaledVector(section.side, sx * halfW)
          .addScaledVector(section.up, uy * halfD);
        positions.push(point.x, point.y, point.z);
        uvs.push(i / span, c / 4);
      }
    }
    for (let i = 0; i < sections.length - 1; i++) {
      const a = base + i * 2;
      indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A flat deck patch between two stations, inset from the hull at that height.
function deckPatch(type, t0, t1, y, inset = 0.08) {
  const steps = 8;
  const outline = new THREE.Shape();
  const edge = (i) => {
    const t = t0 + ((t1 - t0) * i) / steps;
    const half = Math.max(0.04, hullHalfWidth(type, t, y) - inset);
    return [half, stationZ(type, t)];
  };
  for (let i = 0; i <= steps; i++) outline[i ? 'lineTo' : 'moveTo'](...edge(i));
  for (let i = steps; i >= 0; i--) {
    const [x, z] = edge(i);
    outline.lineTo(-x, z);
  }
  const geometry = new THREE.ShapeGeometry(outline);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y, 0);
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

// Rudder blade in profile: the stock is the y axis, x runs aft, and the
// top of the stock sits on the origin. Thickness is centred on x.
function rudderBlade(height, depth, thick = 0.06) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(depth * 0.18, -height * 0.08);
  shape.lineTo(depth * 0.85, -height * 0.38);
  shape.lineTo(depth, -height * 0.7);
  shape.lineTo(depth * 0.58, -height);
  shape.lineTo(0.02, -height * 0.9);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geometry.translate(0, 0, -thick / 2);
  geometry.rotateY(Math.PI / 2); // extrude thickness to x; aft (+x in the shape) to -z
  geometry.computeVertexNormals();
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

  // Upper arm, forearm and a hand. `put` is add or addStroke: the poling
  // arms have to swing with the pole, from the shoulders.
  const limb = (put, from, to, bend) => {
    const mid = from.clone().lerp(to, 0.5).add(bend);
    put('shirt', spar(from, mid, 0.048));
    put('shirt', spar(mid, to, 0.04));
    const hand = new THREE.SphereGeometry(0.045, 6, 5);
    hand.translate(to.x, to.y, to.z);
    put('skin', hand);
  };
  const hat = (x, y, zz) => {
    add('straw', new THREE.CylinderGeometry(0.26, 0.26, 0.02, 12), x, y, zz);
    add('straw', new THREE.CylinderGeometry(0.11, 0.13, 0.1, 8), x, y + 0.06, zz);
  };
  const cleat = (x, y, zz) => {
    add('trim', new THREE.BoxGeometry(0.05, 0.04, 0.14), x, y, zz);
    add('trim', new THREE.BoxGeometry(0.14, 0.03, 0.04), x, y + 0.028, zz - 0.04);
    add('trim', new THREE.BoxGeometry(0.14, 0.03, 0.04), x, y + 0.028, zz + 0.04);
  };

  // Gunwale and a wale on the chine (or just under the rail, where there is
  // no hard chine). Rectangular timbers: a round tube read as a hose.
  for (const side of [-1, 1]) {
    const rail = [];
    for (let i = 0; i <= 16; i++) {
      const t = -0.94 + (1.88 * i) / 16;
      rail.push(v(side * halfBeam(t), sheer(t) + 0.03, z(t)));
    }
    add('trim', timberStrip(rail, 0.07, 0.042));
  }
  const waleFrac = type.chine ?? 0.88;
  for (const side of [-1, 1]) {
    const wale = [];
    for (let i = 0; i <= 14; i++) {
      const t = -0.88 + (1.76 * i) / 14;
      const a = side * waleFrac;
      wale.push(v(
        halfBeam(t) * Math.sign(a) * Math.abs(a) ** type.flare + side * 0.028,
        type.keel(t) + (sheer(t) - type.keel(t)) * Math.abs(a) ** type.turn,
        z(t),
      ));
    }
    add('deck', timberStrip(wale, 0.05, 0.028));
  }

  // Stem raked about 45° over the eyes; sternpost nearly upright, for the rudder.
  const stemHead = v(0, sheer(1) + 0.18, z(1) + 0.08);
  const sternHead = v(0, sheer(-1) + 0.14, z(-1) - 0.02);
  add('trim', spar(v(0, stemHead.y - 0.5, stemHead.z - 0.5), stemHead, 0.046));
  add('trim', spar(v(0, type.keel(-1) + 0.02, z(-1) + 0.03), sternHead, 0.048));

  // Thwarts clamped inside the section, with a short lodging knee each end.
  let aftThwart = null;
  for (const t of type.thwarts) {
    const y = Math.min(sheer(t) - 0.1, type.sole.height + 0.4);
    const half = Math.min(halfBeam(t) * 0.9, Math.max(0.2, hullHalfWidth(type, t, y + 0.03) - 0.04));
    add('deck', new THREE.BoxGeometry(half * 2, 0.05, 0.2), 0, y, z(t));
    for (const side of [-1, 1]) {
      const kneeTop = Math.min(sheer(t) - 0.04, y + 0.16);
      add('trim', spar(v(side * half * 0.94, y + 0.02, z(t)), v(side * (half + 0.06), kneeTop, z(t)), 0.018));
    }
    if (!aftThwart || t < aftThwart.t) aftThwart = { t, y };
  }

  // Floor timber plus an upright each side. Not one bent frame: these boats
  // are built that way, and a single box did not read as a rib.
  const frameAt = type.crew === 'poling' ? [-0.9, -0.32, 0.18, 0.55, 0.8] : [-0.85, -0.32, 0.28, 0.68, 0.84];
  const rib = type.crew === 'poling' ? 'deck' : 'trim';
  for (const t of frameAt) {
    if (type.thwarts.some((thwart) => Math.abs(thwart - t) < 0.08)) continue;
    const y0 = type.sole.height + 0.025;
    const y1 = Math.min(sheer(t) - 0.08, y0 + 0.5);
    const inner = hullHalfWidth(type, t, y0 + 0.02);
    if (inner < 0.22 || y1 < y0 + 0.12) continue;
    const zz = z(t);
    add(rib, new THREE.BoxGeometry(inner * 1.65, 0.04, 0.045), 0, y0, zz);
    for (const side of [-1, 1]) {
      const top = Math.min(halfBeam(t) * 0.9, hullHalfWidth(type, t, y1));
      add(rib, spar(v(side * inner * 0.78, y0 + 0.02, zz), v(side * top, y1, zz), 0.02));
    }
  }

  // Half-deck and coaming on the Albufera boat. The river boat keeps a
  // breasthook only: it is a generic lateen, not the lagoon type.
  if (type.crew === 'poling') {
    const foreY = sheer(0.66) - 0.13;
    const aftY = sheer(-0.9) - 0.12;
    add('deck', deckPatch(type, 0.66, 0.9, foreY, 0.06));
    add('deck', deckPatch(type, -0.97, -0.84, aftY, 0.05));
    const coaming = (t, y) => {
      const half = Math.max(0.16, hullHalfWidth(type, t, y) - 0.08);
      add('trim', new THREE.BoxGeometry(half * 2, 0.08, 0.05), 0, y + 0.045, z(t));
    };
    coaming(0.66, foreY);
    coaming(-0.84, aftY);
    for (const side of [-1, 1]) {
      const rail = [];
      for (let i = 0; i <= 8; i++) {
        const t = -0.5 + (1.16 * i) / 8;
        const y = Math.min(sheer(t) - 0.12, foreY);
        const half = hullHalfWidth(type, t, y) - 0.1;
        rail.push(v(side * half, y, z(t)));
      }
      add('deck', timberStrip(rail, 0.15, 0.03));
    }
    cleat(0.2, foreY + 0.03, z(0.78));
  } else {
    const hookT = 0.74;
    const hookY = sheer(hookT) - 0.1;
    const hook = new THREE.Shape();
    const hookBeam = halfBeam(hookT) * 0.7;
    hook.moveTo(-hookBeam, z(hookT));
    hook.lineTo(0, z(0.96));
    hook.lineTo(hookBeam, z(hookT));
    hook.closePath();
    const hookGeometry = new THREE.ShapeGeometry(hook);
    hookGeometry.rotateX(Math.PI / 2);
    hookGeometry.translate(0, hookY, 0);
    add('deck', hookGeometry);
    cleat(0, hookY + 0.03, z(0.84));
  }

  // Mast step, partner and a coil of rope clear of the thwarts.
  add('trim', new THREE.BoxGeometry(0.22, 0.05, 0.26), mastFoot.x, type.sole.height + 0.03, mastFoot.z);
  add('trim', new THREE.TorusGeometry(0.11, 0.026, 5, 10).rotateX(Math.PI / 2), mastFoot.x, mastFoot.y + 0.05, mastFoot.z);
  const coilAt = type.crew === 'poling' ? [0.32, z(0.3)] : [-0.32, z(-0.22)];
  for (const [radius, lift] of [[0.13, 0], [0.085, 0.028], [0.045, 0.05]]) {
    add(
      'trim',
      new THREE.TorusGeometry(radius, 0.016, 4, 10).rotateX(Math.PI / 2),
      coilAt[0],
      type.sole.height + 0.025 + lift,
      coilAt[1],
    );
  }

  // Rig. No shrouds: the halliard is the backstay. The yard is two spars
  // lashed where they overlap, with a ball and a collar at the masthead.
  const mastHead = v(...type.mast.head);
  const tack = v(...type.sail.tack);
  const peak = v(...type.sail.peak);
  const clew = v(...type.sail.clew);
  addRig('trim', spar(mastFoot, mastHead, 0.072));
  const galcer = new THREE.SphereGeometry(0.09, 8, 6);
  galcer.scale(1, 0.5, 1);
  galcer.translate(...mastHead.clone().lerp(mastFoot, 0.07).toArray());
  addRig('trim', galcer);
  const ball = new THREE.SphereGeometry(0.055, 8, 6);
  ball.translate(mastHead.x, mastHead.y + 0.06, mastHead.z);
  addRig('trim', ball);
  const yardFrom = tack.clone().lerp(peak, -0.03);
  const yardTo = peak.clone().lerp(tack, -0.02);
  const yardOffset = v(0.014, 0, 0);
  addRig('trim', spar(yardFrom, yardFrom.clone().lerp(yardTo, 0.62), 0.046));
  addRig('trim', spar(yardFrom.clone().lerp(yardTo, 0.38).add(yardOffset), yardTo.clone().add(yardOffset), 0.038));
  // The sail is built in a frame of its own, lying along the yard, so that it
  // can be gathered up to the yard instead of trailing in the water when the
  // rig comes down: x runs from tack to peak, y towards the clew.
  const along = peak.clone().sub(tack).normalize();
  const toClew = clew.clone().sub(tack);
  const across = toClew.sub(along.clone().multiplyScalar(toClew.dot(along))).normalize();
  const sailFrame = new THREE.Matrix4()
    .makeBasis(along, across, along.clone().cross(across))
    .setPosition(tack.clone().sub(mastFoot));
  const sailGeometry = createSailGeometry(tack, peak, clew, type.sail.depth ?? 0.7);
  sailGeometry.translate(-mastFoot.x, -mastFoot.y, -mastFoot.z);
  sailGeometry.applyMatrix4(sailFrame.clone().invert());

  // Rudder hung on the sternpost, heel just under the keel. The tiller comes
  // in to port, clear of the man who poles and into the helmsman's hand.
  const { rudder } = type;
  const headY = sternHead.y - 0.04;
  const heelY = type.keel(-1) - 0.16;
  const bladeH = Math.max(rudder.height * 0.8, headY - heelY);
  const rudderZ = sternHead.z - 0.045;
  add('trim', rudderBlade(bladeH, rudder.depth, 0.07), 0, headY, rudderZ);
  for (const fraction of [0.32, 0.66]) {
    const pin = new THREE.CylinderGeometry(0.022, 0.022, 0.12, 5).rotateZ(Math.PI / 2);
    add('trim', pin, 0, headY - bladeH * fraction, rudderZ);
  }

  const floor = type.sole.height;
  if (type.crew === 'seated') {
    // Sits on the aft thwart, one hand on the tiller, oar shipped to starboard.
    const seatTop = aftThwart.y + 0.025;
    const hip = v(0.02, seatTop + 0.06, z(aftThwart.t));
    const tillerHand = v(hip.x + 0.5, seatTop + 0.2, hip.z - 0.16);
    add('breeches', new THREE.BoxGeometry(0.28, 0.1, 0.22), hip.x, seatTop + 0.05, hip.z + 0.02);
    add('trim', spar(v(0.03, headY - 0.02, rudderZ), tillerHand, 0.028));
    const thigh = new THREE.CapsuleGeometry(0.06, 0.22, 2, 6);
    thigh.rotateX(Math.PI / 2);
    const shin = new THREE.CapsuleGeometry(0.048, 0.18, 2, 5);
    for (const side of [-1, 1]) {
      add('breeches', thigh.clone(), hip.x + side * 0.08, seatTop + 0.05, hip.z + 0.22);
      add('breeches', shin.clone(), hip.x + side * 0.08, seatTop - 0.16, hip.z + 0.36);
      add('breeches', new THREE.BoxGeometry(0.08, 0.04, 0.15), hip.x + side * 0.08, floor + 0.028, hip.z + 0.44);
    }
    add('shirt', new THREE.CapsuleGeometry(0.145, 0.26, 3, 8), hip.x, seatTop + 0.36, hip.z);
    add('skin', new THREE.CylinderGeometry(0.045, 0.05, 0.06, 6), hip.x, seatTop + 0.58, hip.z);
    add('skin', new THREE.SphereGeometry(0.12, 10, 8), hip.x, seatTop + 0.72, hip.z);
    hat(hip.x, seatTop + 0.84, hip.z);
    limb(add, v(hip.x + 0.13, seatTop + 0.46, hip.z), tillerHand, v(0.06, 0.02, -0.02));
    limb(add, v(hip.x - 0.13, seatTop + 0.44, hip.z), v(hip.x - 0.1, seatTop + 0.06, hip.z + 0.18), v(-0.05, 0.03, 0.03));
    const oarT = -0.15;
    const oarX = -halfBeam(oarT) + 0.02;
    const oarY = sheer(oarT) + 0.02;
    add('deck', spar(v(oarX + 0.05, oarY, z(oarT) - 0.7), v(oarX - 0.12, oarY + 0.04, z(oarT) + 0.85), 0.028));
    add('deck', new THREE.BoxGeometry(0.16, 0.018, 0.4), oarX - 0.08, oarY + 0.04, z(oarT) + 1.05);
    for (const dz of [-0.07, 0.07]) {
      add('trim', new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5), oarX, oarY + 0.08, z(oarT) + dz);
    }
  } else {
    // Stands in the well and pushes a forked pole. Arms, hands and pole swing
    // together from the shoulders; the rest of him stays put.
    const post = z(-0.72);
    // The tiller lies on the quarter. He is poling, so it does not cross his chest.
    add('trim', spar(v(0.03, headY - 0.02, rudderZ), v(0.28, sheer(-0.88) - 0.02, z(-0.82)), 0.028));
    const leg = new THREE.CapsuleGeometry(0.062, 0.36, 2, 6);
    for (const side of [-1, 1]) {
      add('breeches', leg.clone(), side * 0.08, floor + 0.28, post);
      add('breeches', new THREE.BoxGeometry(0.08, 0.04, 0.16), side * 0.08, floor + 0.028, post + 0.05);
    }
    const torso = new THREE.CapsuleGeometry(0.155, 0.32, 3, 8);
    torso.rotateX(0.12);
    add('shirt', torso, 0, floor + 0.92, post + 0.03);
    add('skin', new THREE.CylinderGeometry(0.045, 0.05, 0.06, 6), 0, floor + 1.22, post + 0.04);
    add('skin', new THREE.SphereGeometry(0.12, 10, 8), 0, floor + 1.36, post + 0.05);
    hat(0, floor + 1.48, post + 0.05);
    shoulders = v(0, floor + 1.08, post);
    // Outside the starboard planking, and longer than 3 m, with the fork in the water.
    const poleFoot = v(-1.35, -1.35, post - 0.95);
    const poleHead = v(-0.08, floor + 1.9, post + 0.12);
    const alongPole = (u) => poleFoot.clone().lerp(poleHead, u);
    limb(addStroke, shoulders.clone().add(v(0.14, 0.05, 0.02)), alongPole(0.84), v(0.02, 0.06, 0.02));
    limb(addStroke, shoulders.clone().add(v(-0.14, 0.02, 0)), alongPole(0.66), v(-0.03, 0.02, 0.02));
    addStroke('deck', spar(poleFoot, poleHead, 0.036));
    const down = poleFoot.clone().sub(poleHead).normalize();
    const prongSide = new THREE.Vector3(0, 1, 0).cross(down);
    if (prongSide.lengthSq() < 1e-6) prongSide.set(1, 0, 0);
    prongSide.normalize();
    for (const sign of [-1, 1]) {
      addStroke('deck', spar(poleFoot, poleFoot.clone().addScaledVector(down, 0.16).addScaledVector(prongSide, sign * 0.07), 0.016));
    }
  }

  // Cargo: sacks and a barrel
  const sack = () => new THREE.SphereGeometry(0.3, 10, 8).scale(1, 0.62, 1.25);
  const load = type.cargo;
  add('sack', sack(), 0.3, floor + 0.2, load);
  add('sack', sack(), -0.25, floor + 0.2, load + 0.15);
  add('sack', sack().rotateY(0.9), 0.05, floor + 0.52, load + 0.05);
  add('deck', new THREE.CylinderGeometry(0.24, 0.2, 0.5, 12), -0.3, floor + 0.27, load - 1.1);
  // An esparto basket beside the sacks, dark so it does not vanish into the
  // deck. Only the Albufera boat carries one.
  if (type.crew === 'poling') {
    const bx = 0.42;
    const bz = load - 0.95;
    add('trim', new THREE.CylinderGeometry(0.2, 0.15, 0.28, 8), bx, floor + 0.15, bz);
    add('deck', new THREE.TorusGeometry(0.2, 0.022, 5, 10).rotateX(Math.PI / 2), bx, floor + 0.28, bz);
    add('sack', new THREE.SphereGeometry(0.11, 8, 6).scale(1, 0.4, 1), bx, floor + 0.26, bz);
  }

  // Halliard (masthead to the yard, then down to a cleat: it is the backstay),
  // sheet, tack tackle to the stem, and a brace. No shrouds.
  const yardPoint = tack.clone().lerp(peak, 0.42);
  const belay = v(-0.28, floor + 0.12, z(type.crew === 'poling' ? -0.2 : -0.4));
  cleat(belay.x, belay.y, belay.z);
  const sheetPoint = v(0.42, floor + 0.14, z(type.crew === 'poling' ? -0.5 : aftThwart.t));
  cleat(sheetPoint.x, sheetPoint.y, sheetPoint.z);

  const geometries = Object.fromEntries(
    Object.entries(pieces).map(([material, list]) => [material, mergeGeometries(list)]),
  );

  const lines = [
    [mastHead, yardPoint],
    [yardPoint, belay.clone().setY(belay.y + 0.04)],
    [clew, sheetPoint],
    [tack, stemHead],
    [tack, v(-0.1, floor + 0.16, z(-0.05))],
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
    lantern: [stemHead.x, stemHead.y + 0.16, stemHead.z - 0.06],
  };
}

// Pieces of one craft, merged per material. A painted mark keeps its UVs;
// everything else is position and normal only, so a hull can sit beside a tube.
const TEXTURED = new Set(['number', 'eye', 'mark']);
function pieceBin() {
  const pieces = {};
  const add = (material, geometry, x = 0, y = 0, z = 0) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    for (const name of Object.keys(piece.attributes)) {
      if (name !== 'position' && name !== 'normal' && !(TEXTURED.has(material) && name === 'uv')) {
        piece.deleteAttribute(name);
      }
    }
    if (!piece.attributes.normal) piece.computeVertexNormals();
    if (x || y || z) piece.translate(x, y, z);
    (pieces[material] ??= []).push(piece);
  };
  const geometries = () =>
    Object.fromEntries(Object.entries(pieces).map(([name, list]) => [name, mergeGeometries(list)]));
  return { add, geometries };
}

const METAL = new THREE.MeshStandardMaterial({ color: 0xb7c0c6, roughness: 0.34, metalness: 0.82 });
const GLASS = new THREE.MeshStandardMaterial({
  color: 0x9fc4d4,
  roughness: 0.08,
  metalness: 0.15,
  transparent: true,
  opacity: 0.42,
  side: THREE.DoubleSide,
});

// Three blades and a hub. The axis lies along Z and the disc is centred.
function propeller(radius) {
  const pieces = [new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, radius * 0.42, 8).rotateX(Math.PI / 2)];
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.BoxGeometry(radius * 0.9, radius * 0.28, radius * 0.07);
    blade.translate(radius * 0.42, 0, 0);
    // Pitch around the span, then fan the blades, so the side view is not an edge.
    blade.rotateX(0.7);
    blade.rotateZ((i / 3) * Math.PI * 2);
    pieces.push(blade);
  }
  return mergeGeometries(pieces.map((piece) => (piece.index ? piece.toNonIndexed() : piece)));
}

// A tube each side. `at(t)` is the starboard point for t from -1 to 1,
// returned new each call; the port tube mirrors it.
function sideTubes(at, radius, from = -0.96, to = 0.9) {
  return [-1, 1].map((side) => {
    const points = [];
    for (let i = 0; i <= 16; i++) {
      const point = at(from + ((to - from) * i) / 16);
      points.push(new THREE.Vector3(side * point.x, point.y, point.z));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 5);
  });
}

// Closes the open stern of a parametric hull. Set a little aft of the last
// station so the cap does not fight the shell for the same pixels.
function transomCap(type) {
  const positions = [];
  const indices = [];
  const z = stationZ(type, -1);
  positions.push(0, (type.sheer(-1) + type.keel(-1)) / 2, z);
  const segments = 10;
  for (let j = 0; j <= segments; j++) {
    const a = (j / segments) * 2 - 1;
    positions.push(
      type.halfBeam(-1) * Math.sign(a) * Math.abs(a) ** type.flare,
      type.keel(-1) + (type.sheer(-1) - type.keel(-1)) * Math.abs(a) ** type.turn,
      z,
    );
  }
  for (let j = 0; j < segments; j++) indices.push(0, j + 1, j + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.translate(0, 0, -0.012);
  return geometry;
}

// A skin through closed cross-sections, stern to bow. Every ring has the same
// number of [x, y] points, anticlockwise seen from the bow. `hard` keeps a
// crease along each edge of the ring, for slab sides and chines; without it
// the skin is round, for pods and cowls.
function loft(rings, hard = false) {
  const count = rings[0].points.length;
  const columns = hard ? count * 2 : count;
  const positions = [];
  const indices = [];
  for (const ring of rings) {
    for (let j = 0; j < count; j++) {
      positions.push(ring.points[j][0], ring.points[j][1], ring.z);
      if (hard) {
        const next = ring.points[(j + 1) % count];
        positions.push(next[0], next[1], ring.z);
      }
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < count; j++) {
      const a = i * columns + (hard ? j * 2 : j);
      const b = i * columns + (hard ? j * 2 + 1 : (j + 1) % count);
      indices.push(a, b, b + columns, a, b + columns, a + columns);
    }
  }
  // Flat caps on vertices of their own, so the ends stay crisp.
  for (const [ring, astern] of [[rings[0], true], [rings.at(-1), false]]) {
    const base = positions.length / 3;
    let cx = 0;
    let cy = 0;
    for (const [x, y] of ring.points) {
      positions.push(x, y, ring.z);
      cx += x;
      cy += y;
    }
    positions.push(cx / count, cy / count, ring.z);
    for (let j = 0; j < count; j++) {
      const a = base + j;
      const b = base + ((j + 1) % count);
      indices.push(base + count, astern ? b : a, astern ? a : b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Rings for a loft: `ring(t)` is called from the stern (t = 0) to the bow.
const stations = (z0, z1, count, ring) =>
  Array.from({ length: count + 1 }, (_, i) => ({ z: z0 + ((z1 - z0) * i) / count, points: ring(i / count) }));

const boxRing = (cx, y0, y1, half, bevel) => {
  const b = Math.min(bevel, half * 0.4, (y1 - y0) * 0.4);
  return [
    [cx - half + b, y0],
    [cx + half - b, y0],
    [cx + half, y0 + b],
    [cx + half, y1 - b],
    [cx + half - b, y1],
    [cx - half + b, y1],
    [cx - half, y1 - b],
    [cx - half, y0 + b],
  ];
};

const ovalRing = (cx, cy, rx, ry, count = 12) =>
  Array.from({ length: count }, (_, j) => {
    const a = (j / count) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });

// A plate cut to an outline: upright, drawn as [z, y] and as thick as given
// across the boat, or lying flat, drawn as [x, z].
function plate(outline, thick, flat = false) {
  const shape = new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geometry.translate(0, 0, -thick / 2);
  return flat ? geometry.rotateX(Math.PI / 2) : geometry.rotateY(-Math.PI / 2);
}

// The bubble over a racing cockpit, and the driver under it: these boats
// are driven from inside, strapped in, not from a thwart in a straw hat.
const CANOPY = new THREE.MeshStandardMaterial({
  color: 0x1d2b36,
  roughness: 0.06,
  metalness: 0.35,
  transparent: true,
  opacity: 0.66,
});
const canopy = (rx, ry, rz) =>
  new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2).scale(rx, ry, rz);
function addPilot(add, x, seat, z) {
  add('shirt', new THREE.CapsuleGeometry(0.15, 0.12, 4, 8), x, seat + 0.2, z);
  add('helmet', new THREE.SphereGeometry(0.125, 12, 10), x, seat + 0.5, z);
  add('saddle', new THREE.BoxGeometry(0.19, 0.06, 0.06), x, seat + 0.5, z + 0.1); // visor
}

// A roundel with a racing number, painted once and shared by both sponsons.
function createNumberTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f4efe2';
  context.beginPath();
  context.arc(64, 64, 58, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#1a2744';
  context.lineWidth = 8;
  context.stroke();
  context.fillStyle = '#1a2744';
  context.font = '700 84px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('7', 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const NUMBER = createNumberTexture();

// The jet ski: a flat chined hull, footwells and a saddle, and the same
// boatman astride it in his straw hat. The plume astern grows with the speed.
const JETSKI_HULL = {
  length: 3.35,
  halfBeam: (t) => {
    // Full beam under the rider, a fine entry, a broad stern.
    const entry = t > 0 ? (1 - t ** 1.55) ** 0.55 : 1;
    const stern = t < -0.55 ? 1 - 0.08 * ((-t - 0.55) / 0.45) ** 2 : 1;
    return 0.58 * entry * stern;
  },
  sheer: (t) => 0.34 + 0.46 * Math.max(t - 0.12, 0) ** 1.45,
  keel: (t) => -0.22 + 0.4 * Math.max(t, 0) ** 2,
  flare: 0.36,
  turn: 3.4,
};

function createJetSki() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const { add, geometries } = pieceBin();
  const hull = JETSKI_HULL;
  const z = (t) => stationZ(hull, t);
  const deck = createLidGeometry(hull);
  deck.computeVertexNormals();
  add('deck', deck);
  add('shell', createHullGeometry(hull));
  add('shell', transomCap(hull));
  // Gunwale and the red boot stripe, just proud of the topsides.
  for (const tube of sideTubes((t) => v(hull.halfBeam(t), hull.sheer(t) + 0.02, z(t)), 0.026)) add('saddle', tube);
  for (const tube of sideTubes(
    (t) => v(hull.halfBeam(t) * 1.02, hull.keel(t) + (hull.sheer(t) - hull.keel(t)) * 0.58, z(t)),
    0.03,
    -0.9,
    0.72,
  )) {
    add('accent', tube);
  }
  // Footwells either side of the saddle, floored below the side decks.
  for (const side of [-1, 1]) {
    add('shell', new THREE.BoxGeometry(0.16, 0.07, 1.05), side * 0.46, 0.4, -0.05);
    add('saddle', new THREE.BoxGeometry(0.26, 0.035, 0.78), side * 0.3, 0.355, 0.02);
  }
  add('saddle', new THREE.BoxGeometry(0.3, 0.1, 0.78), 0, 0.48, -0.28);
  add('saddle', new THREE.SphereGeometry(0.15, 10, 8).scale(1, 0.7, 1.15), 0, 0.5, 0.12);
  add('saddle', new THREE.SphereGeometry(0.16, 10, 8).scale(1.05, 0.85, 0.7), 0, 0.52, -0.62);
  add('saddle', new THREE.BoxGeometry(0.72, 0.045, 0.4), 0, 0.37, z(-0.72)); // boarding pad
  for (let i = 0; i < 3; i++) add('shell', new THREE.BoxGeometry(0.5, 0.012, 0.025), 0, 0.4, z(-0.72) + 0.1 - i * 0.08);
  // A low foredeck blister, sunk so only the dome shows, then the bars.
  add('accent', new THREE.SphereGeometry(1, 12, 8).scale(0.34, 0.08, 0.4), 0, 0.36, 0.86);
  add('saddle', spar(v(0, 0.48, 0.28), v(0, 0.84, 0.16), 0.038));
  add('metal', new THREE.CylinderGeometry(0.026, 0.026, 0.62, 8).rotateZ(Math.PI / 2), 0, 0.86, 0.16);
  for (const side of [-1, 1]) {
    add('saddle', new THREE.CylinderGeometry(0.034, 0.034, 0.14, 8).rotateZ(Math.PI / 2), side * 0.34, 0.86, 0.16);
  }
  add('saddle', new THREE.CylinderGeometry(0.055, 0.055, 0.02, 10).rotateX(1.15), 0, 0.66, 0.26);
  add('shell', new THREE.CylinderGeometry(0.04, 0.04, 0.012, 10).rotateX(1.15), 0, 0.67, 0.28);
  add('glass', new THREE.BoxGeometry(0.32, 0.12, 0.016).rotateX(-0.7), 0, 0.72, 0.36);
  // Grab rail, jet nozzle and the intake grate under the flat bottom.
  add('metal', spar(v(-0.16, 0.52, -0.62), v(-0.16, 0.74, -0.74), 0.016));
  add('metal', spar(v(0.16, 0.52, -0.62), v(0.16, 0.74, -0.74), 0.016));
  add('metal', spar(v(-0.16, 0.74, -0.74), v(0.16, 0.74, -0.74), 0.016));
  add('saddle', new THREE.CylinderGeometry(0.07, 0.1, 0.2, 12).rotateX(Math.PI / 2), 0, 0.02, z(-1) - 0.06);
  add('metal', new THREE.TorusGeometry(0.062, 0.012, 6, 14).rotateY(Math.PI / 2), 0, 0.02, z(-1) - 0.16);
  add('saddle', new THREE.BoxGeometry(0.26, 0.02, 0.32), 0, -0.04, z(-1) + 0.02);
  for (let i = 0; i < 4; i++) add('metal', new THREE.BoxGeometry(0.2, 0.012, 0.02), 0, hull.keel(0) - 0.01, -0.12 + i * 0.055);
  // The boatman, astride the saddle and leaned forward onto the bars.
  const seat = -0.3;
  for (const side of [-1, 1]) {
    add('breeches', spar(v(side * 0.14, 0.68, seat + 0.05), v(side * 0.3, 0.4, 0.08), 0.072));
    add('shirt', spar(v(side * 0.16, 1.1, seat + 0.08), v(side * 0.28, 0.9, 0.14), 0.046));
  }
  add('breeches', new THREE.BoxGeometry(0.34, 0.14, 0.3), 0, 0.66, seat);
  add('shirt', new THREE.CapsuleGeometry(0.17, 0.28, 4, 8).rotateX(0.4), 0, 1.0, seat + 0.08);
  add('skin', new THREE.SphereGeometry(0.13, 12, 10), 0, 1.38, seat + 0.18);
  add('straw', new THREE.CylinderGeometry(0.28, 0.28, 0.022, 14), 0, 1.48, seat + 0.18);
  add('straw', new THREE.CylinderGeometry(0.11, 0.14, 0.12, 12), 0, 1.55, seat + 0.18);

  const shell = paint(0xf1efe8, 0.35);
  shell.side = THREE.DoubleSide;
  const deckMat = paint(0x2a3136, 0.95);
  deckMat.side = THREE.DoubleSide;
  return {
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      shell,
      accent: paint(0xc4372c, 0.4),
      saddle: paint(0x24211e, 0.8),
      deck: deckMat,
      metal: METAL,
      glass: GLASS,
    },
    spray: { at: [0, 0.08, z(-1) - 0.28], width: 0.85 },
    lantern: [0, hull.sheer(0.97) + 0.05, z(0.97)],
    lid: createLidGeometry(hull),
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
  const { add, geometries } = pieceBin();
  const z = (t) => stationZ(LAUNCH, t);
  const stern = z(-1);
  add('shell', createHullGeometry(LAUNCH));
  add('shell', new THREE.BoxGeometry(LAUNCH.halfBeam(-1) * 2, 0.8, 0.06), 0, 0.17, stern);
  add('saddle', createSoleGeometry(LAUNCH));
  // Caprail along the gunwale, and a dark rub rail lower on the topsides.
  for (const tube of sideTubes((t) => v(LAUNCH.halfBeam(t), LAUNCH.sheer(t) + 0.03, z(t)), 0.035, -0.98, 0.96)) {
    add('accent', tube);
  }
  for (const tube of sideTubes(
    (t) => v(LAUNCH.halfBeam(t) * 0.97, LAUNCH.keel(t) + (LAUNCH.sheer(t) - LAUNCH.keel(t)) * 0.42, z(t)),
    0.028,
    -0.92,
    0.78,
  )) {
    add('saddle', tube);
  }
  // Foredeck: the outline of the hull forward of the screen, laid on the sheer.
  const deck = new THREE.Shape();
  const steps = 10;
  const edge = (i) => {
    const t = 0.12 + (0.88 * i) / steps;
    return [LAUNCH.halfBeam(t), z(t)];
  };
  for (let i = 0; i <= steps; i++) deck[i ? 'lineTo' : 'moveTo'](...edge(i));
  for (let i = steps; i >= 0; i--) deck.lineTo(-edge(i)[0], edge(i)[1]);
  add('accent', new THREE.ShapeGeometry(deck).rotateX(Math.PI / 2), 0, LAUNCH.sheer(0.4) + 0.02, 0);
  add('metal', new THREE.CylinderGeometry(0.055, 0.055, 0.02, 10), 0.42, LAUNCH.sheer(0.55) + 0.04, z(0.55));
  // Bow rail and a cleat, kept aft of the lantern on the stem.
  const railFoot = 0.42;
  const railHead = 0.72;
  add('metal', spar(v(-0.42, LAUNCH.sheer(railFoot) + 0.03, z(railFoot)), v(-0.1, LAUNCH.sheer(railHead) + 0.16, z(railHead)), 0.016));
  add('metal', spar(v(0.42, LAUNCH.sheer(railFoot) + 0.03, z(railFoot)), v(0.1, LAUNCH.sheer(railHead) + 0.16, z(railHead)), 0.016));
  add('metal', spar(v(-0.1, LAUNCH.sheer(railHead) + 0.16, z(railHead)), v(0.1, LAUNCH.sheer(railHead) + 0.16, z(railHead)), 0.014));
  add('metal', new THREE.BoxGeometry(0.16, 0.028, 0.04), 0, LAUNCH.sheer(0.7) + 0.05, z(0.7));
  add('metal', new THREE.BoxGeometry(0.03, 0.04, 0.04), 0, LAUNCH.sheer(0.7) + 0.02, z(0.7));
  // Screen and its frame, the helm, the seats.
  const screenY = LAUNCH.sheer(0.12) + 0.2;
  const screenZ = z(0.1);
  add('glass', new THREE.BoxGeometry(1.7, 0.42, 0.03).rotateX(-0.55), 0, screenY, screenZ);
  add('metal', spar(v(-0.84, screenY - 0.16, screenZ + 0.08), v(-0.84, screenY + 0.2, screenZ - 0.1), 0.014));
  add('metal', spar(v(0.84, screenY - 0.16, screenZ + 0.08), v(0.84, screenY + 0.2, screenZ - 0.1), 0.014));
  add('metal', spar(v(-0.84, screenY + 0.2, screenZ - 0.1), v(0.84, screenY + 0.2, screenZ - 0.1), 0.014));
  for (const side of [-1, 1]) {
    add('glass', new THREE.BoxGeometry(0.26, 0.3, 0.018).rotateY(side * 0.45).rotateX(-0.4), side * 0.98, screenY - 0.02, screenZ);
  }
  add('port', new THREE.SphereGeometry(0.045, 8, 6), 0.92, screenY + 0.16, screenZ - 0.06);
  add('starboard', new THREE.SphereGeometry(0.045, 8, 6), -0.92, screenY + 0.16, screenZ - 0.06);
  add('accent', new THREE.BoxGeometry(0.4, 0.34, 0.3), -0.42, 0.5, z(0.04));
  add('saddle', new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(0.95), -0.42, 0.66, z(0.16));
  add('shell', new THREE.CylinderGeometry(0.036, 0.036, 0.012, 12).rotateX(0.95), -0.42, 0.67, z(0.175));
  add('saddle', spar(v(-0.2, 0.6, z(0.02)), v(-0.16, 0.78, z(0.08)), 0.012));
  add('saddle', new THREE.TorusGeometry(0.17, 0.025, 6, 14).rotateX(-0.5), -0.4, 0.78, z(0.02));
  for (const side of [-1, 1]) {
    add('accent', new THREE.BoxGeometry(0.62, 0.14, 0.6), side * 0.4, 0.36, z(-0.22));
    add('accent', new THREE.BoxGeometry(0.62, 0.5, 0.12), side * 0.4, 0.55, z(-0.33));
    // Side rails from the seat backs to the quarters.
    add('metal', spar(v(side * 0.92, 0.42, z(-0.32)), v(side * 0.92, 0.58, z(-0.5)), 0.015));
    add('metal', spar(v(side * 0.92, 0.58, z(-0.5)), v(side * 0.92, 0.58, z(-0.92)), 0.015));
    add('metal', spar(v(side * 0.92, 0.58, z(-0.92)), v(side * 0.92, 0.4, stern + 0.12), 0.015));
  }
  add('accent', new THREE.BoxGeometry(1.5, 0.14, 0.5), 0, 0.36, z(-0.78));
  add('accent', new THREE.BoxGeometry(1.35, 0.3, 0.07), 0, 0.56, z(-0.78) - 0.22);
  // Outboard: cowl, shaft, lower unit, skeg and propeller, plus a bathing platform.
  const oz = stern - 0.16;
  add('saddle', new THREE.BoxGeometry(0.36, 0.4, 0.48), 0, 0.74, oz);
  add('shell', new THREE.BoxGeometry(0.34, 0.08, 0.44), 0, 0.96, oz);
  add('saddle', new THREE.BoxGeometry(0.14, 0.78, 0.16), 0, 0.22, oz);
  add('saddle', new THREE.BoxGeometry(0.16, 0.22, 0.46), 0, -0.16, oz - 0.02);
  add('metal', new THREE.BoxGeometry(0.32, 0.02, 0.2), 0, -0.02, oz);
  add('saddle', new THREE.BoxGeometry(0.04, 0.3, 0.22), 0, -0.38, oz + 0.02);
  add('metal', propeller(0.24), 0, -0.16, oz - 0.3);
  // Pads tucked against the transom, split so the shaft can pass between them.
  for (const side of [-1, 1]) {
    add('accent', new THREE.BoxGeometry(0.42, 0.05, 0.5), side * 0.46, 0.18, stern - 0.14);
  }
  for (const side of [-1, 1]) {
    add('metal', new THREE.BoxGeometry(0.14, 0.025, 0.035), side * 0.55, 0.48, stern + 0.02);
  }
  // The boatman at the wheel, on the port seat.
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
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      shell,
      accent: paint(0x7a3b1e, 0.45),
      saddle: paint(0x24211e, 0.8),
      glass: GLASS,
      metal: METAL,
      port: new THREE.MeshStandardMaterial({ color: 0xc4372c, emissive: 0x8a241c, emissiveIntensity: 0.6, roughness: 0.4 }),
      starboard: new THREE.MeshStandardMaterial({ color: 0x2f8f4e, emissive: 0x1c6b34, emissiveIntensity: 0.55, roughness: 0.4 }),
    },
    spray: { at: [0, 0.05, oz - 0.35], width: 1.5 },
    lantern: [0, LAUNCH.sheer(1) + 0.3, z(1) - 0.1],
    lid: createLidGeometry(LAUNCH),
  };
}

// The racing hydroplane, as the unlimited class builds them: a wing of a hull
// on two long sponsons with open water between their tips, the driver under
// a canopy in a pod on the centreline, the turbine's scoop behind him and a
// wing on twin fins at the stern. Proportions from photographs of Miss
// Budweiser; not measured.
function createHydroplane() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const { add, geometries } = pieceBin();
  const ease = THREE.MathUtils.smoothstep;
  // The hull: full width amidships, drawing in to the transom.
  add(
    'shell',
    loft(
      stations(-3.4, 1.9, 8, (t) =>
        boxRing(0, 0.16 + 0.1 * t, 0.5 + 0.05 * Math.sin(t * Math.PI), 1.3 + 0.42 * ease(t, 0, 0.55), 0.05),
      ),
      true,
    ),
  );
  for (const side of [-1, 1]) {
    // Sponsons, running out past the hull to the two prongs of the bow.
    add(
      'shell',
      loft(
        stations(-0.1, 3.7, 10, (t) =>
          boxRing(side * 1.3, -0.04 + 0.42 * t * t, 0.52 - 0.06 * t, 0.46 * (1 - ease(t, 0.45, 1) * 0.8), 0.04),
        ),
        true,
      ),
    );
    add('accent', new THREE.BoxGeometry(0.62, 0.03, 2.0).rotateX(0.016), side * 1.3, 0.51, 1.1);
    add('saddle', new THREE.BoxGeometry(0.5, 0.04, 1.4), side * 1.3, -0.03, 0.6); // riding pad
    add('accent', new THREE.BoxGeometry(0.5, 0.03, 3), side * 0.98, 0.55, -1.2);
    // Fins, with the number on the outside of each.
    add(
      'accent',
      plate(
        [
          [-3.35, 0.5],
          [-2.3, 0.5],
          [-2.75, 1.8],
          [-3.45, 1.8],
        ],
        0.07,
      ),
      side * 1.0,
      0,
      0,
    );
    const badge = new THREE.PlaneGeometry(0.62, 0.62);
    badge.rotateY((side * Math.PI) / 2);
    add('number', badge, side * 1.045, 1.18, -2.95);
  }
  add('shell', new THREE.BoxGeometry(2.07, 0.07, 0.68), 0, 1.8, -3.1); // the wing
  add('shell', new THREE.BoxGeometry(2.12, 0.045, 0.36), 0, 0.44, 2.75); // and the one between the prongs
  // The pod: nose, cockpit and the engine cowl in one body.
  const swell = (t) => (4 * t * (1 - t)) ** 0.45;
  add(
    'shell',
    loft(
      stations(-2.9, 2.5, 14, (t) => {
        const top = 0.5 + 0.55 * swell(t);
        return ovalRing(0, (0.4 + top) / 2, 0.08 + 0.42 * swell(t), (top - 0.4) / 2);
      }),
    ),
  );
  add('canopy', canopy(0.3, 0.3, 0.72), 0, 0.9, 1.0);
  addPilot(add, 0, 0.55, 0.95);
  // The scoop that feeds the turbine, and where it lets go.
  add(
    'accent',
    loft(
      stations(-1.5, 0.25, 5, (t) => boxRing(0, 0.9 + 0.08 * t, 1.0 + 0.38 * ease(t, 0, 0.8), 0.2 + 0.1 * t, 0.04)),
      true,
    ),
  );
  add('saddle', new THREE.BoxGeometry(0.5, 0.28, 0.02), 0, 1.19, 0.256);
  add('metal', new THREE.CylinderGeometry(0.15, 0.17, 0.5, 12).rotateX(Math.PI / 2 - 0.3), 0, 0.82, -2.7);
  add('saddle', new THREE.CircleGeometry(0.13, 12).rotateY(Math.PI).rotateX(-0.3), 0, 0.9, -2.945);
  // Surface drive: a strut, a propeller big enough to read from astern, and the rudder.
  add('metal', spar(v(0.3, 0.22, -3.3), v(0.3, -0.04, -3.75), 0.04));
  add('metal', propeller(0.34), 0.3, -0.06, -3.92);
  add('saddle', new THREE.BoxGeometry(0.05, 0.62, 0.32), -0.3, -0.02, -3.6);
  add('metal', new THREE.BoxGeometry(0.08, 0.08, 0.26), -0.3, 0.26, -3.45);
  add('saddle', new THREE.BoxGeometry(0.02, 0.3, 0.34), -0.88, -0.1, 0.4); // skid fin

  const number = new THREE.MeshStandardMaterial({
    map: NUMBER,
    roughness: 0.55,
    alphaTest: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  return {
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      shell: paint(0xf3f0e6, 0.3),
      accent: paint(0xd2a316, 0.35),
      saddle: paint(0x24211e, 0.8),
      helmet: paint(0xd2a316, 0.3),
      metal: METAL,
      canopy: CANOPY,
      number,
    },
    spray: { at: [0.15, 0.12, -3.95], width: 2.1 },
    lantern: [0, 0.72, 2.4],
  };
}

// The same straw-hatted boatman, feet at y. Arms are added by the caller.
function addCrew(add, x, y, z) {
  add('breeches', new THREE.BoxGeometry(0.32, 0.16, 0.26), x, y + 0.26, z);
  add('shirt', new THREE.CapsuleGeometry(0.16, 0.28, 4, 8), x, y + 0.58, z);
  add('skin', new THREE.SphereGeometry(0.13, 12, 10), x, y + 0.92, z);
  add('straw', new THREE.CylinderGeometry(0.28, 0.28, 0.022, 14), x, y + 1.02, z);
  add('straw', new THREE.CylinderGeometry(0.11, 0.14, 0.12, 12), x, y + 1.09, z);
}

// Long, narrow and black, with the iron comb on the bow and one oar. No sail,
// so nothing has to come down for a bridge.
const GONDOLA_HULL = {
  length: 11,
  halfBeam: (t) => 0.68 * (1 - Math.abs(t) ** 1.7) ** 0.72,
  sheer: (t) => 0.26 + 0.7 * Math.abs(t) ** 2.2,
  keel: (t) => -0.2 + 0.28 * t * t,
  flare: 0.5,
  turn: 2.3,
};

function createGondola() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const { add, geometries } = pieceBin();
  const hull = GONDOLA_HULL;
  const z = (t) => stationZ(hull, t);
  add('shell', createHullGeometry(hull));
  for (const tube of sideTubes((t) => v(hull.halfBeam(t), hull.sheer(t) + 0.02, z(t)), 0.02, -0.92, 0.9)) {
    add('metal', tube);
  }
  add('deck', new THREE.BoxGeometry(0.55, 0.04, 6.2), 0, 0.1, -0.3);
  // Two armchairs and the little stool the gondolier stands on.
  for (const seat of [-1.15, 0.55]) {
    add('accent', new THREE.BoxGeometry(0.46, 0.08, 0.48), 0, 0.2, seat);
    add('accent', new THREE.BoxGeometry(0.46, 0.32, 0.06), 0, 0.38, seat - 0.21);
  }
  const stand = -3.5;
  add('deck', new THREE.BoxGeometry(0.5, 0.06, 0.7), 0, hull.sheer(-0.64) - 0.08, stand);
  // Ferro: a spine and six teeth that rise forward, plus the hooked crest.
  // Flat rungs on a post read as a ladder from the side.
  const bowY = hull.sheer(1);
  const bowZ = z(1);
  add('metal', new THREE.BoxGeometry(0.028, 1.15, 0.03), 0, bowY + 0.48, bowZ - 0.02);
  for (let i = 0; i < 6; i++) {
    // Root on the spine, then raked up toward the bow. A shallow rake still
    // reads as the rungs of a ladder from the side.
    const tooth = new THREE.BoxGeometry(0.02, 0.045, 0.32 - i * 0.028);
    tooth.translate(0, 0, (0.32 - i * 0.028) / 2);
    tooth.rotateX(-0.78 - i * 0.05);
    add('metal', tooth, 0, bowY + 0.16 + i * 0.13, bowZ - 0.02);
  }
  add('metal', new THREE.BoxGeometry(0.02, 0.42, 0.06).rotateX(0.7), 0, bowY + 1.08, bowZ + 0.08);
  add('metal', new THREE.BoxGeometry(0.02, 0.22, 0.05).rotateX(-0.9), 0, bowY + 1.28, bowZ + 0.16);
  // The oar trails on the starboard side. He rows standing, facing the bow.
  const grip = v(-0.42, hull.sheer(-0.64) + 1.05, stand + 0.15);
  const blade = v(-1.05, -0.05, stand - 1.7);
  // The oar is a piece of its own, hung from the grip, so that it can row.
  const oar = pieceBin();
  oar.add('deck', spar(grip, blade, 0.035), -grip.x, -grip.y, -grip.z);
  oar.add('deck', new THREE.BoxGeometry(0.22, 0.025, 0.55), blade.x - grip.x, blade.y - grip.y, blade.z - 0.15 - grip.z);
  add('trim', new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), -hull.halfBeam(-0.35) + 0.02, hull.sheer(-0.35) + 0.08, z(-0.35));
  addCrew(add, 0, hull.sheer(-0.64) - 0.02, stand);
  add('shirt', spar(v(-0.16, hull.sheer(-0.64) + 0.85, stand + 0.05), grip, 0.045));
  add('shirt', spar(v(0.16, hull.sheer(-0.64) + 0.85, stand + 0.05), v(-0.05, hull.sheer(-0.64) + 0.95, stand + 0.35), 0.045));

  const shell = paint(0x161410, 0.55);
  shell.side = THREE.DoubleSide;
  return {
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      shell,
      accent: paint(0x7c2430, 0.6),
      metal: METAL,
      trim: paint(0x4a2f1c, 0.7),
    },
    lantern: [0, bowY + 0.35, bowZ - 0.35],
    lid: createLidGeometry(hull),
    oar: { grip: grip.toArray(), geometries: oar.geometries() },
  };
}

function createEyeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 64, 64);
  context.fillStyle = '#f3efe4';
  context.beginPath();
  context.ellipse(32, 32, 28, 17, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#2a1a14';
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = '#1a120e';
  context.beginPath();
  context.arc(38, 32, 8, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f3efe4';
  context.beginPath();
  context.arc(40, 29, 2.4, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A battened lugsail in rig space, sheeted out to port so it reads from astern.
function junkRig() {
  const luff = (t) => new THREE.Vector3(0.12, 0.5 + 4.4 * t, 0.25 + 0.5 * t);
  const leech = (t) => new THREE.Vector3(2.15 - 0.4 * t, 0.6 + 3.85 * t, -1.65 + 1.15 * t);
  const rows = 5;
  const cols = 4;
  const tack = luff(0);
  const head = luff(1);
  const clew = leech(0);
  const along = head.clone().sub(tack).normalize();
  const toClew = clew.clone().sub(tack);
  const across = toClew.clone().sub(along.clone().multiplyScalar(toClew.dot(along))).normalize();
  const normal = along.clone().cross(across);
  if (normal.x < 0) normal.negate();
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    // Zero on each batten, fullest between them, and zero on luff and leech.
    const panel = Math.sin(Math.PI * (t * rows - Math.floor(t * rows + 1e-6)));
    for (let j = 0; j <= cols; j++) {
      const u = j / cols;
      const point = luff(t).lerp(leech(t), u);
      point.addScaledVector(normal, 4 * u * (1 - u) * panel * 0.38);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, t);
    }
    if (i < rows) {
      const row = i * (cols + 1);
      const next = row + cols + 1;
      for (let j = 0; j < cols; j++) {
        indices.push(row + j, next + j, row + j + 1, next + j, next + j + 1, row + j + 1);
      }
    }
  }
  const sail = new THREE.BufferGeometry();
  sail.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  sail.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  sail.setIndex(indices);
  sail.computeVertexNormals();
  const battens = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const piece = spar(luff(t), leech(t), i === 0 || i === rows ? 0.045 : 0.026);
    piece.translate(normal.x * 0.02, normal.y * 0.02, normal.z * 0.02);
    battens.push(piece);
  }
  const lines = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [head.x, head.y, head.z, 0.1, 5.35, 0.55, clew.x, clew.y, clew.z, 0.4, 0.4, -3.4, tack.x, tack.y, tack.z, 0.15, 0.25, 1.5],
      3,
    ),
  );
  return {
    sail,
    battens,
    lines,
    mast: spar(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 5.45, 0.5), 0.08),
  };
}

// Flat-bottomed, high in the stern, one battened sail and an eye on each bow.
const JUNK_HULL = {
  length: 9.4,
  halfBeam: (t) => 1.4 * (1 - Math.abs(t) ** (t > 0 ? 2.2 : 3.4)) ** 0.72,
  sheer: (t) => 0.5 + 0.12 * t * t + (t < 0 ? 0.7 * (-t) ** 2.2 : 0.22 * t ** 2),
  keel: (t) => -0.28 + 0.34 * Math.abs(t) ** 2.6,
  flare: 0.42,
  turn: 4.5,
};

function createJunk() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const { add, geometries } = pieceBin();
  const hull = JUNK_HULL;
  const z = (t) => stationZ(hull, t);
  add('shell', createHullGeometry(hull));
  add('shell', transomCap(hull));
  for (const tube of sideTubes(
    (t) => v(hull.halfBeam(t) * 0.98 + 0.04, hull.keel(t) + (hull.sheer(t) - hull.keel(t)) * 0.72, z(t)),
    0.035,
    -0.88,
    0.82,
  )) {
    add('accent', tube);
  }
  // Poop: a cabin under a flat roof. The red board is the transom, and the
  // rudder hangs just aft of it instead of standing clear like a sign.
  const poopZ = z(-0.58);
  const poopY = hull.sheer(-0.58);
  const sternZ = z(-1);
  const sternMid = (hull.sheer(-1) + hull.keel(-1)) / 2;
  const sternH = (hull.sheer(-1) - hull.keel(-1)) * 0.9;
  add('deck', new THREE.BoxGeometry(1.5, 0.08, 1.7), 0, poopY + 0.02, poopZ);
  add('shell', new THREE.BoxGeometry(1.15, 0.55, 0.95), 0, poopY + 0.34, poopZ + 0.22);
  add('accent', new THREE.SphereGeometry(1, 10, 8).scale(0.68, 0.12, 0.5), 0, poopY + 0.64, poopZ + 0.22);
  add('trim', new THREE.BoxGeometry(0.09, sternH + 0.12, 0.08), 0, sternMid, sternZ);
  add('accent', new THREE.BoxGeometry(hull.halfBeam(-1) * 1.5, sternH, 0.05), 0, sternMid, sternZ - 0.05);
  add('trim', rudderBlade(sternH * 0.95, 0.5), 0, hull.sheer(-1) - 0.08, sternZ - 0.1);
  const eyeT = 0.72;
  const eyeY = hull.keel(eyeT) + (hull.sheer(eyeT) - hull.keel(eyeT)) * 0.68;
  for (const side of [-1, 1]) {
    const eye = new THREE.PlaneGeometry(0.7, 0.44);
    eye.rotateY(side * Math.PI / 2);
    add('eye', eye, side * (hull.halfBeam(eyeT) + 0.05), eyeY, z(eyeT));
  }
  const deckTop = poopY + 0.06;
  const manZ = poopZ - 0.62;
  addCrew(add, 0, deckTop, manZ);
  add('shirt', spar(v(-0.16, deckTop + 0.72, manZ + 0.05), v(-0.32, deckTop + 0.5, manZ + 0.4), 0.042));
  add('shirt', spar(v(0.16, deckTop + 0.72, manZ + 0.05), v(0.08, deckTop + 0.82, manZ - 0.28), 0.042));
  const rig = junkRig();
  const shell = paint(0x241812, 0.6);
  shell.side = THREE.DoubleSide;
  const eye = new THREE.MeshStandardMaterial({
    map: createEyeTexture(),
    roughness: 0.6,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
  });
  return {
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      shell,
      accent: paint(0xa33b32, 0.55),
      trim: paint(0x3a2418, 0.75),
      eye,
      sail: new THREE.MeshStandardMaterial({
        map: TEXTURES.cloth,
        color: 0xc6a56c,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    },
    rig: { foot: [0, 0.42, 0.35], geometries: { trim: rig.mast }, sail: rig.sail, battens: rig.battens, lines: rig.lines },
    lantern: [0, hull.sheer(0.92) + 0.15, z(0.92)],
    lid: createLidGeometry(hull),
  };
}

function createMarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 80;
  const context = canvas.getContext('2d');
  context.fillStyle = '#e25b1a';
  context.fillRect(0, 0, 160, 80);
  context.fillStyle = '#f6f3ec';
  context.font = '700 58px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('8', 80, 44);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Eight times a sailing boat: an offshore racing catamaran. Two deep hulls
// with a tunnel between them, a low deck, the crew of two side by side under
// their own canopies and a scoop behind them. Proportions from photographs of
// the Class 1 boats; not measured. The 8 on the hulls is the only number.
function createOffshore() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const { add, geometries } = pieceBin();
  const ease = THREE.MathUtils.smoothstep;
  const stern = -4.4;
  for (const side of [-1, 1]) {
    // A hull: steep on the tunnel side, a chine outboard, and a bow that
    // lifts and fines away to a point.
    const rings = stations(stern, 4.4, 12, (t) => {
      const bow = ease(t, 0.6, 1);
      const out = 0.44 * (1 - bow * 0.9);
      const inn = 0.36 * (1 - bow * 0.9);
      const keel = -0.3 + 0.85 * bow ** 1.5;
      const deck = 0.72 + 0.05 * bow;
      const cx = 0.86 + 0.05 * bow;
      const ring = [
        [cx - inn, keel + (deck - keel) * 0.6],
        [cx, keel],
        [cx + out, keel + (deck - keel) * 0.45],
        [cx + out, deck],
        [cx - inn, deck],
      ];
      return side > 0 ? ring : ring.map(([x, y]) => [-x, y]).reverse();
    });
    add('shell', loft(rings, true));
    add('accent', new THREE.BoxGeometry(0.02, 0.07, 5.2), side * 1.305, 0.675, -1.7);
    const mark = new THREE.PlaneGeometry(0.9, 0.38);
    mark.rotateY((side * Math.PI) / 2);
    add('mark', mark, side * 1.305, 0.4, -0.6);
    // Surface drive astern of each hull.
    const x = side * 0.86;
    add('saddle', new THREE.BoxGeometry(0.22, 0.28, 0.4), x, 0.42, stern);
    add('metal', spar(v(x, 0.3, stern - 0.1), v(x, -0.05, stern - 0.55), 0.035));
    add('metal', propeller(0.22), x, -0.05, stern - 0.7);
    add('metal', new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10).rotateX(Math.PI / 2), side * 0.3, 0.62, stern - 0.08);
  }
  // The deck over the tunnel, thinning to a lip at the front.
  add(
    'deck',
    loft(
      stations(stern, 3.3, 8, (t) => boxRing(0, 0.42 + 0.28 * ease(t, 0.7, 1), 0.74, 0.9, 0.03)),
      true,
    ),
  );
  // The fairing that carries the cockpits and covers the engines.
  const swell = (t) => (4 * t * (1 - t)) ** 0.5;
  add('deck', loft(stations(-3.9, 2.4, 12, (t) => ovalRing(0, 0.78, 0.02 + 0.76 * swell(t), 0.34 * swell(t)))));
  for (const side of [-1, 1]) {
    add('canopy', canopy(0.27, 0.36, 0.8), side * 0.36, 1.0, -0.3);
    addPilot(add, side * 0.36, 0.68, -0.4);
  }
  add(
    'accent',
    loft(
      stations(-2.5, -1.1, 5, (t) => boxRing(0, 0.9, 1.0 + 0.42 * ease(t, 0, 0.8), 0.2 + 0.12 * t, 0.04)),
      true,
    ),
  );
  add('saddle', new THREE.BoxGeometry(0.56, 0.3, 0.02), 0, 1.24, -1.094);

  const mark = new THREE.MeshStandardMaterial({ map: createMarkTexture(), roughness: 0.5 });
  return {
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      shell: paint(0x143a8c, 0.32),
      accent: paint(0xe25b1a, 0.4),
      deck: paint(0xf4f1ea, 0.45),
      saddle: paint(0x1c2430, 0.6),
      helmet: paint(0xe25b1a, 0.3),
      canopy: CANOPY,
      metal: METAL,
      mark,
    },
    spray: { at: [0, 0.05, stern - 0.85], width: 2.3 },
    lantern: [0, 0.82, 3.15],
  };
}

// Six times a sailing boat: a party pontoon, two tubes and a deck, which is
// about the pace of the fastest recreational pontoon on record. Not that one
// in particular, and not measured.
function createPontoon() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const { add, geometries } = pieceBin();
  const tube = new THREE.CylinderGeometry(0.28, 0.28, 7.1, 12).rotateX(Math.PI / 2);
  const nose = new THREE.SphereGeometry(0.28, 10, 8).scale(1, 1, 0.85);
  for (const side of [-1, 1]) {
    add('tube', tube, side * 0.95, 0.06, -0.05);
    add('tube', nose, side * 0.95, 0.06, 3.55);
    add('tube', nose, side * 0.95, 0.06, -3.65);
  }
  add('deck', new THREE.BoxGeometry(2.2, 0.08, 5.9), 0, 0.4, 0.05);
  const rail = 1.02;
  const posts = [-2.6, -1.15, 0.35, 1.7, 2.75];
  for (const side of [-1, 1]) {
    for (const z of posts) add('metal', new THREE.CylinderGeometry(0.022, 0.022, 0.58, 6), side * 1.02, 0.74, z);
    add('metal', spar(v(side * 1.02, rail, posts[0]), v(side * 1.02, rail, posts.at(-1)), 0.018));
    add('metal', spar(v(side * 1.02, 0.68, posts[0]), v(side * 1.02, 0.68, posts.at(-1)), 0.014));
  }
  add('metal', spar(v(-1.02, rail, 2.75), v(1.02, rail, 2.75), 0.018));
  add('metal', spar(v(-1.02, rail, -2.6), v(1.02, rail, -2.6), 0.018));
  for (const z of [-1.35, 1.45]) {
    add('seat', new THREE.BoxGeometry(1.55, 0.1, 0.46), 0, 0.56, z);
    add('seat', new THREE.BoxGeometry(1.55, 0.32, 0.08), 0, 0.74, z - 0.19);
  }
  add('deck', new THREE.BoxGeometry(0.62, 0.55, 0.4), 0.42, 0.72, 0.2);
  add('saddle', new THREE.BoxGeometry(0.46, 0.26, 0.05).rotateX(-0.45), 0.42, 1.02, 0.38);
  add('metal', new THREE.TorusGeometry(0.13, 0.018, 6, 12).rotateX(-0.55), 0.42, 0.88, 0.32);
  add('shirt', new THREE.CapsuleGeometry(0.18, 0.28, 4, 8), 0.28, 1.02, -0.05);
  for (const side of [-1, 1]) add('shirt', spar(v(0.28 + side * 0.16, 1.12, -0.02), v(0.42 + side * 0.06, 0.9, 0.22), 0.05));
  add('skin', new THREE.SphereGeometry(0.13, 12, 10), 0.28, 1.38, -0.02);
  add('straw', new THREE.CylinderGeometry(0.28, 0.28, 0.022, 14), 0.28, 1.48, -0.02);
  add('straw', new THREE.CylinderGeometry(0.11, 0.14, 0.12, 12), 0.28, 1.55, -0.02);
  const roof = 1.78;
  for (const x of [-0.72, 0.72]) {
    for (const z of [-0.45, 0.85]) add('metal', spar(v(x, 0.5, z), v(x, roof, z), 0.018));
  }
  add('canvas', new THREE.BoxGeometry(1.62, 0.04, 1.5), 0, roof, 0.2);
  const oz = -3.25;
  for (const side of [-1, 1]) {
    add('saddle', new THREE.BoxGeometry(0.26, 0.3, 0.34), side * 0.42, 0.62, oz);
    add('shell', new THREE.BoxGeometry(0.24, 0.06, 0.3), side * 0.42, 0.78, oz);
    add('saddle', new THREE.BoxGeometry(0.1, 0.5, 0.12), side * 0.42, 0.22, oz);
    add('saddle', new THREE.BoxGeometry(0.12, 0.16, 0.3), side * 0.42, -0.06, oz - 0.02);
    add('metal', propeller(0.18), side * 0.42, -0.04, oz - 0.24);
  }

  return {
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      tube: paint(0xd5d8dc, 0.32),
      deck: paint(0xf4f0e6, 0.55),
      seat: paint(0xf7f4ee, 0.7),
      saddle: paint(0x2c2a28, 0.55),
      shell: paint(0xf2f2f0, 0.4),
      canvas: paint(0xe6d3a8, 0.85),
      metal: METAL,
    },
    spray: { at: [0, 0.02, oz - 0.45], width: 2.1 },
    lantern: [0, 1.15, 2.85],
  };
}

function createSpiritTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f4f1ea';
  context.fillRect(0, 0, 512, 64);
  context.fillStyle = '#c81e1e';
  context.font = '700 30px sans-serif';
  context.textBaseline = 'middle';
  context.fillText('317·60', 8, 34);
  context.fillStyle = '#16233f';
  context.font = '700 33px sans-serif';
  context.fillText('SPIRIT OF AUSTRALIA', 136, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Sixteen times a sailing boat: Ken Warby's Spirit of Australia, the wooden
// jet hydroplane that still holds the water record. A slab-sided dart with
// its name along the flanks, a delta of sponsons at the bow, the cockpit
// faired into the nose of the engine cowl, a tall fin with the tailplane on
// top, and a nozzle instead of a propeller. Proportions from photographs of
// the 8.2 m boat as it hangs in the Australian National Maritime Museum; not
// measured.
function createSpirit() {
  const { add, geometries } = pieceBin();
  const ease = THREE.MathUtils.smoothstep;
  // The hull: straight sides, then a long wedge of a bow.
  add(
    'shell',
    loft(
      stations(-3.6, 4.3, 12, (t) => {
        const bow = ease(t, 0.62, 1);
        return boxRing(0, 0.08 + 0.3 * bow, 0.62 - 0.12 * bow, 0.46 * (1 - bow) + 0.02, 0.03);
      }),
      true,
    ),
  );
  for (const side of [-1, 1]) {
    // The delta, and the shoe it planes on.
    add(
      'shell',
      plate(
        [
          [side * 0.12, 3.25],
          [side * 1.2, 1.0],
          [side * 1.2, 0.55],
          [side * 0.12, 0.55],
        ],
        0.2,
        true,
      ),
      0,
      0.2,
      0,
    );
    add('saddle', new THREE.BoxGeometry(0.3, 0.06, 1.1), side * 1.02, 0.07, 1.15);
    add('accent', new THREE.BoxGeometry(0.02, 0.04, 4.6), side * 0.485, 0.585, -1.25);
    const name = new THREE.PlaneGeometry(3.0, 0.375);
    name.rotateY((side * Math.PI) / 2);
    add('mark', name, side * 0.487, 0.34, -1.3);
    add('saddle', new THREE.SphereGeometry(1, 10, 8).scale(0.13, 0.2, 0.32), side * 0.3, 0.92, 0.22); // intakes
  }
  // The engine, in a cowl the length of the afterbody, and the cockpit
  // faired into its nose.
  add('shell', new THREE.CylinderGeometry(0.33, 0.33, 3.6, 18).rotateX(Math.PI / 2), 0, 0.86, -1.5);
  add(
    'shell',
    loft(
      stations(0.2, 2.35, 9, (t) => {
        const q = 1 - t;
        const top = 0.6 + 0.58 * q ** 0.7;
        return ovalRing(0, (0.5 + top) / 2, 0.02 + 0.33 * q ** 0.6, (top - 0.5) / 2);
      }),
    ),
  );
  add('canopy', canopy(0.22, 0.26, 0.55), 0, 0.9, 1.0);
  addPilot(add, 0, 0.52, 0.95);
  // Fin and tailplane.
  add(
    'shell',
    plate(
      [
        [-3.5, 1.1],
        [-2.2, 1.1],
        [-3.0, 2.3],
        [-3.65, 2.3],
      ],
      0.07,
    ),
  );
  add(
    'shell',
    plate(
      [
        [-0.8, -3.75],
        [0.8, -3.75],
        [0.8, -3.35],
        [0, -2.95],
        [-0.8, -3.35],
      ],
      0.05,
      true,
    ),
    0,
    2.3,
    0,
  );
  add('accent', new THREE.BoxGeometry(0.075, 0.22, 0.5), 0, 1.95, -3.22);
  const nozzleZ = -3.32;
  add('metal', new THREE.TorusGeometry(0.24, 0.045, 8, 16), 0, 0.86, nozzleZ);
  const glow = new THREE.CircleGeometry(0.2, 16);
  glow.rotateY(Math.PI);
  add('jet', glow, 0, 0.86, nozzleZ - 0.02);
  add('saddle', new THREE.BoxGeometry(0.5, 0.05, 1.2), 0, 0.06, -2.6); // the rear shoe
  add('saddle', new THREE.BoxGeometry(0.045, 0.42, 0.22), 0.2, 0, -3.3);

  return {
    geometries: geometries(),
    materials: {
      ...MATERIALS,
      shell: paint(0xf4f1ea, 0.38),
      accent: paint(0xc81e1e, 0.45),
      saddle: paint(0x1a1714, 0.8),
      helmet: paint(0xc81e1e, 0.3),
      metal: METAL,
      canopy: CANOPY,
      mark: new THREE.MeshStandardMaterial({ map: createSpiritTexture(), roughness: 0.38 }),
      jet: new THREE.MeshStandardMaterial({
        color: 0x3a1408,
        emissive: 0xff5a12,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      }),
    },
    spray: { at: [0, 0.1, nozzleZ - 0.6], width: 1.5 },
    lantern: [0, 0.5, 4.2],
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

function createCraftModel(typeName) {
  const craft = CRAFT[typeName];
  const parts = (builtParts[typeName] ??= craft.build());
  const model = new THREE.Group();
  for (const [name, geometry] of Object.entries(parts.geometries)) {
    const mesh = new THREE.Mesh(geometry, parts.materials[name]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    model.add(mesh);
    if (name === 'jet') model.userData.jet = mesh;
  }
  if (parts.rig) {
    const rig = new THREE.Group();
    rig.position.set(...parts.rig.foot);
    for (const [name, geometry] of Object.entries(parts.rig.geometries)) {
      const mesh = new THREE.Mesh(geometry, parts.materials[name]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rig.add(mesh);
    }
    const sail = new THREE.Mesh(parts.rig.sail, parts.materials.sail);
    sail.castShadow = true;
    for (const geometry of parts.rig.battens) {
      const batten = new THREE.Mesh(geometry, parts.materials.trim);
      batten.castShadow = true;
      sail.add(batten);
    }
    const lines = new THREE.LineSegments(parts.rig.lines, MATERIALS.rope);
    rig.add(sail, lines);
    model.add(rig);
    model.userData.rig = rig;
    model.userData.sail = sail;
    model.userData.lines = lines;
    model.userData.rigDown = 0;
  }
  if (parts.oar) {
    const oar = new THREE.Group();
    oar.position.set(...parts.oar.grip);
    for (const [name, geometry] of Object.entries(parts.oar.geometries)) {
      const mesh = new THREE.Mesh(geometry, parts.materials[name]);
      mesh.castShadow = true;
      oar.add(mesh);
    }
    model.add(oar);
    model.userData.oar = oar;
  }
  if (parts.spray) {
    const spray = new THREE.Mesh(SPRAY.geometry, SPRAY.material);
    spray.position.set(...parts.spray.at);
    spray.rotation.x = -0.22; // thrown up as well as back
    spray.visible = false;
    model.add(spray);
    model.userData.spray = spray;
    model.userData.sprayWidth = parts.spray.width;
    model.userData.topSpeed = MAX_SPEED * craft.pace;
  }

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
  if (typeName in CRAFT) return createCraftModel(typeName);
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
    if (data.jet) data.jet.material.emissiveIntensity = 0.35 + thrust * 1.8;
    return;
  }
  if (data.oar) {
    // The gondolier's stroke: the blade sweeps aft and feathers back. It
    // keeps a slow beat at rest, as a gondolier holding his place does.
    const effort = 0.2 + 0.8 * Math.min(1, Math.abs(speed) / 1.2);
    const phase = time * (1.5 + Math.abs(speed) * 0.3) + model.id;
    data.oar.rotation.x = Math.sin(phase) * 0.2 * effort;
    data.oar.rotation.z = Math.cos(phase) * 0.07 * effort;
  }
  if (!data.rig) return;
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
    const known = typeName in CRAFT || typeName in BOAT_TYPES;
    model = createBoatModel(known ? typeName : DEFAULT_BOAT);
    pace = CRAFT[typeName]?.pace ?? 1;
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
  const forward = new THREE.Vector3();

  // Upriver the banks stay where they are. The channel opens only on the
  // way to the sea, and always inside the water mesh.
  function bankLimit(s) {
    const base = RIVER.width / 2 - RIVER.margin;
    if (s <= path.mouth - 600) return base;
    if (s < path.mouth) {
      const t = THREE.MathUtils.smoothstep(s, path.mouth - 600, path.mouth);
      return base + (340 - base) * t;
    }
    const span = Math.max(path.step, path.seaEnd - path.mouth);
    const t = Math.min(1, (s - path.mouth) / span);
    return 340 + (480 - 340) * t;
  }

  function update(dt, input, time, speedLimit = Infinity) {
    state.speed += input.throttle * ACCELERATION * pace * dt;
    state.speed -= state.speed * DRAG * dt;
    state.speed = THREE.MathUtils.clamp(state.speed, MAX_REVERSE, MAX_SPEED * pace);
    // A limit is eased into rather than snapped to. The fast craft brake
    // harder, or they would be at the next ring before the card was read.
    // Past the hydroplane that shared rate is no longer enough: the spare
    // speed has to come off inside the card, whatever the pace.
    if (state.speed > speedLimit) {
      const extra = state.speed - speedLimit;
      // Nine times the pace still beats a held throttle, as it does for the
      // hydroplane. The record boat also dumps the surplus over a short run.
      const bleed = Math.max(9 * pace, pace > 10 ? (extra * extra) / (2 * 14) : 0);
      state.speed = Math.max(speedLimit, state.speed - bleed * dt);
    }

    // The rudder needs way on to bite; keep a little authority at rest so the
    // boat can still be pointed somewhere.
    let rudder = THREE.MathUtils.clamp(state.speed / 3, -1, 1);
    if (Math.abs(rudder) < 0.25) rudder = 0.25;
    // The record boat would need a wider river than this one. It yaws harder
    // so it can still hold the line the hydroplane holds.
    const yaw = TURN_RATE * (pace > 10 ? pace / 10 : 1);
    state.heading -= input.steer * yaw * rudder * dt;

    const dirX = Math.sin(state.heading);
    const dirZ = Math.cos(state.heading);
    state.x += dirX * state.speed * dt;
    state.z += dirZ * state.speed * dt;

    const { sample, s, lateral, index } = path.project(state.x, state.z);
    const limit = bankLimit(s);
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

    // The tour still ends at path.end. The boat may go on, as far as the sea.
    const stop = path.seaEnd ?? path.end;
    const overshoot = s < path.start ? s - path.start : s > stop ? s - stop : 0;
    if (overshoot !== 0) {
      state.x -= sample.tx * overshoot;
      state.z -= sample.tz * overshoot;
      state.speed = 0;
    }
    state.s = s - overshoot;
    state.row = index;

    const bow = waveHeight(state.x + dirX * 2.5, state.z + dirZ * 2.5, time);
    const stern = waveHeight(state.x - dirX * 2.5, state.z - dirZ * 2.5, time);
    // A fast craft would copy every ripple as a pothole. The quicker it is,
    // the more it rides through them; a sailing boat still sits on the swell.
    const ride = (bow + stern) / 2;
    const pitch = (stern - bow) * 0.2;
    const follow = 1 - Math.exp(-dt * (pace > 1 ? 1.8 : 7));
    state.ride = state.ride === undefined ? ride : state.ride + (ride - state.ride) * follow;
    state.pitch = state.pitch === undefined ? pitch : state.pitch + (pitch - state.pitch) * follow;
    mesh.position.set(state.x, state.ride, state.z);
    mesh.rotation.y = state.heading;
    mesh.rotation.x = state.pitch;
    mesh.rotation.z = input.steer * (state.speed / (MAX_SPEED * pace)) * (pace > 1 ? 0.3 : 0.12);
  }

  function getForward() {
    return forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  }

  // Puts the boat back at the head of the river, with the way it had on.
  function relaunch() {
    Object.assign(state, {
      x: launch.x,
      z: launch.z,
      heading: Math.atan2(launch.tx, launch.tz),
      s: path.start + 8,
      ride: undefined,
      pitch: undefined,
    });
  }

  return { mesh, state, update, getForward, setType, relaunch };
}
