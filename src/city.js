import * as THREE from 'three';
import { BANK, COLORS, createRandom, yawTowards } from './config.js';
import { createInstances } from './instancing.js';
import { landmarkClearings } from './landmarks.js';
import { TEXTURES, createSurface } from './materials.js';

// Generic houses filling the walled city, in rows along both sides of every
// street. The streets are traced from Tosca's plan of 1704 (data/streets.json,
// scripts/trace-tosca.py); the houses are placeholders for volume.

const STREET_HALF = 2.2; // from the middle of a street to the house fronts
const WALL_CLEARANCE = 14;
const CELL = 24;
// The great gates stand well inside the line of the wall, with their stairs
// and halls: each keeps an open square behind it. The lesser ones keep a
// smaller one, so the way in is not shut by a house.
const GATE_SQUARE = { inset: 16, radius: 32, lesser: 20 };

function isInside(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToSegment(x, z, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

function distanceToEdges(x, z, polygon) {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    best = Math.min(best, distanceToSegment(x, z, ...polygon[j], ...polygon[i]));
  }
  return best;
}

const cellOf = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

export function createCity(layout, streets) {
  const polygon = layout.wall;
  const xs = polygon.map(([x]) => x);
  const zs = polygon.map(([, z]) => z);
  const minX = Math.min(...xs);
  const minZ = Math.min(...zs);
  const spanX = Math.max(...xs) - minX;
  const spanZ = Math.max(...zs) - minZ;

  const roofGeometry = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  roofGeometry.rotateY(Math.PI / 4);
  const bodies = [];
  const roofs = [];
  const chimneys = [];

  const clearings = landmarkClearings(layout);
  const centreX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const centreZ = zs.reduce((sum, z) => sum + z, 0) / zs.length;
  const squares = layout.gates
    .map((gate) => {
      const [x, z] = polygon[gate.vertex];
      const reach = Math.hypot(centreX - x, centreZ - z);
      return {
        x: x + ((centreX - x) / reach) * GATE_SQUARE.inset,
        z: z + ((centreZ - z) / reach) * GATE_SQUARE.inset,
        radius: gate.major ? GATE_SQUARE.radius : GATE_SQUARE.lesser,
      };
    });
  const random = createRandom(1356);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const dummy = new THREE.Object3D();

  // Every stretch of street, indexed by the cells it comes within reach of,
  // so a house can tell whether it would stand on one.
  const REACH = 12;
  const stretches = streets.flatMap((street) => street.slice(1).map((end, i) => [...street[i], ...end]));
  const streetCells = new Map();
  for (const stretch of stretches) {
    const [ax, az, bx, bz] = stretch;
    for (let x = Math.min(ax, bx) - REACH; x <= Math.max(ax, bx) + REACH + CELL; x += CELL) {
      for (let z = Math.min(az, bz) - REACH; z <= Math.max(az, bz) + REACH + CELL; z += CELL) {
        const key = cellOf(x, z);
        if (!streetCells.has(key)) streetCells.set(key, new Set());
        streetCells.get(key).add(stretch);
      }
    }
  }
  const houseCells = new Map();
  const neighbours = (x, z) => {
    const found = [];
    for (const dx of [-CELL, 0, CELL]) for (const dz of [-CELL, 0, CELL]) found.push(...(houseCells.get(cellOf(x + dx, z + dz)) ?? []));
    return found;
  };

  const plots = [];
  let placed = 0;
  for (const street of streets) {
    // Houses follow the whole street, not each stretch of it: the bends are
    // short and a row must carry on round them.
    const marks = [0];
    for (let i = 1; i < street.length; i++) marks.push(marks[i - 1] + Math.hypot(street[i][0] - street[i - 1][0], street[i][1] - street[i - 1][1]));
    const length = marks.at(-1);
    const at = (d) => {
      let i = 1;
      while (i < street.length - 1 && marks[i] < d) i++;
      const [ax, az] = street[i - 1];
      const [bx, bz] = street[i];
      const run = marks[i] - marks[i - 1] || 1;
      const t = (d - marks[i - 1]) / run;
      return [ax + (bx - ax) * t, az + (bz - az) * t, (bx - ax) / run, (bz - az) / run];
    };
    for (const side of [-1, 1]) {
      for (let along = random() * 2; along < length; ) {
        const width = 6.5 + random() * 6;
        const depth = 8 + random() * 6;
        const height = 7 + random() * 8;
        const roofHeight = 2 + random() * 1.5;
        const from = along;
        along += width + (random() < 0.12 ? random() * 3 : 0);
        if (from + width > length + 1) break;

        const [px, pz, tx, tz] = at(from + width / 2);
        const off = side * (STREET_HALF + depth / 2);
        const x = px - tz * off;
        const z = pz + tx * off;
        const radius = Math.min(width, depth) * 0.48;
        if (!isInside(x, z, polygon) || distanceToEdges(x, z, polygon) < WALL_CLEARANCE) continue;
        if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;
        if (squares.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;
        // not on another street, nor into a house already standing
        const clear = STREET_HALF + depth / 2 - 0.3;
        if ([...(streetCells.get(cellOf(x, z)) ?? [])].some((s) => distanceToSegment(x, z, ...s) < clear)) continue;
        if (neighbours(x, z).some((h) => Math.hypot(x - h.x, z - h.z) < radius + h.radius)) continue;
        const key = cellOf(x, z);
        if (!houseCells.has(key)) houseCells.set(key, []);
        const self = { x, z, radius };
        houseCells.get(key).push(self);
        plots.push({ x, z, tx, tz, width, depth, side, self });

        dummy.rotation.set(0, yawTowards(tx, tz), 0);
        dummy.position.set(x, BANK.height + height / 2, z);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        bodies.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(pick(COLORS.houseWalls)) });

        dummy.position.set(x, BANK.height + height + roofHeight / 2, z);
        dummy.scale.set(width * 1.08, roofHeight, depth * 1.08);
        dummy.updateMatrix();
        roofs.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(pick(COLORS.roofs)) });

        if (placed++ % 45 === 0) chimneys.push({ x, y: BANK.height + height + roofHeight, z });
      }
    }
  }
  if (new URLSearchParams(location.search).has('debug')) console.info(`houses: ${placed}`);

  // Streets as in the old city builders: a paved piece with its own texture
  // and a hard edge, laid from house front to house front, and a walled yard
  // behind every house (bare soil or kitchen garden, as far back as it can go
  // without stepping on another street or house). Yards and their gardens are
  // invented. A street is paved only where houses line it: the plan's open
  // yards and orchards trace as tangles of alleys that must not show.
  const lined = (x, z) => neighbours(x, z).filter((h) => Math.hypot(x - h.x, z - h.z) < 13).length > 1;
  const strip = [];
  for (const street of streets) {
    // a point every 5 m or less, so a long straight stops where its houses do
    const points = street.flatMap(([x, z], i) => {
      if (!i) return [[x, z]];
      const [bx, bz] = street[i - 1];
      const steps = Math.ceil(Math.hypot(x - bx, z - bz) / 5);
      return Array.from({ length: steps }, (_, k) => [bx + ((x - bx) * (k + 1)) / steps, bz + ((z - bz) * (k + 1)) / steps]);
    });
    const edges = points.map(([x, z], i) => {
      const [bx, bz] = points[Math.max(0, i - 1)];
      const [ax, az] = points[Math.min(points.length - 1, i + 1)];
      const run = Math.hypot(ax - bx, az - bz) || 1;
      const nx = (-(az - bz) / run) * STREET_HALF;
      const nz = ((ax - bx) / run) * STREET_HALF;
      return lined(x, z) && [x + nx, z + nz, x - nx, z - nz];
    });
    for (let i = 1; i < edges.length; i++) {
      const [a, b] = [edges[i - 1], edges[i]];
      if (!a || !b) continue;
      for (const [x, z] of [[a[0], a[1]], [a[2], a[3]], [b[0], b[1]], [b[0], b[1]], [a[2], a[3]], [b[2], b[3]]]) strip.push(x, BANK.height + 0.1, z);
    }
  }
  const paving = new THREE.BufferGeometry();
  paving.setAttribute('position', new THREE.Float32BufferAttribute(strip, 3));
  paving.computeVertexNormals();
  const streetsMesh = new THREE.Mesh(paving, createSurface('masonry', 2.4, { color: 0xb9b2a2, side: THREE.DoubleSide }));

  const SCALE = 2048 / Math.max(spanX, spanZ); // pixels per metre
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(spanX * SCALE);
  canvas.height = Math.ceil(spanZ * SCALE);
  const ctx = canvas.getContext('2d');
  const px = (x) => (x - minX) * SCALE;
  const pz = (z) => (z - minZ) * SCALE;
  const free = (x, z, self) =>
    isInside(x, z, polygon) &&
    distanceToEdges(x, z, polygon) > WALL_CLEARANCE - 4 &&
    !clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius) &&
    !squares.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius) &&
    ![...(streetCells.get(cellOf(x, z)) ?? [])].some((st) => distanceToSegment(x, z, ...st) < STREET_HALF + 0.5) &&
    !neighbours(x, z).some((h) => h !== self && Math.hypot(x - h.x, z - h.z) < h.radius);
  const yards = [];
  for (const { x, z, tx, tz, width, depth, side, self } of plots) {
    const back = [14, 10, 6].find((reach) =>
      [0.5, 1].every((part) =>
        [-0.45, 0, 0.45].every((across) => {
          const out = side * (depth / 2 + reach * part);
          return free(x - tz * out + tx * width * across, z + tx * out + tz * width * across, self);
        }),
      ),
    );
    if (!back) continue;
    const garden = random() < 0.35;
    ctx.save();
    ctx.translate(px(x), pz(z));
    ctx.rotate(Math.atan2(tz, tx));
    ctx.fillStyle = garden ? 'rgb(106, 120, 72)' : 'rgb(138, 122, 88)';
    ctx.fillRect((-width / 2) * SCALE, Math.min(0, side * (depth / 2 + back)) * SCALE, width * SCALE, (depth / 2 + back) * SCALE);
    ctx.restore();

    const out = side * (depth / 2 + back / 2);
    dummy.rotation.set(0, yawTowards(tx, tz), 0);
    dummy.position.set(x - tz * out, BANK.height, z + tx * out);
    dummy.scale.set(width, 2 + random() * 0.8, back);
    dummy.updateMatrix();
    yards.push({ matrix: dummy.matrix.clone() });
  }
  const ground = new THREE.CanvasTexture(canvas);
  ground.colorSpace = THREE.SRGBColorSpace;
  const yardsMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(spanX, spanZ),
    new THREE.MeshStandardMaterial({ map: ground, transparent: true, depthWrite: false, roughness: 1 }),
  );
  yardsMesh.rotation.x = -Math.PI / 2;
  yardsMesh.position.set(minX + spanX / 2, BANK.height + 0.07, minZ + spanZ / 2);
  // the yard wall: a box without top or bottom
  const fence = new THREE.BoxGeometry(1, 1, 1);
  fence.setIndex([...fence.index.array].filter((_, i) => i < 12 || i >= 24));
  fence.translate(0, 0.5, 0);

  // The river banks only reach so far inland, so the city gets its own floor.
  const floor = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x, -z)))),
    createSurface('mottle', 9, { color: 0xb8a67e, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = BANK.height + 0.04; // just over the river bank's ground, which it overlaps

  // House fronts use ordinary UVs: one drawing of windows and a door per wall.
  // A second drawing lights some of those windows; it is faded in at night.
  const facades = new THREE.MeshStandardMaterial({
    map: TEXTURES.facade,
    emissive: 0xffffff,
    emissiveMap: TEXTURES.facadeGlow,
    emissiveIntensity: 0,
    roughness: 0.95,
  });
  const group = new THREE.Group();
  group.add(
    floor,
    yardsMesh,
    streetsMesh,
    createInstances(fence, createSurface('tapial', 3, { color: 0xdccdaa, side: THREE.DoubleSide }), yards),
    createInstances(new THREE.BoxGeometry(1, 1, 1), facades, bodies),
    createInstances(roofGeometry, createSurface('tiles', 3), roofs),
  );
  group.userData.chimneys = chimneys;
  group.userData.facades = facades;
  return group;
}
