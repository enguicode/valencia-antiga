import * as THREE from 'three';
import { BANK, PRETIL } from './config.js';
import { bridgeDecks, bridgeStairs } from './bridges.js';
import { riverStairs } from './riverside.js';

// Going ashore. At any flight of steps down to the water (on the bridges and
// in the riverside parapet) the boat can be left moored and a rider of about
// 1700 goes on horseback through the streets: the same controls steer the
// horse, the camera follows close behind, and it runs into the
// houses, the monuments, the city wall (passable only at its gates), the
// river and the bridges' parapets. Back at any flight it can take to the boat
// again. Each flight is marked on the water with a small ring of its own.

// Held on, the horse works up from a trot to a flat-out gallop: four times
// the trot in five and a half seconds. Let go, it slows down over a few seconds.
const RIDE = { speed: 28, trot: 7, gallop: 10, back: 1.5, accel: 5, brake: 6, turn: 1.8, radius: 0.75, gate: 6 };
const MARK = { radius: 5, edge: 1.1, height: 0.55 }; // the info rings have a radius of 18 m
// How far aside the horse may turn to slide along an obstacle: 10° at a time, either way, up to 80°.
const SLIDE = [0, ...Array.from({ length: 8 }, (_, i) => [1, -1].map((side) => (side * (i + 1) * Math.PI) / 18)).flat()];
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

// The distance from a point to a segment.
function segmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

export function createWalk(scene, layout, path, houses) {
  const decks = bridgeDecks(layout, path);

  // The houses as city.js draws them, each a rectangle on the ground, filed
  // in a grid so only the few nearby are looked at.
  const GRID = 24;
  const cellKey = (x, z) => `${Math.floor(x / GRID)},${Math.floor(z / GRID)}`;
  const grid = new Map();
  for (const house of houses) {
    const reach = Math.hypot(house.along, house.across);
    for (let gx = Math.floor((house.x - reach) / GRID); gx <= Math.floor((house.x + reach) / GRID); gx++) {
      for (let gz = Math.floor((house.z - reach) / GRID); gz <= Math.floor((house.z + reach) / GRID); gz++) {
        const key = `${gx},${gz}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(house);
      }
    }
  }
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

  // A small ring on the water right at the foot of each flight. The points
  // of interest's rings are the ones that move to keep clear of these.
  const rings = new THREE.Group();
  const ringMaterial = (opacity) =>
    new THREE.MeshBasicMaterial({ color: 0xe0a64a, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const edgeGeometry = new THREE.RingGeometry(MARK.radius - MARK.edge, MARK.radius, 40).rotateX(-Math.PI / 2);
  const fillGeometry = new THREE.CircleGeometry(MARK.radius - MARK.edge, 40).rotateX(-Math.PI / 2);
  const edgeMaterial = ringMaterial(0.75);
  const fillMaterial = ringMaterial(0.14);
  for (const landing of landings) {
    const ring = new THREE.Group();
    ring.add(new THREE.Mesh(fillGeometry, fillMaterial), new THREE.Mesh(edgeGeometry, edgeMaterial));
    ring.position.set(landing.footX, MARK.height, landing.footZ);
    ring.renderOrder = 2;
    rings.add(ring);
  }
  scene.add(rings);
  const marks = landings.map((landing) => ({ x: landing.footX, z: landing.footZ, radius: MARK.radius }));

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

  // Whether a point is inside a house or a monument: the solid part only,
  // also used to keep the camera out of the houses.
  function solid(x, z, r = 0) {
    for (const house of grid.get(cellKey(x, z)) ?? []) {
      const dx = x - house.x;
      const dz = z - house.z;
      if (Math.abs(dx * house.tx + dz * house.tz) < house.along + r && Math.abs(-dx * house.tz + dz * house.tx) < house.across + r) return true;
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
      const d = Math.hypot(boatState.x - landing.footX, boatState.z - landing.footZ);
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
    // At a trot the diagonal pairs of legs swing together; at a gallop the
    // forelegs go together and the hind legs together, and the body rocks.
    const speed = Math.abs(state.speed);
    const pace = Math.min(1, speed / RIDE.trot);
    const swing = Math.sin(state.phase) * (0.15 + 0.45 * pace) * Math.min(1, speed * 2);
    const { horse, legs } = figure.userData;
    const gallop = speed > RIDE.gallop;
    legs[0].rotation.x = swing;
    legs[1].rotation.x = gallop ? swing : -swing;
    legs[2].rotation.x = -swing;
    legs[3].rotation.x = gallop ? -swing : swing;
    horse.position.y = Math.abs(Math.sin(state.phase)) * (gallop ? 0.12 : 0.06) * pace;
    horse.rotation.x = gallop ? Math.sin(state.phase) * 0.05 : 0;
  }

  function update(dt, axes) {
    if (!state.on) return;
    state.heading -= axes.steer * RIDE.turn * dt;
    const wanted = axes.throttle >= 0 ? axes.throttle * RIDE.speed : axes.throttle * RIDE.back;
    // Speeding up in the way it is already going takes a while; easing off,
    // or turning about, slows it at the braking rate.
    const faster = Math.abs(wanted) > Math.abs(state.speed) && (state.speed === 0 || Math.sign(wanted) === Math.sign(state.speed));
    const rate = (faster ? RIDE.accel : RIDE.brake) * dt;
    state.speed += Math.max(-rate, Math.min(rate, wanted - state.speed));
    const step = state.speed * dt;
    // Against a house, the wall or the river it does not stop dead: it turns
    // aside as little as it must and runs on along the obstacle, slower the
    // more head-on it came. Only square on does it pull up.
    let moved = step === 0;
    for (const turn of SLIDE) {
      if (moved) break;
      const angle = state.heading + turn;
      const reach = step * Math.sqrt(Math.cos(turn));
      const mx = Math.sin(angle) * reach;
      const mz = Math.cos(angle) * reach;
      if (!blocked(state.x + mx, state.z + mz, state.x, state.z)) {
        state.x += mx;
        state.z += mz;
        moved = true;
        // And the horse comes round to run along it, so it faces where it goes.
        state.heading += turn * Math.min(1, dt * 4);
      }
    }
    if (!moved) state.speed *= 0.5;
    const ground = deckAt(state.x, state.z) ?? BANK.height;
    state.y += (ground - state.y) * Math.min(1, dt * 12);
    // Strides lengthen at speed, so their rate grows more slowly than the speed.
    state.phase += (1.2 + Math.min(Math.abs(state.speed), RIDE.trot) * 1.1 + Math.max(0, Math.abs(state.speed) - RIDE.trot) * 0.35) * dt * Math.min(1, Math.abs(state.speed) * 2);
    place();
  }

  return { state, figure, landings, update, nearestFoot, nearestTop, goAshore, goAboard, blocked, solid, marks };
}
