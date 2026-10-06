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

// A small lateen-rigged river boat, about seven metres long. The bow points
// to +Z, +X is the port side and the waterline sits at y = 0.
const HULL = { length: 7, beam: 2.3, stations: 18, girth: 12 };

// Hull lines as functions of t, from -1 at the stern to +1 at the bow.
const halfBeam = (t) => (HULL.beam / 2) * (1 - Math.abs(t) ** (t < 0 ? 3 : 2.2)) ** 0.75;
const sheer = (t) => 0.55 + 0.3 * t * t + 0.18 * Math.max(t, 0) ** 3;
const keel = (t) => -0.36 + 0.5 * Math.abs(t) ** 3;
const stationZ = (t) => (t * HULL.length) / 2;

function sharedMaterials() {
  const planks = TEXTURES.planks.clone();
  planks.repeat.set(2, 1.6);
  return {
    hull: new THREE.MeshStandardMaterial({ map: planks, color: 0x8a5a34, roughness: 0.8, side: THREE.DoubleSide }),
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

function createHullGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= HULL.stations; i++) {
    const t = (i / HULL.stations) * 2 - 1;
    for (let j = 0; j <= HULL.girth; j++) {
      const a = (j / HULL.girth) * 2 - 1; // -1 and +1 are the gunwales, 0 is the keel
      positions.push(
        halfBeam(t) * Math.sign(a) * Math.abs(a) ** 0.6,
        keel(t) + (sheer(t) - keel(t)) * Math.abs(a) ** 2.2,
        stationZ(t),
      );
      uvs.push(i / HULL.stations, j / HULL.girth);
    }
  }
  const row = HULL.girth + 1;
  for (let i = 0; i < HULL.stations; i++) {
    for (let j = 0; j < HULL.girth; j++) {
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

// Floorboards: the hull's outline, narrowed, laid flat near the bottom.
function createSoleGeometry() {
  const outline = new THREE.Shape();
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = -0.86 + (1.72 * i) / steps;
    outline[i ? 'lineTo' : 'moveTo'](halfBeam(t) * 0.72, stationZ(t));
  }
  for (let i = steps; i >= 0; i--) {
    const t = -0.86 + (1.72 * i) / steps;
    outline.lineTo(-halfBeam(t) * 0.72, stationZ(t));
  }
  const geometry = new THREE.ShapeGeometry(outline);
  geometry.rotateX(Math.PI / 2); // the shape's y becomes z
  geometry.translate(0, 0.02, 0);
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

// Everything is built once: each boat is a handful of meshes over these
// shared geometries, one per material.
function createParts() {
  const pieces = {};
  const add = (material, geometry, x = 0, y = 0, z = 0) => {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    piece.translate(x, y, z);
    (pieces[material] ??= []).push(piece);
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);

  add('hull', createHullGeometry());
  add('deck', createSoleGeometry());

  // Gunwales, stem and stern posts
  for (const side of [-1, 1]) {
    const rail = [];
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * 2 - 1;
      rail.push(v(side * halfBeam(t), sheer(t) + 0.02, stationZ(t)));
    }
    add('trim', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 32, 0.055, 6));
  }
  add('trim', new THREE.BoxGeometry(0.09, 0.5, 0.12), 0, sheer(1) + 0.18, stationZ(1) - 0.03);
  add('trim', new THREE.BoxGeometry(0.09, 0.4, 0.12), 0, sheer(-1) + 0.12, stationZ(-1) + 0.03);

  // Thwarts
  for (const t of [-0.5, -0.05, 0.42]) {
    add('deck', new THREE.BoxGeometry(halfBeam(t) * 1.86, 0.06, 0.3), 0, sheer(t) - 0.2, stationZ(t));
  }

  // Rig: raked mast, yard and a lateen sail sheeted out to port
  const mastFoot = v(0, 0.05, 0.9);
  const mastHead = v(0, 5.4, 1.15);
  const tack = v(0.12, 1.5, 3.3);
  const peak = v(0.12, 6.2, -1.5);
  const clew = v(1.35, 1.25, -2.3);
  add('trim', spar(mastFoot, mastHead, 0.085));
  add('trim', spar(tack.clone().lerp(peak, -0.05), peak.clone().lerp(tack, -0.04), 0.05));
  add('sail', createSailGeometry(tack, peak, clew));

  // Rudder and tiller
  add('trim', new THREE.BoxGeometry(0.06, 0.95, 0.42), 0, 0.02, stationZ(-1) - 0.18);
  add('trim', spar(v(0, 0.5, stationZ(-1) - 0.1), v(0.1, 0.92, stationZ(-1) + 1.15), 0.035));

  // An oar shipped along the starboard side
  add('deck', spar(v(-0.55, 0.42, -2.2), v(-0.62, 0.5, 1.9), 0.035));
  add('deck', new THREE.BoxGeometry(0.16, 0.03, 0.6), -0.63, 0.5, 2.1);

  // The boatman, sitting aft with a hand on the tiller
  const seat = stationZ(-0.62);
  add('breeches', new THREE.BoxGeometry(0.36, 0.22, 0.5), 0.12, 0.5, seat + 0.2);
  add('shirt', new THREE.CapsuleGeometry(0.19, 0.36, 4, 10), 0.12, 0.92, seat);
  add('shirt', spar(v(0.0, 1.05, seat), v(0.06, 0.9, seat - 0.55), 0.06));
  add('skin', new THREE.SphereGeometry(0.14, 12, 10), 0.12, 1.38, seat);
  add('straw', new THREE.CylinderGeometry(0.3, 0.3, 0.025, 14), 0.12, 1.49, seat);
  add('straw', new THREE.CylinderGeometry(0.12, 0.15, 0.13, 12), 0.12, 1.56, seat);

  // Cargo forward of the mast
  const sack = () => new THREE.SphereGeometry(0.3, 10, 8).scale(1, 0.62, 1.25);
  add('sack', sack(), 0.3, 0.24, 1.9);
  add('sack', sack(), -0.25, 0.24, 2.05);
  add('sack', sack().rotateY(0.9), 0.05, 0.56, 1.95);
  add('deck', new THREE.CylinderGeometry(0.24, 0.2, 0.5, 12), -0.32, 0.3, 0.1);

  const geometries = Object.fromEntries(
    Object.entries(pieces).map(([material, list]) => [material, mergeGeometries(list)]),
  );

  // Standing and running rigging, as plain lines
  const lines = [
    [mastHead, v(halfBeam(0.1), sheer(0.1), stationZ(0.1))],
    [mastHead, v(-halfBeam(0.1), sheer(0.1), stationZ(0.1))],
    [mastHead, tack.clone().lerp(peak, 0.45)],
    [clew, v(0.6, sheer(-0.8), stationZ(-0.8))],
    [tack, v(0, sheer(1) + 0.3, stationZ(1))],
  ];
  const rigging = new THREE.BufferGeometry().setFromPoints(lines.flat());

  return { geometries, rigging };
}

let parts = null;

export function createBoatModel() {
  parts ??= createParts();
  const model = new THREE.Group();
  model.rotation.order = 'YXZ';
  for (const [material, geometry] of Object.entries(parts.geometries)) {
    model.add(new THREE.Mesh(geometry, MATERIALS[material]));
  }
  model.add(new THREE.LineSegments(parts.rigging, MATERIALS.rope));
  return model;
}

export function createBoat(path) {
  const mesh = createBoatModel();

  // Heading is measured so that forward = (sin h, cos h) on the (x, z) plane.
  const launch = path.sampleAt(path.start + 8);
  const state = {
    x: launch.x,
    z: launch.z,
    heading: Math.atan2(launch.tx, launch.tz),
    speed: 0,
    s: path.start + 8, // distance along the river
    row: 0, // nearest centreline sample
  };
  const limit = RIVER.width / 2 - RIVER.margin;
  const forward = new THREE.Vector3();

  function update(dt, input, time) {
    state.speed += input.throttle * ACCELERATION * dt;
    state.speed -= state.speed * DRAG * dt;
    state.speed = THREE.MathUtils.clamp(state.speed, MAX_REVERSE, MAX_SPEED);

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
    mesh.rotation.z = input.steer * (state.speed / MAX_SPEED) * 0.12;
  }

  function getForward() {
    return forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  }

  return { mesh, state, update, getForward };
}
