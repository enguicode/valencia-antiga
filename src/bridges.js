import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RIVER, BANK, COLORS, yawTowards } from './config.js';
import { createSurface } from './materials.js';
import { createInstances } from './instancing.js';

// The five stone bridges as they stood around 1700. Each has its own number
// and shape of arches, width of deck, cutwaters and furniture; what is
// documented and what is guessed is set out in docs/sources.md. They all
// cross at right angles to the river and span the same width, which is a
// simplification: the real ones were between 148 and 171 m long. For the
// same reason four of them sit a little upstream of where they stood, so
// that each one lands in front of its gate.

const SPAN = RIVER.width + BANK.slopeRun * 2 + 4;
const DECK_TOP = 8.5;
const RAMP = 14;
const PIER = 3;
const ARCH = { spring: 2, rise: 4.5 };
const PARAPET = { height: 0.9, thickness: 0.5 };
const FOOT = -3;
const CUTWATER = { reach: 3.2, top: 4.6 };

// `shrinePier` and `stairPiers` count piers from the city bank.
const BRIDGES = {
  // Thirteen small arches and a deck barely six metres wide; two marble
  // statues on bare pedestals by the third pier.
  'sant-josep': { arches: 13, width: 6, arch: 'segmental', statuePier: 3 },
  // Cutwaters carried up to the parapet as refuges, and a pair of shrines on
  // the pier nearest the city.
  serrans: { arches: 9, width: 10.9, arch: 'segmental', refuges: true, shrinePier: 1 },
  // Slightly pointed arches, stepped caps on the cutwaters and two stairs
  // down to the river bed on the downstream side.
  trinitat: { arches: 10, width: 10.4, arch: 'pointed', caps: true, stairPiers: [3, 7] },
  // Nine arches in 1700 (ten today), a level deck, the shrines of the two
  // Vicents and stone balls on the parapet.
  real: { arches: 9, width: 10.5, arch: 'segmental', shrinePier: 2, stairPiers: [6], balls: true },
  // Very flat pointed arches under a humped deck, big cutwaters, balls, and
  // the shrines of the Cross and of Sant Pasqual.
  mar: { arches: 10, width: 8.35, arch: 'flatPointed', hump: 1.6, shrinePier: 3, balls: true },
};
const FALLBACK = { arches: 10, width: 9, arch: 'segmental' };

const specOf = (bridge) => BRIDGES[bridge.id] ?? FALLBACK;
const openingOf = (arches) => (SPAN - PIER * (arches + 1)) / arches;
const archCentre = (arches, i) => -SPAN / 2 + PIER + openingOf(arches) / 2 + i * (openingOf(arches) + PIER);
// Lateral position of a pier counted from the city bank, which is at +SPAN / 2.
const pierFromCity = (arches, n) => SPAN / 2 - PIER / 2 - n * (openingOf(arches) + PIER);
const deckHeight = (spec, x) => DECK_TOP + (spec.hump ?? 0) * (1 - Math.abs(x) / (SPAN / 2));

function createBridgeGeometry(spec) {
  const half = SPAN / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-half - RAMP, FOOT);
  outline.lineTo(-half - RAMP, BANK.height - 0.2);
  outline.lineTo(-half, DECK_TOP);
  if (spec.hump) outline.lineTo(0, DECK_TOP + spec.hump);
  outline.lineTo(half, DECK_TOP);
  outline.lineTo(half + RAMP, BANK.height - 0.2);
  outline.lineTo(half + RAMP, FOOT);
  outline.closePath();

  const opening = openingOf(spec.arches);
  const a = opening / 2;
  for (let i = 0; i < spec.arches; i++) {
    const centre = archCentre(spec.arches, i);
    const hole = new THREE.Path();
    hole.moveTo(centre - a, FOOT + 0.5);
    hole.lineTo(centre - a, ARCH.spring);
    if (spec.arch === 'pointed') {
      hole.quadraticCurveTo(centre - a * 0.9, ARCH.spring + ARCH.rise * 0.95, centre, ARCH.spring + ARCH.rise * 1.12);
      hole.quadraticCurveTo(centre + a * 0.9, ARCH.spring + ARCH.rise * 0.95, centre + a, ARCH.spring);
    } else if (spec.arch === 'flatPointed') {
      hole.quadraticCurveTo(centre - a * 0.7, ARCH.spring + ARCH.rise * 0.8, centre, ARCH.spring + ARCH.rise * 0.9);
      hole.quadraticCurveTo(centre + a * 0.7, ARCH.spring + ARCH.rise * 0.8, centre + a, ARCH.spring);
    } else {
      hole.absellipse(centre, ARCH.spring, a, ARCH.rise, Math.PI, 0, true);
    }
    hole.lineTo(centre + a, FOOT + 0.5);
    hole.closePath();
    outline.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(outline, { depth: spec.width, bevelEnabled: false, curveSegments: 16 });
  geometry.translate(0, 0, -spec.width / 2);
  return geometry;
}

