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
// Not of the period, and not pretending to be: a jet ski, a motor launch and
// a racing hydroplane, three, five and eight times as fast as a boat under sail.
const FAST_CRAFT = {
  jetski: { pace: 3, build: createJetSki },
  speedboat: { pace: 5, build: createSpeedboat },
  hydroplane: { pace: 8, build: createHydroplane },
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

// Rudder blade in profile: the stock is the y axis, x runs aft, and the
// top of the stock sits on the origin. Thickness is centred on x.
function rudderBlade(height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(depth * 0.18, -height * 0.08);
  shape.lineTo(depth * 0.85, -height * 0.38);
  shape.lineTo(depth, -height * 0.7);
  shape.lineTo(depth * 0.58, -height);
  shape.lineTo(0.02, -height * 0.9);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  geometry.translate(0, 0, -0.025);
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

  // A rubbing strake just under the rail, in deck colour: another dark tube
  // would disappear into the gunwale, above all on the tarred hull.
  for (const side of [-1, 1]) {
    const wale = [];
    for (let i = 0; i <= 14; i++) {
      const t = -0.9 + (1.8 * i) / 14;
      const frac = 0.9;
      wale.push(v(
        side * (halfBeam(t) * frac ** type.flare + 0.045),
        type.keel(t) + (sheer(t) - type.keel(t)) * frac ** type.turn,
        z(t),
      ));
    }
    add('deck', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wale), 28, 0.038, 5));
  }

  // The chase camera looks down into an otherwise empty hold. A floor timber
  // and a knee each side, kept clear of the thwarts, the cargo and the crew.
  const frameAt = type.crew === 'poling' ? [-0.58, 0.08, 0.6] : [-0.78, -0.32, 0.34];
  for (const t of frameAt) {
    const y0 = type.sole.height + 0.03;
    const y1 = Math.max(y0 + 0.18, sheer(t) - 0.14);
    const inner = hullHalfWidth(type, t, y0);
    const outer = hullHalfWidth(type, t, y1);
    if (inner < 0.25 || outer < 0.3) continue;
    const zz = z(t);
    const span = inner * 1.5;
    add('trim', new THREE.BoxGeometry(span, 0.04, 0.06), 0, y0, zz);
    for (const side of [-1, 1]) {
      add('deck', spar(v(side * span * 0.42, y0 + 0.02, zz), v(side * outer * 0.78, y1, zz), 0.026));
    }
  }

  // Breasthook in the eyes, with a cleat on it, and another where the sheet
  // comes aboard. Same shape convention as the sole: shape y becomes z.
  const hookT = 0.72;
  const hookY = sheer(hookT) - 0.08;
  const hook = new THREE.Shape();
  const hookBeam = halfBeam(hookT) * 0.78;
  hook.moveTo(-hookBeam, z(hookT));
  hook.lineTo(0, z(0.97));
  hook.lineTo(hookBeam, z(hookT));
  hook.closePath();
  const hookGeometry = new THREE.ShapeGeometry(hook);
  hookGeometry.rotateX(Math.PI / 2);
  hookGeometry.translate(0, hookY, 0);
  add('deck', hookGeometry);
  const cleat = (x, y, zz) => {
    add('trim', new THREE.BoxGeometry(0.06, 0.045, 0.16), x, y, zz);
    add('trim', new THREE.BoxGeometry(0.16, 0.035, 0.045), x, y + 0.032, zz - 0.045);
    add('trim', new THREE.BoxGeometry(0.16, 0.035, 0.045), x, y + 0.032, zz + 0.045);
  };
  cleat(0, hookY + 0.04, z(0.86));
  cleat(halfBeam(-0.7) * 0.62, sheer(-0.7) - 0.02, z(-0.7));

  add('trim', new THREE.BoxGeometry(0.24, 0.055, 0.24), mastFoot.x, type.sole.height + 0.035, mastFoot.z);
  add('trim', new THREE.TorusGeometry(0.125, 0.03, 6, 12).rotateX(Math.PI / 2), mastFoot.x, mastFoot.y + 0.05, mastFoot.z);

  const coilAt = type.crew === 'poling' ? [-0.38, z(0.48)] : [0.4, z(-0.22)];
  for (const [radius, lift] of [[0.15, 0], [0.1, 0.032], [0.055, 0.058]]) {
    add(
      'trim',
      new THREE.TorusGeometry(radius, 0.02, 5, 12).rotateX(Math.PI / 2),
      coilAt[0],
      type.sole.height + 0.03 + lift,
      coilAt[1],
    );
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

  // Rudder and tiller. The head of the blade meets the tiller; the heel
  // stays down where the old slab reached the water. Two pins hinge it.
  const { rudder } = type;
  const headY = sheer(-1) - 0.04;
  const heelY = rudder.drop - rudder.height / 2;
  add('trim', rudderBlade((headY - heelY) / 0.92, rudder.depth * 1.2), 0, headY, z(-1) + 0.02);
  for (const fraction of [0.34, 0.7]) {
    const pin = new THREE.CylinderGeometry(0.028, 0.028, 0.12, 6).rotateZ(Math.PI / 2);
    add('trim', pin, 0, headY + (heelY - headY) * fraction, z(-1) + 0.01);
  }
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
    // Thole pins the oar lies between, rather than a loose stick on the floor.
    for (const x of [-0.45, -0.7]) {
      add('trim', new THREE.CylinderGeometry(0.022, 0.022, 0.2, 6), x, 0.46, -0.45);
    }
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
  // An esparto basket beside the sacks, dark so it does not vanish into the
  // deck. Only the Albufera boat carries one.
  if (type.crew === 'poling') {
    const bx = 0.42;
    const bz = load - 0.95;
    add('trim', new THREE.CylinderGeometry(0.2, 0.15, 0.28, 8), bx, floor + 0.15, bz);
    add('deck', new THREE.TorusGeometry(0.2, 0.022, 5, 10).rotateX(Math.PI / 2), bx, floor + 0.28, bz);
    add('sack', new THREE.SphereGeometry(0.11, 8, 6).scale(1, 0.4, 1), bx, floor + 0.26, bz);
  }

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

// Pieces of one craft, merged per material. A racing number keeps its UVs;
// everything else is position and normal only, so a hull can sit beside a tube.
function pieceBin() {
  const pieces = {};
  const add = (material, geometry, x = 0, y = 0, z = 0) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    for (const name of Object.keys(piece.attributes)) {
      if (name !== 'position' && name !== 'normal' && !(material === 'number' && name === 'uv')) {
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
    const blade = new THREE.BoxGeometry(radius * 0.9, radius * 0.32, radius * 0.09);
    blade.translate(radius * 0.38, 0, 0);
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
  add('accent', new THREE.SphereGeometry(1, 16, 12).scale(0.34, 0.13, 0.4), 0, 0.42, 0.86);
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

// The racing hydroplane: a flat hull on two sponsons, an open cockpit, the
// engine under a cowl and a wing on two fins. The propeller and rudder hang
// off the transom, which is what the chase view looks at.
function createHydroplane() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const { add, geometries } = pieceBin();
  // Centre hull, tapering to the bow, and the deck that ties in the sponsons.
  add('shell', new THREE.BoxGeometry(1.5, 0.36, 4.6), 0, 0.34, -0.7);
  add('shell', new THREE.CylinderGeometry(0.04, 0.72, 1.8, 8, 1).rotateY(Math.PI / 8).rotateX(Math.PI / 2).scale(1, 0.38, 1), 0, 0.36, 2.5);
  add('accent', new THREE.BoxGeometry(3.3, 0.12, 1.7), 0, 0.5, 1);
  add('saddle', new THREE.BoxGeometry(0.07, 0.025, 3.4), 0, 0.575, 0.15); // deck stripe
  for (const side of [-1, 1]) {
    add('shell', new THREE.BoxGeometry(0.72, 0.34, 2.9), side * 1.3, 0.2, 1.5);
    add('accent', new THREE.BoxGeometry(0.5, 0.05, 2.15), side * 1.3, 0.4, 1.45);
    add('accent', new THREE.CylinderGeometry(0.03, 0.34, 1.25, 8, 1).rotateY(Math.PI / 8).rotateX(Math.PI / 2).scale(1, 0.5, 1), side * 1.3, 0.22, 3.55);
    // Riding pad and the non-trip along the outer chine.
    add('saddle', new THREE.BoxGeometry(0.42, 0.045, 2.35), side * 1.3, 0.005, 1.35);
    add('accent', new THREE.BoxGeometry(0.035, 0.14, 2.05), side * 1.67, 0.08, 1.4);
    const badge = new THREE.PlaneGeometry(0.5, 0.5);
    badge.rotateY(side * Math.PI / 2);
    add('number', badge, side * 1.7, 0.26, 1.65);
    // Fins and the winglets past them.
    add('accent', new THREE.BoxGeometry(0.07, 0.95, 0.7), side * 0.62, 1.02, -2.55);
    add('accent', new THREE.BoxGeometry(0.2, 0.05, 0.48), side * 1.12, 1.58, -2.55);
  }
  add('shell', new THREE.BoxGeometry(2.3, 0.07, 0.55), 0, 1.52, -2.55);
  add('shell', new THREE.BoxGeometry(1.7, 0.04, 0.26), 0, 1.34, -2.4); // flap
  // Cockpit: a tub and a coaming, rather than one solid block.
  add('saddle', new THREE.BoxGeometry(0.66, 0.08, 0.85), 0, 0.48, 0.18);
  add('accent', new THREE.BoxGeometry(0.84, 0.16, 0.07), 0, 0.64, 0.72);
  add('accent', new THREE.BoxGeometry(0.84, 0.14, 0.07), 0, 0.6, -0.32);
  for (const side of [-1, 1]) add('accent', new THREE.BoxGeometry(0.07, 0.16, 1.0), side * 0.4, 0.64, 0.2);
  add('glass', new THREE.BoxGeometry(0.62, 0.2, 0.02).rotateX(-0.9), 0, 0.78, 0.7);
  add('saddle', new THREE.TorusGeometry(0.13, 0.016, 6, 12).rotateX(-0.85), 0, 0.74, 0.5);
  add('saddle', new THREE.BoxGeometry(0.46, 0.06, 0.1), 0, 0.7, 0.58);
  for (const side of [-1, 1]) {
    add('shell', new THREE.CylinderGeometry(0.032, 0.032, 0.016, 8).rotateX(Math.PI / 2), side * 0.1, 0.74, 0.63);
  }
  // Engine cowl, scoop, headers and the stacks.
  add('accent', new THREE.BoxGeometry(0.95, 0.4, 1.65), 0, 0.7, -1.5);
  add('accent', new THREE.SphereGeometry(1, 12, 8).scale(0.46, 0.18, 0.78), 0, 0.9, -1.55);
  add('saddle', new THREE.BoxGeometry(0.42, 0.2, 0.42), 0, 1.05, -1.02);
  add('saddle', new THREE.BoxGeometry(0.26, 0.1, 0.06), 0, 1.16, -0.82);
  for (const side of [-1, 1]) {
    add('metal', spar(v(side * 0.4, 0.72, -0.85), v(side * 0.26, 0.98, -1.75), 0.032));
    add('metal', new THREE.CylinderGeometry(0.045, 0.055, 0.26, 8).rotateX(0.45), side * 0.26, 1.08, -1.88);
    for (let i = 0; i < 4; i++) add('saddle', new THREE.BoxGeometry(0.018, 0.045, 0.2), side * 0.49, 0.78, -1.1 - i * 0.2);
  }
  add('saddle', spar(v(0.32, 0.88, -0.5), v(0.32, 1.32, -0.62), 0.012)); // aerial
  // Surface drive: a strut, a propeller big enough to read from astern, and the rudder.
  add('metal', spar(v(0.3, 0.24, -2.35), v(0.3, -0.04, -3.2), 0.04));
  add('metal', propeller(0.34), 0.3, -0.06, -3.4);
  add('saddle', new THREE.BoxGeometry(0.05, 0.62, 0.32), -0.24, -0.02, -3.18);
  add('metal', new THREE.BoxGeometry(0.08, 0.08, 0.2), -0.24, 0.3, -2.95);
  add('saddle', new THREE.BoxGeometry(0.02, 0.26, 0.3), 1.55, -0.02, 0.4); // skid fin
  // The boatman, low in the cockpit, hat and all.
  add('shirt', new THREE.CapsuleGeometry(0.19, 0.22, 4, 10), 0, 0.86, 0.1);
  for (const side of [-1, 1]) add('shirt', spar(v(side * 0.2, 1, 0.12), v(side * 0.1, 0.8, 0.48), 0.05));
  add('skin', new THREE.SphereGeometry(0.14, 12, 10), 0, 1.24, 0.12);
  add('straw', new THREE.CylinderGeometry(0.3, 0.3, 0.025, 14), 0, 1.35, 0.12);
  add('straw', new THREE.CylinderGeometry(0.12, 0.15, 0.13, 12), 0, 1.42, 0.12);

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
      metal: METAL,
      glass: GLASS,
      number,
    },
    spray: { at: [0.15, 0.12, -3.45], width: 2.1 },
    lantern: [0, 0.62, 3.25],
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
    // A limit is eased into rather than snapped to. The fast craft brake
    // harder, or they would be at the next ring before the card was read.
    if (state.speed > speedLimit) state.speed = Math.max(speedLimit, state.speed - 9 * pace * dt);

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

  // Puts the boat back at the head of the river, with the way it had on.
  function relaunch() {
    Object.assign(state, { x: launch.x, z: launch.z, heading: Math.atan2(launch.tx, launch.tz), s: path.start + 8 });
  }

  return { mesh, state, update, getForward, setType, relaunch };
}
