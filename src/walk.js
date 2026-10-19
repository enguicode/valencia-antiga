import * as THREE from 'three';
import { BANK, COLORS, PRETIL, yawTowards } from './config.js';
import { bridgeDecks, bridgeStairs } from './bridges.js';
import { createSurface } from './materials.js';

// Going ashore. At a flight of steps down to the water the boat can be left
// moored and a figure of about 1700 walks the streets: the same controls
// steer it, the camera follows at a person's height, and it runs into the
// blocks of houses, the monuments, the city wall (passable only at its
// gates), the river and the bridges' parapets. Back at any flight of steps
// it can take to the boat again.

const WALK = { speed: 2.2, back: 1.1, turn: 2.2, radius: 0.35, gate: 6 };
const REACH = { ashore: 12, aboard: 4 }; // metres from the foot of the steps (boat) or their top (on foot)
const STREET = PRETIL.offset + PRETIL.thickness + 0.3; // the river side of the street, from the centreline
const OPEN = new Set(['albereda', 'jardins-real']); // planted ground, walked through

// A pair of invented flights against the riverside parapet, one on each bank
// a little downstream of the Pont dels Serrans, so the city can be reached
// near its main gate. Only their place is invented: such steps existed.
const BANK_STEPS = { after: 45, run: 10, steps: 16 };

function createFigure() {
  const figure = new THREE.Group();
  const cloth = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const coat = cloth(0x6e3b2b);
  const breeches = cloth(0x3a3328);
  const stockings = cloth(0xd8cfba);
  const skin = cloth(0xd6a07c);
  const felt = cloth(0x26211d);
  const box = (w, h, d, material, x, y, z, parent = figure) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Limbs hang from a pivot at the hip or the shoulder, so they can swing.
  const limb = (x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    figure.add(pivot);
    return pivot;
  };
  const legs = [-0.1, 0.1].map((x) => {
    const leg = limb(x, 0.92);
    box(0.17, 0.42, 0.19, breeches, 0, -0.21, 0, leg);
    box(0.14, 0.44, 0.15, stockings, 0, -0.64, 0, leg);
    box(0.15, 0.08, 0.27, felt, 0, -0.88, 0.05, leg);
    return leg;
  });
  // Long coat to the knee, a waistcoat line and the stock at the neck.
  box(0.46, 0.6, 0.27, coat, 0, 1.23, 0);
  box(0.52, 0.36, 0.31, coat, 0, 0.78, 0);
  box(0.2, 0.5, 0.02, stockings, 0, 1.25, 0.14);
  box(0.14, 0.08, 0.14, stockings, 0, 1.56, 0.03);
  const arms = [-0.3, 0.3].map((x) => {
    const arm = limb(x, 1.5);
    box(0.13, 0.58, 0.15, coat, 0, -0.29, 0, arm);
    box(0.1, 0.1, 0.11, skin, 0, -0.62, 0, arm);
    return arm;
  });
  box(0.22, 0.25, 0.22, skin, 0, 1.73, 0);
  // A cocked hat: a wide brim and a low crown.
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 3), felt);
  brim.position.set(0, 1.87, 0);
  brim.rotation.y = Math.PI;
  brim.castShadow = true;
  figure.add(brim);
  box(0.2, 0.09, 0.2, felt, 0, 1.92, 0);
  figure.userData = { legs, arms };
  return figure;
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

  // Where one can go ashore: every flight on the bridges, and the two on the banks.
  const landings = bridgeStairs(layout, path).map((stair) => ({ ...stair }));
  const steps = new THREE.Group();
  {
    const serrans = layout.bridges.find((bridge) => bridge.id === 'serrans') ?? layout.bridges[0];
    const station = path.project(serrans.x, serrans.z).s + BANK_STEPS.after;
    const stone = createSurface('masonry', 4, { color: COLORS.stone });
    const tread = new THREE.BoxGeometry(1, 1, 1);
    for (const side of [1, -1]) {
      const along = (s, lateral) => {
        const point = path.pointAt(s);
        return [point.x + point.rx * lateral, point.z + point.rz * lateral, point];
      };
      // Treads against the river face of the parapet, going down with the stream.
      for (let k = 0; k < BANK_STEPS.steps; k++) {
        const t = k / (BANK_STEPS.steps - 1);
        const [x, z, point] = along(station + t * BANK_STEPS.run, side * (PRETIL.offset - PRETIL.thickness / 2 - 0.75));
        const top = BANK.height - t * (BANK.height - PRETIL.foot);
        const mesh = new THREE.Mesh(tread, stone);
        mesh.scale.set(BANK_STEPS.run / (BANK_STEPS.steps - 1) + 0.1, top, 1.5);
        mesh.position.set(x, top / 2, z);
        mesh.rotation.y = yawTowards(point.tx, point.tz);
        mesh.receiveShadow = true;
        steps.add(mesh);
      }
      const [x, z, point] = along(station, side * (STREET + 1.2));
      const [footX, footZ] = along(station + BANK_STEPS.run + 2, side * (PRETIL.offset - 10));
      landings.push({ id: `bank${side}`, x, z, y: BANK.height, footX, footZ, inward: [point.rx * side, point.rz * side], away: [point.tx, point.tz] });
    }
  }
  scene.add(steps);

  const figure = createFigure();
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
    const r = WALK.radius;
    const deck = deckAt(x, z);
    if (deck == null) {
      const { lateral, s } = path.project(x, z);
      if (Math.abs(lateral) < STREET) return true; // the river bed, or a bridge's parapet
      if (s < path.start || s > path.end) return true; // the scene ends in the mist
    }
    if (solid(x, z, r)) return true;
    // The wall: no standing in it and no crossing it, except through a gate.
    if (!gates.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < WALK.gate)) {
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
      const d = Math.hypot(boatState.x - landing.footX, boatState.z - landing.footZ);
      if (d < distance) {
        distance = d;
        best = landing;
      }
    }
    return distance < REACH.ashore ? best : null;
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
    const swing = Math.sin(state.phase) * Math.min(1, Math.abs(state.speed) / WALK.speed) * 0.6;
    const { legs, arms } = figure.userData;
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
    arms[0].rotation.x = -swing * 0.8;
    arms[1].rotation.x = swing * 0.8;
  }

  function update(dt, axes) {
    if (!state.on) return;
    state.heading -= axes.steer * WALK.turn * dt;
    const wanted = axes.throttle >= 0 ? axes.throttle * WALK.speed : axes.throttle * WALK.back;
    state.speed += (wanted - state.speed) * Math.min(1, dt * 8);
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
    state.phase += Math.abs(state.speed) * dt * 3.6;
    place();
  }

  return { state, figure, landings, update, nearestFoot, nearestTop, goAshore, goAboard, blocked, solid };
}