// A pier seen from above: its rectangle, drawn out to a point up- and
// downstream so the current parts around it.
function createCutwaterGeometry(width, top) {
  const half = width / 2;
  const plan = new THREE.Shape();
  plan.moveTo(-PIER / 2, -half);
  plan.lineTo(0, -half - CUTWATER.reach);
  plan.lineTo(PIER / 2, -half);
  plan.lineTo(PIER / 2, half);
  plan.lineTo(0, half + CUTWATER.reach);
  plan.lineTo(-PIER / 2, half);
  plan.closePath();
  const geometry = new THREE.ExtrudeGeometry(plan, { depth: top - FOOT, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); // extrude upwards; the plan's y becomes -z
  geometry.translate(0, FOOT, 0);
  return geometry;
}

// A flat archivolt in unit space (half-span 1, rise 1, spring at y = 0).
// The inner edge is the arch itself; the band sits on the face, outside the
// opening, so the clear span and the free height do not change.
function createArchRingGeometry(kind) {
  const band = 0.07;
  const crown = kind === 'pointed' ? 1.12 : kind === 'flatPointed' ? 0.9 : 1;
  // `reverse` walks the same curve the other way. The hole has to wind
  // opposite the outer band or earcut fills the opening solid.
  const trace = (path, scale, reverse) => {
    const s = reverse ? -1 : 1;
    path.moveTo(-s * scale, -0.16);
    path.lineTo(-s * scale, 0);
    if (kind === 'pointed') {
      path.quadraticCurveTo(-s * 0.9 * scale, 0.95 * scale, 0, crown * scale);
      path.quadraticCurveTo(s * 0.9 * scale, 0.95 * scale, s * scale, 0);
    } else if (kind === 'flatPointed') {
      path.quadraticCurveTo(-s * 0.7 * scale, 0.8 * scale, 0, crown * scale);
      path.quadraticCurveTo(s * 0.7 * scale, 0.8 * scale, s * scale, 0);
    } else if (reverse) {
      path.absarc(0, 0, scale, 0, Math.PI, false);
    } else {
      path.absarc(0, 0, scale, Math.PI, 0, true);
    }
    path.lineTo(s * scale, -0.16);
  };
  const shape = new THREE.Shape();
  trace(shape, 1 + band, false);
  shape.closePath();
  const hole = new THREE.Path();
  // Opposite winding to the band, or earcut fills the opening solid.
  trace(hole, 1, true);
  hole.closePath();
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape, 8);
}

