import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RIVER, BANK, PRETIL, COLORS, yawTowards } from './config.js';
import { createSurface } from './materials.js';
import { createInstances } from './instancing.js';

// The five stone bridges as they stood around 1700. Each has its own number
// and shape of arches, width of deck, cutwaters and furniture; what is
// documented and what is guessed is set out in docs/sources.md. Each one
// stands where it stood and keeps its real line, which crosses the river on
// the skew: its length is whatever that line measures from bank to bank.

const BED = RIVER.width + BANK.slopeRun * 2 + 4; // parapet to parapet, and two metres into each bank
const DECK_TOP = 8.5; // at the crown of the deck
const PIER = 3;
const ARCH = { spring: 2, rise: 4.5 };
const CROWN = { segmental: 1, pointed: 1.12, flatPointed: 0.9 }; // how far over its rise each shape of arch peaks
const COVER = 1; // stone kept over the crown of an arch
const PARAPET = { height: 1.05, thickness: 0.5 }; // a hair under the riverside parapet it meets
const STREET = PRETIL.offset + PRETIL.thickness; // from the river's centreline to where the street starts
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
  // Its track on the far bank stops short of the walls of the monastery.
  trinitat: { arches: 10, width: 10.4, arch: 'pointed', caps: true, stairPiers: [3, 7], farTrack: 33 },
  // Nine arches in 1700 (ten today), a level deck, the shrines of the two
  // Vicents and stone balls on the parapet.
  real: { arches: 9, width: 10.5, arch: 'segmental', shrinePier: 2, stairPiers: [6], balls: true },
  // Very flat pointed arches under a humped deck, big cutwaters, balls, and
  // the shrines of the Cross and of Sant Pasqual.
  mar: { arches: 10, width: 8.35, arch: 'flatPointed', hump: 1.6, shrinePier: 3, balls: true },
};
const FALLBACK = { arches: 10, width: 9, arch: 'segmental' };

// How far from (x, z) along the deck towards `side`, on a line `aside` metres
// off its axis, the bridge gets `lateral` metres from the river's centreline.
function reachOf(path, x, z, ax, az, side, aside, lateral) {
  const px = x - az * aside;
  const pz = z + ax * aside;
  const out = (d) => Math.abs(path.project(px + ax * side * d, pz + az * side * d).lateral) >= lateral;
  let d = 0;
  while (d < BED && !out(d)) d += 0.5;
  while (d > 0 && out(d - 0.05)) d -= 0.05;
  return d;
}

// The shape of a bridge and where it stands: the middle of its deck (x, z),
// the unit vector along it towards the city (ax, az) and its length.
const specs = new Map();
function specOf(bridge, path) {
  if (specs.has(bridge)) return specs.get(bridge);
  const shape = BRIDGES[bridge.id] ?? FALLBACK;
  const [ax, az] = bridge.axis;
  // The banks curve, so each half is walked out to its own bank.
  const reach = (side) => {
    let d = 0;
    while (d < BED && Math.abs(path.project(bridge.x + ax * side * d, bridge.z + az * side * d).lateral) < BED / 2) d += 0.5;
    return d;
  };
  const city = reach(1);
  const far = reach(-1);
  const { sample } = path.project(bridge.x, bridge.z);
  const cos = ax * sample.rx + az * sample.rz;
  const spec = {
    ...shape,
    x: bridge.x + (ax * (city - far)) / 2,
    z: bridge.z + (az * (city - far)) / 2,
    ax,
    az,
    // The end is cut square to the deck, not to the bank: long enough for its short corner to come ashore too.
    span: city + far + (shape.width * Math.sqrt(1 - cos * cos)) / cos,
  };
  // The street meets the deck on the skew. `landing` is where the first
  // edge of the deck reaches it at each end (1 the city, -1 the far bank):
  // the deck is down to street level from there on and buried after.
  // `parapetEnd` is where each parapet (by side across the deck) reaches it.
  const edge = shape.width / 2 - PARAPET.thickness / 2;
  const street = (end, aside) => reachOf(path, spec.x, spec.z, ax, az, end, aside, STREET);
  spec.landing = {};
  spec.parapetEnd = {};
  for (const end of [1, -1]) {
    spec.landing[end] = Math.min(street(end, shape.width / 2), street(end, -shape.width / 2));
    spec.parapetEnd[end] = { [1]: street(end, edge), [-1]: street(end, -edge) };
  }
  specs.set(bridge, spec);
  return spec;
}
const openingOf = (spec) => (spec.span - PIER * (spec.arches + 1)) / spec.arches;
const archCentre = (spec, i) => -spec.span / 2 + PIER + openingOf(spec) / 2 + i * (openingOf(spec) + PIER);
// Position along the deck of a pier counted from the city bank, which is at +span / 2.
const pierFromCity = (spec, n) => spec.span / 2 - PIER / 2 - n * (openingOf(spec) + PIER);
// The deck is hog-backed, as these bridges are: level with the street where
// it comes ashore and rising in a shallow curve to the middle, so that none
// of them needs a ramp. `hump` raises the crown further. Past its landing it
// sinks a few centimetres under the street, so the two never flicker.
const LANDED = BANK.height - 0.05;
const deckHeight = (spec, x) => {
  const t = Math.min(1, Math.abs(x) / spec.landing[x > 0 ? 1 : -1]);
  return LANDED + (DECK_TOP + (spec.hump ?? 0) - LANDED) * (1 - t * t);
};
// The arches by the banks pay for it: they are lower, to keep stone over them.
const riseOf = (spec, i) =>
  Math.min(ARCH.rise, (deckHeight(spec, archCentre(spec, i)) - ARCH.spring - COVER) / CROWN[spec.arch]);

