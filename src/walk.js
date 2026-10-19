import * as THREE from 'three';
import { BANK, PRETIL, RIVER } from './config.js';
import { bridgeDecks, bridgeStairs } from './bridges.js';
import { riverStairs } from './riverside.js';

// Going ashore. At any flight of steps down to the water (on the bridges and
// in the riverside parapet) the boat can be left moored and a rider of about
// 1700 goes on horseback through the streets: the same controls steer the
// horse, the camera follows close behind, and it runs into the blocks of
// houses, the monuments, the city wall (passable only at its gates), the
// river and the bridges' parapets. Back at any flight it can take to the boat
// again. Each flight is marked on the water with a small ring of its own.

const RIDE = { speed: 7, back: 1.5, turn: 1.8, radius: 0.75, gate: 6 };
const MARK = { radius: 5, edge: 1.1, height: 0.55, gap: 3 }; // the info rings are 18 m across the middle
const REACH = { aboard: 5 }; // metres from the top of the steps, ashore
const STREET = PRETIL.offset + PRETIL.thickness + 0.3; // the river side of the street, from the centreline
const OPEN = new Set(['albereda', 'jardins-real']); // planted ground, ridden through

function createRider() {
  const group = new THREE.Group();
  const cloth = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const coat = cloth(0x6e3b2b);
  const breeches = cloth(0x3a3328);
  const stockings = cloth(0xd8cfba);
  const skin = cloth(0xd6a07c);
  const felt = cloth(0x26211d);
  const bay = cloth(0x6b4528);
  const mane = cloth(0x2b1f17);
  const tack = cloth(0x5a2a22);
  const box = (w, h, d, material, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Limbs hang from a pivot at the hip or the shoulder, so they can swing.
  const limb = (parent, x, y, z = 0) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    parent.add(pivot);
    return pivot;
  };

  // The horse, a bay, facing +Z: barrel, neck and head, four legs and a tail.
  const horse = new THREE.Group();
  group.add(horse);
  box(0.56, 0.66, 1.75, bay, 0, 1.27, 0, horse);
  box(0.6, 0.62, 0.5, bay, 0, 1.3, 0.62, horse); // chest
  box(0.58, 0.6, 0.5, bay, 0, 1.32, -0.62, horse); // quarters
  const neck = box(0.3, 0.8, 0.42, bay, 0, 1.78, 0.98, horse);
  neck.rotation.x = 0.55;
  const crest = box(0.08, 0.72, 0.16, mane, 0, 1.86, 0.88, horse);
  crest.rotation.x = 0.55;
  const head = box(0.26, 0.3, 0.62, bay, 0, 2.08, 1.38, horse);
  head.rotation.x = 0.5;
  for (const x of [-0.07, 0.07]) box(0.05, 0.14, 0.05, bay, x, 2.3, 1.18, horse);
  const tail = box(0.12, 0.7, 0.14, mane, 0, 1.2, -1.02, horse);
  tail.rotation.x = 0.35;
  const legs = [];
  for (const [x, z] of [[-0.17, 0.66], [0.17, 0.66], [-0.17, -0.66], [0.17, -0.66]]) {
    const leg = limb(horse, x, 1.0, z);
    box(0.14, 0.92, 0.16, bay, 0, -0.46, 0, leg);
    box(0.15, 0.1, 0.18, mane, 0, -0.95, 0, leg);
    legs.push(leg);
  }
  box(0.6, 0.08, 0.55, tack, 0, 1.62, 0.05, horse); // saddle

  // The rider in the saddle: coat to the knee, stockings, a cocked hat.
  const rider = new THREE.Group();
  rider.position.set(0, 0.74, 0);
  horse.add(rider);
  for (const x of [-0.13, 0.13]) {
    const leg = limb(rider, x, 0.92);
    leg.rotation.set(-0.7, 0, x < 0 ? -0.35 : 0.35); // astride, the thigh forward and out
    box(0.17, 0.42, 0.19, breeches, 0, -0.21, 0, leg);
    box(0.14, 0.44, 0.15, stockings, 0, -0.64, 0, leg);
    box(0.15, 0.08, 0.27, felt, 0, -0.88, 0.05, leg);
  }
  box(0.46, 0.6, 0.27, coat, 0, 1.23, 0, rider);
  box(0.2, 0.5, 0.02, stockings, 0, 1.25, 0.14, rider);
  box(0.14, 0.08, 0.14, stockings, 0, 1.56, 0.03, rider);
  for (const x of [-0.3, 0.3]) {
    const arm = limb(rider, x, 1.5);
    arm.rotation.x = -0.6; // the reins in hand
    box(0.13, 0.58, 0.15, coat, 0, -0.29, 0, arm);
    box(0.1, 0.1, 0.11, skin, 0, -0.62, 0, arm);
  }
  box(0.22, 0.25, 0.22, skin, 0, 1.73, 0, rider);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 3), felt);
  brim.position.set(0, 1.87, 0);
  brim.rotation.y = Math.PI;
  brim.castShadow = true;
  rider.add(brim);
  box(0.2, 0.09, 0.2, felt, 0, 1.92, 0, rider);

  group.userData = { horse, legs };
  return group;
}