// A flat strip along a line of points, `width` across.
function trackGeometry(points, width, lift) {
  const positions = [];
  const index = [];
  points.forEach((point, i) => {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const length = Math.hypot(dx, dz) || 1;
    const px = (-dz / length) * (width / 2);
    const pz = (dx / length) * (width / 2);
    positions.push(point.x + px, point.y + lift, point.z + pz, point.x - px, point.y + lift, point.z - pz);
    if (i) index.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function createBridges(layout, path) {
  // Double-sided, so a camera that strays into the stonework sees stone
  // rather than straight through it.
  const stone = createSurface('masonry', 4, { color: COLORS.stone, side: THREE.DoubleSide });
  const pale = createSurface('masonry', 3, { color: 0xe8dcc0 });
  const tracks = [];
  const verges = [];
  const marble = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 });
  const roof = createSurface('tiles', 1.6, { color: 0x6f8f7a }); // glazed tiles
  const group = new THREE.Group();
  const balls = [];
  const treads = [];
  const rings = { segmental: [], pointed: [], flatPointed: [] };
  const local = new THREE.Object3D();

  const shrineBase = new THREE.CylinderGeometry(1.25, 1.25, 0.5, 3);
  const shrineColumn = new THREE.CylinderGeometry(0.13, 0.13, 2.6, 6);
  const shrineRoof = new THREE.ConeGeometry(1.5, 1.7, 3);
  const body = new THREE.BoxGeometry(0.38, 1.15, 0.28);
  const head = new THREE.BoxGeometry(0.24, 0.26, 0.22);
  const statueBody = new THREE.BoxGeometry(0.5, 1.85, 0.36);
  const statueHead = new THREE.BoxGeometry(0.3, 0.32, 0.26);
  const crossUpright = new THREE.BoxGeometry(0.12, 1.15, 0.12);
  const crossArm = new THREE.BoxGeometry(0.56, 0.12, 0.12);

  for (const bridge of layout.bridges) {
    const spec = specOf(bridge);
    const { arches, width } = spec;
    const { sample } = path.project(bridge.x, bridge.z);
    const model = new THREE.Group();
    model.position.set(sample.x, 0, sample.z);
    model.rotation.y = yawTowards(sample.rx, sample.rz);
    model.updateMatrix();
    const stamp = (list, x, y, z, scale = [1, 1, 1], yaw = 0) => {
      local.position.set(x, y, z);
      local.rotation.set(0, yaw, 0);
      local.scale.set(scale[0], scale[1], scale[2]);
      local.updateMatrix();
      list.push({ matrix: model.matrix.clone().multiply(local.matrix) });
    };
    const piece = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      model.add(mesh);
      return mesh;
    };

    model.add(new THREE.Mesh(createBridgeGeometry(spec), stone));
    if (!spec.hump) piece(new THREE.BoxGeometry(SPAN, 0.35, width + 0.5), stone, 0, DECK_TOP - 1, 0);

    // Parapets: one straight run, or two sloping halves over a humped deck
    const edge = width / 2 - PARAPET.thickness / 2;
    for (const side of [-1, 1]) {
      if (spec.hump) {
        const slope = Math.atan2(spec.hump, SPAN / 2);
        const length = Math.hypot(SPAN / 2, spec.hump);
        for (const end of [-1, 1]) {
          const half = piece(
            new THREE.BoxGeometry(length, PARAPET.height, PARAPET.thickness),
            stone,
            (end * SPAN) / 4,
            DECK_TOP + spec.hump / 2 + PARAPET.height / 2,
            side * edge,
          );
          half.rotation.z = -end * slope;
        }
      } else if (spec.refuges) {
        // Broken at every pier, where the deck opens into the refuge, and
        // carried round the point of the cutwater.
        const wall = (length, x, z, yaw = 0) =>
          new THREE.BoxGeometry(length, PARAPET.height, PARAPET.thickness).rotateY(yaw).translate(x, DECK_TOP + PARAPET.height / 2, z);
        const walls = [];
        for (let i = 0; i < arches; i++) walls.push(wall(openingOf(arches), archCentre(arches, i), side * edge));
        for (let i = 0; i <= arches; i++) {
          const x = -SPAN / 2 + PIER / 2 + i * (openingOf(arches) + PIER);
          for (const k of [-1, 1]) {
            walls.push(
              wall(
                Math.hypot(PIER / 2, CUTWATER.reach) + PARAPET.thickness,
                x + (k * PIER) / 4,
                side * (width / 2 + CUTWATER.reach / 2),
                Math.atan2(-side * CUTWATER.reach, (-k * PIER) / 2),
              ),
            );
          }
        }
        piece(mergeGeometries(walls), stone, 0, 0, 0);
      } else {
        piece(new THREE.BoxGeometry(SPAN, PARAPET.height, PARAPET.thickness), stone, 0, DECK_TOP + PARAPET.height / 2, side * edge);
      }
      if (spec.balls) {
        for (let i = 0; i <= arches; i++) {
          const x = -SPAN / 2 + PIER / 2 + i * (openingOf(arches) + PIER);
          stamp(balls, x, deckHeight(spec, x) + PARAPET.height + 0.3, side * edge);
        }
      }
    }

    // Archivolt on each face. It is proud of the stone and follows the same
    // curve as the opening, so the span, the crown and the passage stay put.
    {
      const a = openingOf(arches) / 2;
      for (let i = 0; i < arches; i++) {
        const centre = archCentre(arches, i);
        for (const side of [-1, 1]) {
          stamp(rings[spec.arch], centre, ARCH.spring, side * (width / 2 + 0.05), [a, ARCH.rise, 1], side < 0 ? Math.PI : 0);
        }
      }
    }

    // Cutwaters on every pier. On the Serrans they rise to the deck as
    // refuges, a hair under it so the two tops do not fight; on the Trinitat
    // they end in stepped caps.
    const cutwaterTop = spec.refuges ? DECK_TOP - 0.02 : CUTWATER.top;
    const cutwater = createCutwaterGeometry(width, cutwaterTop);
    const occupied = new Set([...(spec.stairPiers ?? []), spec.shrinePier, spec.statuePier].filter((n) => n != null));
    let extraPier = null;
    if (!(spec.stairPiers ?? []).length) {
      extraPier = 4;
      while (occupied.has(extraPier) && extraPier < arches) extraPier += 1;
      if (extraPier >= arches) extraPier = null;
    }
    const flights = new Set((spec.stairPiers ?? []).map((n) => arches - n));
    if (extraPier != null) flights.add(arches - extraPier);
    const addFlight = (pierX) => {
      const fromY = deckHeight(spec, pierX);
      const toY = 0.55;
      const run = 10.5;
      const steps = 20;
      for (let s = 0; s < steps; s++) {
        const t = s / (steps - 1);
        // Treads overlap a little so the flight reads as one stair, and they
        // stay downstream of the face: the opening itself is not touched.
        const zStep = run / (steps - 1);
        stamp(treads, pierX, fromY - t * (fromY - toY), -(width / 2 + 0.8 + t * run), [PIER * 0.82, 0.46, zStep + 0.08]);
      }
    };
    for (let i = 0; i <= arches; i++) {
      const x = -SPAN / 2 + PIER / 2 + i * (openingOf(arches) + PIER);
      piece(cutwater, stone, x, 0, 0);
      if (spec.caps) {
        for (const side of [-1, 1]) {
          for (let step = 0; step < 3; step++) {
            const size = 2.2 - step * 0.65;
            piece(new THREE.BoxGeometry(size, 0.6, size), stone, x, CUTWATER.top + 0.3 + step * 0.6, side * (width / 2 + 1.1));
          }
        }
      }
      // Steps down the downstream side. Documented flights stay on their
      // piers; a bridge with none gets one modest flight off the shrines.
      if (flights.has(i)) addFlight(x);
    }

    // Shrines: a facing pair, one on each side of the same pier, each a
    // three-sided canopy on columns with a figure inside.
    if (spec.shrinePier) {
      const x = pierFromCity(arches, spec.shrinePier);
      const base = deckHeight(spec, x);
      for (const side of [-1, 1]) {
        const z = side * (width / 2 + 1.5);
        piece(new THREE.BoxGeometry(PIER, base - CUTWATER.top, 2.6), stone, x, (base + CUTWATER.top) / 2, z);
        piece(shrineBase, pale, x, base + 0.25, z);
        for (let k = 0; k < 3; k++) {
          const angle = (k / 3) * Math.PI * 2;
          piece(shrineColumn, pale, x + Math.sin(angle) * 0.95, base + 1.8, z + Math.cos(angle) * 0.95);
        }
        piece(shrineRoof, roof, x, base + 3.95, z);
        // Pont de la Mar, around 1700: the cross still stood in one shrine
        // (the Virgin replaced it after the lightning of 1709) and Sant
        // Pasqual Bailón in the other. Which bank is which is not recorded.
        if (bridge.id === 'mar' && side > 0) {
          piece(crossUpright, marble, x, base + 1.32, z);
          piece(crossArm, marble, x, base + 1.52, z);
        } else {
          piece(body, marble, x, base + 1.12, z);
          piece(head, marble, x, base + 1.82, z);
        }
      }
    }

    // Two marble statues on plain pedestals, with no canopy
    if (spec.statuePier) {
      const x = pierFromCity(arches, spec.statuePier);
      for (const side of [-1, 1]) {
        const z = side * (width / 2 + 1.3);
        piece(new THREE.BoxGeometry(PIER, DECK_TOP + 1.4 - CUTWATER.top, 2.2), stone, x, (DECK_TOP + 1.4 + CUTWATER.top) / 2, z);
        piece(statueBody, marble, x, DECK_TOP + 2.4, z);
        piece(statueHead, marble, x, DECK_TOP + 3.48, z);
      }
    }
    group.add(model);

    // A beaten track from the foot of the ramp to the gate the bridge is
    // for. It leaves along the bridge and reaches the gate square on, so it
    // bends where the two do not face each other.
    const gate = layout.gates.find((item) => item.id === bridge.id);
    if (gate) {
      const count = layout.wall.length;
      const [gx, gz] = layout.wall[gate.vertex];
      const [ax, az] = layout.wall[(gate.vertex + count - 1) % count];
      const [bx, bz] = layout.wall[(gate.vertex + 1) % count];
      // Out from the gate: across the wall, on the river's side of it.
      let nx = -(bz - az);
      let nz = bx - ax;
      const length = Math.hypot(nx, nz) || 1;
      const outward = Math.sign(nx * (sample.x - gx) + nz * (sample.z - gz)) || 1;
      nx *= outward / length;
      nz *= outward / length;
      const reach = SPAN / 2 + RAMP - 2;
      const sx = sample.x + sample.rx * reach;
      const sz = sample.z + sample.rz * reach;
      const lead = Math.min(30, Math.hypot(gx - sx, gz - sz) * 0.3);
      const y = BANK.height + 0.05;
      const line = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(sx, y, sz),
          new THREE.Vector3(sx + sample.rx * lead, y, sz + sample.rz * lead),
          new THREE.Vector3(gx + nx * lead, y, gz + nz * lead),
          new THREE.Vector3(gx + nx * 2, y, gz + nz * 2),
        ],
        false,
        'centripetal',
      ).getSpacedPoints(Math.max(8, Math.ceil(Math.hypot(gx - sx, gz - sz) / 6)));
      // A worn verge underneath, a little wider, takes the edge off.
      verges.push(trackGeometry(line, width + 3.4, -0.03));
      tracks.push(trackGeometry(line, width, 0));
    }
  }
  if (tracks.length) {
    group.add(
      new THREE.Mesh(mergeGeometries(verges), createSurface('mottle', 4, { color: 0x8f8756 })),
      new THREE.Mesh(mergeGeometries(tracks), createSurface('mottle', 3, { color: 0xc9a873 })),
    );
  }

  group.add(createInstances(new THREE.SphereGeometry(0.42, 12, 9), stone, balls));
  if (treads.length) group.add(createInstances(new THREE.BoxGeometry(1, 1, 1), stone, treads));
  for (const kind of ['segmental', 'pointed', 'flatPointed']) {
    if (rings[kind].length) group.add(createInstances(createArchRingGeometry(kind), stone, rings[kind]));
  }
  return group;
}