function createBridgeGeometry(spec) {
  const { span } = spec;
  const half = span / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-half, FOOT);
  // Level past each landing, curved between them.
  const from = -spec.landing[-1];
  const to = spec.landing[1];
  outline.lineTo(-half, LANDED);
  for (let k = 0; k <= 24; k++) outline.lineTo(from + ((to - from) * k) / 24, deckHeight(spec, from + ((to - from) * k) / 24));
  outline.lineTo(half, LANDED);
  outline.lineTo(half, FOOT);
  outline.closePath();

  const opening = openingOf(spec);
  const a = opening / 2;
  for (let i = 0; i < spec.arches; i++) {
    const centre = archCentre(spec, i);
    const rise = riseOf(spec, i);
    const hole = new THREE.Path();
    hole.moveTo(centre - a, FOOT + 0.5);
    hole.lineTo(centre - a, ARCH.spring);
    if (spec.arch === 'pointed') {
      hole.quadraticCurveTo(centre - a * 0.9, ARCH.spring + rise * 0.95, centre, ARCH.spring + rise * 1.12);
      hole.quadraticCurveTo(centre + a * 0.9, ARCH.spring + rise * 0.95, centre + a, ARCH.spring);
    } else if (spec.arch === 'flatPointed') {
      hole.quadraticCurveTo(centre - a * 0.7, ARCH.spring + rise * 0.8, centre, ARCH.spring + rise * 0.9);
      hole.quadraticCurveTo(centre + a * 0.7, ARCH.spring + rise * 0.8, centre + a, ARCH.spring);
    } else {
      hole.absellipse(centre, ARCH.spring, a, rise, Math.PI, 0, true);
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

// A flat strip along a line of points, `width` across: a number, or a
// function of how far along the line (0 to 1) for a strip that narrows.
function trackGeometry(points, width, lift) {
  const positions = [];
  const index = [];
  points.forEach((point, i) => {
    const across = typeof width === 'function' ? width(i / (points.length - 1)) : width;
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const length = Math.hypot(dx, dz) || 1;
    const px = (-dz / length) * (across / 2);
    const pz = (dx / length) * (across / 2);
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
    const spec = specOf(bridge, path);
    const { arches, width, span } = spec;
    const model = new THREE.Group();
    model.position.set(spec.x, 0, spec.z);
    model.rotation.y = yawTowards(spec.ax, spec.az);
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
    // A run along the deck, in short straight lengths that follow its curve.
    const along = (from, to, z, lift, height, thickness) => {
      const count = Math.max(1, Math.round((to - from) / 6));
      return Array.from({ length: count }, (_, k) => {
        const a = from + ((to - from) * k) / count;
        const b = from + ((to - from) * (k + 1)) / count;
        const ya = deckHeight(spec, a);
        const yb = deckHeight(spec, b);
        return new THREE.BoxGeometry(Math.hypot(b - a, yb - ya) + 0.05, height, thickness)
          .rotateZ(Math.atan2(yb - ya, b - a))
          .translate((a + b) / 2, (ya + yb) / 2 + lift, z);
      });
    };
    piece(mergeGeometries(along(-span / 2, span / 2, 0, -0.83, 0.35, width + 0.5)), stone, 0, 0, 0);

    // Parapets. Each one stops where it reaches the street, against the end
    // of the riverside parapet; on the skew the two sides stop at different places.
    const edge = width / 2 - PARAPET.thickness / 2;
    for (const side of [-1, 1]) {
      const from = -spec.parapetEnd[-1][side];
      const to = spec.parapetEnd[1][side];
      if (spec.refuges) {
        // Broken at every pier, where the deck opens into the refuge, and
        // carried round the point of the cutwater. Solid over the abutments.
        const walls = [];
        const a = openingOf(spec) / 2;
        const runs = [[from, archCentre(spec, 0) - a], [archCentre(spec, arches - 1) + a, to]];
        for (let i = 0; i < arches; i++) runs.push([archCentre(spec, i) - a, archCentre(spec, i) + a]);
        for (const [start, end] of runs) {
          const lo = Math.max(start, from);
          const hi = Math.min(end, to);
          if (hi > lo) walls.push(...along(lo, hi, side * edge, PARAPET.height / 2, PARAPET.height, PARAPET.thickness));
        }
        for (let i = 1; i < arches; i++) {
          const x = -span / 2 + PIER / 2 + i * (openingOf(spec) + PIER);
          for (const k of [-1, 1]) {
            walls.push(
              new THREE.BoxGeometry(Math.hypot(PIER / 2, CUTWATER.reach) + PARAPET.thickness, PARAPET.height, PARAPET.thickness)
                .rotateY(Math.atan2(-side * CUTWATER.reach, (-k * PIER) / 2))
                .translate(x + (k * PIER) / 4, deckHeight(spec, x) + PARAPET.height / 2, side * (width / 2 + CUTWATER.reach / 2)),
            );
          }
        }
        piece(mergeGeometries(walls), stone, 0, 0, 0);
      } else {
        piece(mergeGeometries(along(from, to, side * edge, PARAPET.height / 2, PARAPET.height, PARAPET.thickness)), stone, 0, 0, 0);
      }
      if (spec.balls) {
        for (let i = 0; i <= arches; i++) {
          const x = -span / 2 + PIER / 2 + i * (openingOf(spec) + PIER);
          if (x < from || x > to) continue;
          stamp(balls, x, deckHeight(spec, x) + PARAPET.height + 0.3, side * edge);
        }
      }
    }

    // Archivolt on each face. It is proud of the stone and follows the same
    // curve as the opening, so the span, the crown and the passage stay put.
    {
      const a = openingOf(spec) / 2;
      for (let i = 0; i < arches; i++) {
        const centre = archCentre(spec, i);
        for (const side of [-1, 1]) {
          stamp(rings[spec.arch], centre, ARCH.spring, side * (width / 2 + 0.05), [a, riseOf(spec, i), 1], side < 0 ? Math.PI : 0);
        }
      }
    }

    // Cutwaters on every pier. On the Serrans they rise to the deck as
    // refuges, a hair under it so the two tops do not fight; on the Trinitat
    // they end in stepped caps.
    const cutwater = createCutwaterGeometry(width, CUTWATER.top);
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
    // The two end piers are abutments in the banks: no cutwater there.
    for (let i = 1; i < arches; i++) {
      const x = -span / 2 + PIER / 2 + i * (openingOf(spec) + PIER);
      piece(spec.refuges ? createCutwaterGeometry(width, deckHeight(spec, x) - 0.02) : cutwater, stone, x, 0, 0);
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
      const x = pierFromCity(spec, spec.shrinePier);
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
      const x = pierFromCity(spec, spec.statuePier);
      const top = deckHeight(spec, x);
      for (const side of [-1, 1]) {
        const z = side * (width / 2 + 1.3);
        piece(new THREE.BoxGeometry(PIER, top + 1.4 - CUTWATER.top, 2.2), stone, x, (top + 1.4 + CUTWATER.top) / 2, z);
        piece(statueBody, marble, x, top + 2.4, z);
        piece(statueHead, marble, x, top + 3.48, z);
      }
    }
    group.add(model);

    // A beaten track from the end of the deck to the gate the bridge is for.
    // It leaves along the bridge and reaches the gate square on: straight
    // where the gate looks along its bridge, bent where it stands elsewhere.
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
      const outward = Math.sign(nx * (spec.x - gx) + nz * (spec.z - gz)) || 1;
      [nx, nz] = gate.facing ?? [(nx * outward) / length, (nz * outward) / length];
      const reach = spec.landing[1]; // from where the first edge of the deck reaches the street
      const sx = spec.x + spec.ax * reach;
      const sz = spec.z + spec.az * reach;
      const lead = Math.min(30, Math.hypot(gx - sx, gz - sz) * 0.3);
      const y = BANK.height + 0.05;
      const line = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(sx, y, sz),
          new THREE.Vector3(sx + spec.ax * lead, y, sz + spec.az * lead),
          new THREE.Vector3(gx + nx * lead, y, gz + nz * lead),
          new THREE.Vector3(gx + nx * 2, y, gz + nz * 2),
        ],
        false,
        'centripetal',
      ).getSpacedPoints(Math.max(8, Math.ceil(Math.hypot(gx - sx, gz - sz) / 6)));
      // A worn verge underneath, a little wider, takes the edge off. Being
      // wider it starts further on, where both its edges have reached the street.
      const verge = [...line];
      const ahead = Math.max(...[1, -1].map((k) => reachOf(path, spec.x, spec.z, spec.ax, spec.az, 1, k * (width / 2 + 1.7), STREET))) - reach;
      verge[0] = line[0].clone().addScaledVector(new THREE.Vector3(spec.ax, 0, spec.az), Math.min(ahead, line[0].distanceTo(line[1]) * 0.9));
      verges.push(trackGeometry(verge, width + 3.4, -0.03));
      tracks.push(trackGeometry(line, width, 0));
    }

    // On the far bank the track runs straight on into the fields, narrowing
    // until it is lost in them. Where each one led is not modelled.
    {
      const reach = spec.landing[-1];
      const y = BANK.height + 0.05;
      const step = (spec.farTrack ?? 90) / 15;
      const line = Array.from({ length: 16 }, (_, k) => new THREE.Vector3(spec.x - spec.ax * (reach + k * step), y, spec.z - spec.az * (reach + k * step)));
      const ahead = Math.max(...[1, -1].map((k) => reachOf(path, spec.x, spec.z, spec.ax, spec.az, -1, k * (width / 2 + 1.7), STREET))) - reach;
      const verge = [line[0].clone().addScaledVector(new THREE.Vector3(-spec.ax, 0, -spec.az), Math.min(ahead, step * 0.9)), ...line.slice(1)];
      const fading = (base) => (t) => base * Math.min(1, (1 - t) / 0.5);
      verges.push(trackGeometry(verge, fading(width + 3.4), -0.03));
      tracks.push(trackGeometry(line, fading(width), 0));
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

// The walkable top of each bridge, for whatever crosses it or stands by it:
// the middle of the deck, the unit vector along it towards the city (rx, rz),
// the deck height along it, and how far down the river it meets each bank.
export function bridgeDecks(layout, path) {
  return layout.bridges.map((bridge) => {
    const spec = specOf(bridge, path);
    const { x, z, ax, az, span } = spec;
    // Where its axis crosses the middle of the riverside parapet.
    const bankStation = (side) => {
      const d = reachOf(path, x, z, ax, az, side, 0, PRETIL.offset + PRETIL.thickness / 2);
      return path.project(x + ax * side * d, z + az * side * d).s;
    };
    return {
      id: bridge.id,
      x,
      z,
      rx: ax,
      rz: az,
      half: span / 2,
      width: spec.width,
      heightAt: (u) => deckHeight(spec, u),
      cityStation: bankStation(1),
      farStation: bankStation(-1),
    };
  });
}

// Keeps boats out of the stonework. From some way off it eases a boat
// towards the nearest arch, so that by the time it reaches the bridge it is
// inside an opening; it also says how close the bridge is, from 0 to 1.
// The bridges are skewed, so the boat is placed along and across the bridge
// itself, not along the river.
export function createBridgeGuide(layout, path) {
  const FUNNEL = 38; // metres before and after the bridge where it acts
  const CLEARANCE = 1.5; // kept between the boat's middle and the pier
  const bridges = layout.bridges.map((bridge) => {
    const spec = specOf(bridge, path);
    // Every arch lets a boat through, the lower ones by the banks too.
    return {
      spec,
      s: path.project(spec.x, spec.z).s,
      centres: Array.from({ length: spec.arches }, (_, i) => archCentre(spec, i)),
      room: openingOf(spec) / 2 - CLEARANCE,
    };
  });

  return function constrain(s, lateral) {
    let closeness = 0;
    let corrected = lateral;
    for (const bridge of bridges) {
      if (Math.abs(s - bridge.s) > FUNNEL + BED) continue; // nowhere near: spare the sums
      const { x, z, ax, az } = bridge.spec;
      const point = path.pointAt(s);
      const dx = point.x + point.rx * lateral - x;
      const dz = point.z + point.rz * lateral - z;
      const gap = Math.abs(dz * ax - dx * az);
      if (gap >= FUNNEL) continue;
      closeness = 1 - gap / FUNNEL;
      const along = dx * ax + dz * az;
      const centre = bridge.centres.reduce((best, c) => (Math.abs(c - along) < Math.abs(best - along) ? c : best));
      // Fully narrowed over the last third of the approach.
      const squeeze = THREE.MathUtils.smoothstep(closeness, 0, 0.66);
      const room = THREE.MathUtils.lerp(RIVER.width, bridge.room, squeeze);
      // Sliding the boat across the river moves it along the bridge by the cosine of the skew.
      corrected = lateral + (THREE.MathUtils.clamp(along, centre - room, centre + room) - along) / (point.rx * ax + point.rz * az);
    }
    return { lateral: corrected, closeness };
  };
}