// Point in polygon, and the distance from a point to the polygon's outline.
function inside(polygon, x, z) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

function segmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

export function createWalk(scene, layout, path, blocks) {
  const decks = bridgeDecks(layout, path);

  // Blocks of houses, each with its bounding box to skip the far ones.
  const solids = blocks.map((polygon) => {
    const xs = polygon.map(([x]) => x);
    const zs = polygon.map(([, z]) => z);
    return { polygon, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  });
  // Monuments as rectangles along their axis; those without a size as a circle.
  const monuments = layout.landmarks
    .filter((landmark) => !OPEN.has(landmark.kind))
    .map((landmark) => {
      const [ax, az] = landmark.axis ?? [1, 0];
      const norm = Math.hypot(ax, az) || 1;
      return {
        x: landmark.x,
        z: landmark.z,
        ax: ax / norm,
        az: az / norm,
        half: (landmark.length ?? 40) / 2,
        side: (landmark.width ?? 40) / 2,
      };
    });
  const wall = layout.wall;
  const gates = layout.gates.map((gate) => wall[gate.vertex]);

  // Where one can go ashore: every flight on the bridges and in the parapet.
  const landings = [...bridgeStairs(layout, path), ...riverStairs(path, decks)].map((stair) => ({ ...stair }));

  // A small ring on the water off the foot of each flight. Where it would
  // touch a point of interest's ring it slides along the river until clear.
  const rings = new THREE.Group();
  const ringMaterial = (opacity) =>
    new THREE.MeshBasicMaterial({ color: 0xe0a64a, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const edgeGeometry = new THREE.RingGeometry(MARK.radius - MARK.edge, MARK.radius, 40).rotateX(-Math.PI / 2);
  const fillGeometry = new THREE.CircleGeometry(MARK.radius - MARK.edge, 40).rotateX(-Math.PI / 2);
  const edgeMaterial = ringMaterial(0.75);
  const fillMaterial = ringMaterial(0.14);
  function markLandings(points, pointRadius) {
    rings.clear();
    for (const landing of landings) {
      const start = path.project(landing.footX, landing.footZ);
      const clear = (x, z) => points.every((point) => Math.hypot(x - point.x, z - point.z) > pointRadius + MARK.radius + MARK.gap);
      let x = landing.footX;
      let z = landing.footZ;
      // Sideways across the river, a little to one side and then the other,
      // so it stays as far from the bridge as the foot of its steps and off
      // the piers; never out of the water.
      const point = path.pointAt(start.s);
      const wet = RIVER.width / 2 - MARK.radius - 1;
      for (let k = 1; k <= 40 && !clear(x, z); k++) {
        const lateral = start.lateral + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2;
        if (Math.abs(lateral) > wet) continue;
        x = point.x + point.rx * lateral;
        z = point.z + point.rz * lateral;
      }
      landing.markX = x;
      landing.markZ = z;
      const ring = new THREE.Group();
      ring.add(new THREE.Mesh(fillGeometry, fillMaterial), new THREE.Mesh(edgeGeometry, edgeMaterial));
      ring.position.set(x, MARK.height, z);
      ring.renderOrder = 2;
      rings.add(ring);
    }
  }
  markLandings([], 0);
  scene.add(rings);

  const figure = createRider();
  figure.visible = false;
  scene.add(figure);

  const state = { on: false, x: 0, y: BANK.height, z: 0, heading: 0, phase: 0, speed: 0, landing: null };

  // The deck a point is on, if any, with its height there.
  function deckAt(x, z) {
    for (const deck of decks) {
      const dx = x - deck.x;
      const dz = z - deck.z;
      const u = dx * deck.rx + dz * deck.rz;
      const v = -dx * deck.rz + dz * deck.rx;
      if (Math.abs(u) <= deck.half && Math.abs(v) <= deck.width / 2 - 0.8) return deck.heightAt(u);
    }
    return null;
  }

  // Whether a point is inside a block of houses or a monument: the solid
  // part only, for keeping the camera out of the houses.
  function solid(x, z, r = 0) {
    for (const block of solids) {
      if (x < block.minX - r || x > block.maxX + r || z < block.minZ - r || z > block.maxZ + r) continue;
      if (inside(block.polygon, x, z)) return true;
    }
    for (const m of monuments) {
      const dx = x - m.x;
      const dz = z - m.z;
      if (Math.abs(dx * m.ax + dz * m.az) < m.half + r && Math.abs(-dx * m.az + dz * m.ax) < m.side + r) return true;
    }
    return false;
  }

  function blocked(x, z, fromX, fromZ) {
    const r = RIDE.radius;
    const deck = deckAt(x, z);
    if (deck == null) {
      const { lateral, s } = path.project(x, z);
      if (Math.abs(lateral) < STREET) return true; // the river bed, or a bridge's parapet
      if (s < path.start || s > path.end) return true; // the scene ends in the mist
    }
    if (solid(x, z, r)) return true;
    // The wall: no standing in it and no crossing it, except through a gate.
    if (!gates.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < RIDE.gate)) {
      for (let i = 0; i < wall.length; i++) {
        const [ax, az] = wall[i];
        const [bx, bz] = wall[(i + 1) % wall.length];
        if (segmentDistance(x, z, ax, az, bx, bz) < 1.6 + r) return true;
        const side = (px, pz) => Math.sign((bx - ax) * (pz - az) - (bz - az) * (px - ax));
        if (side(x, z) !== side(fromX, fromZ) && Math.sign((x - fromX) * (az - fromZ) - (z - fromZ) * (ax - fromX)) !== Math.sign((x - fromX) * (bz - fromZ) - (z - fromZ) * (bx - fromX))) return true;
      }
    }
    return false;
  }

  function nearestFoot(boatState) {
    let best = null;
    let distance = Infinity;
    for (const landing of landings) {
      const d = Math.hypot(boatState.x - landing.markX, boatState.z - landing.markZ);
      if (d < distance) {
        distance = d;
        best = landing;
      }
    }
    return distance < MARK.radius ? best : null; // inside the ring
  }

  function nearestTop() {
    let best = null;
    let distance = Infinity;
    for (const landing of landings) {
      const d = Math.hypot(state.x - landing.x, state.z - landing.z);
      if (d < distance) {
        distance = d;
        best = landing;
      }
    }
    return distance < REACH.aboard ? best : null;
  }

  function goAshore(landing) {
    Object.assign(state, {
      on: true,
      x: landing.x,
      z: landing.z,
      y: deckAt(landing.x, landing.z) ?? BANK.height,
      heading: Math.atan2(landing.inward[0], landing.inward[1]),
      speed: 0,
      landing,
    });
    figure.visible = true;
    place();
  }

  function goAboard() {
    state.on = false;
    figure.visible = false;
  }

  function place() {
    figure.position.set(state.x, state.y, state.z);
    figure.rotation.y = state.heading;
    // A trot: the diagonal pairs of legs swing together, and the body bobs.
    const pace = Math.min(1, Math.abs(state.speed) / RIDE.speed);
    const swing = Math.sin(state.phase) * (0.15 + 0.45 * pace) * Math.min(1, Math.abs(state.speed) * 2);
    const { horse, legs } = figure.userData;
    legs[0].rotation.x = swing;
    legs[3].rotation.x = swing;
    legs[1].rotation.x = -swing;
    legs[2].rotation.x = -swing;
    horse.position.y = Math.abs(Math.sin(state.phase)) * 0.06 * pace;
  }

  function update(dt, axes) {
    if (!state.on) return;
    state.heading -= axes.steer * RIDE.turn * dt;
    const wanted = axes.throttle >= 0 ? axes.throttle * RIDE.speed : axes.throttle * RIDE.back;
    state.speed += (wanted - state.speed) * Math.min(1, dt * 3);
    const step = state.speed * dt;
    const dx = Math.sin(state.heading) * step;
    const dz = Math.cos(state.heading) * step;
    // Slide along whatever is in the way rather than stopping dead.
    let moved = false;
    for (const [mx, mz] of [[dx, dz], [dx, 0], [0, dz]]) {
      if (mx === 0 && mz === 0) continue;
      if (!blocked(state.x + mx, state.z + mz, state.x, state.z)) {
        state.x += mx;
        state.z += mz;
        moved = true;
        break;
      }
    }
    if (!moved) state.speed *= 0.5;
    const ground = deckAt(state.x, state.z) ?? BANK.height;
    state.y += (ground - state.y) * Math.min(1, dt * 12);
    state.phase += (1.2 + Math.abs(state.speed) * 1.1) * dt * Math.min(1, Math.abs(state.speed) * 2);
    place();
  }

  return { state, figure, landings, update, nearestFoot, nearestTop, goAshore, goAboard, blocked, solid, markLandings };
}