// The walkable top of each bridge, for whatever crosses it: a point on the
// river axis, the unit vector across the river and the deck height along it.
export function bridgeDecks(layout, path) {
  return layout.bridges.map((bridge) => {
    const spec = specOf(bridge);
    const { sample } = path.project(bridge.x, bridge.z);
    return { x: sample.x, z: sample.z, rx: sample.rx, rz: sample.rz, half: SPAN / 2, width: spec.width, heightAt: (u) => deckHeight(spec, u) };
  });
}

// Keeps boats out of the stonework. From some way off it eases a boat
// towards the nearest arch, so that by the time it reaches the bridge it is
// inside an opening; it also says how close the bridge is, from 0 to 1.
export function createBridgeGuide(layout, path) {
  const FUNNEL = 38; // metres before and after the bridge where it acts
  const CLEARANCE = 1.5; // kept between the boat's middle and the pier
  const bridges = layout.bridges.map((bridge) => {
    const { arches } = specOf(bridge);
    return {
      s: path.project(bridge.x, bridge.z).s,
      centres: Array.from({ length: arches }, (_, i) => archCentre(arches, i)),
      room: openingOf(arches) / 2 - CLEARANCE,
    };
  });

  return function constrain(s, lateral) {
    let closeness = 0;
    let corrected = lateral;
    for (const bridge of bridges) {
      const gap = Math.abs(s - bridge.s);
      if (gap >= FUNNEL) continue;
      closeness = 1 - gap / FUNNEL;
      const centre = bridge.centres.reduce((best, c) => (Math.abs(c - lateral) < Math.abs(best - lateral) ? c : best));
      // Fully narrowed over the last third of the approach.
      const squeeze = THREE.MathUtils.smoothstep(closeness, 0, 0.66);
      const room = THREE.MathUtils.lerp(RIVER.width, bridge.room, squeeze);
      corrected = THREE.MathUtils.clamp(lateral, centre - room, centre + room);
    }
    return { lateral: corrected, closeness };
  };
}
