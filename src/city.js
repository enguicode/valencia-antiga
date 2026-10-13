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
        houseCells.get(key).push({ x, z, radius });

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

  // The streets, worn paler into the floor: soft strokes on one transparent
  // drawing laid over it, and only where houses line them. The plan's open
  // yards and orchards trace as tangles of alleys that must not show.
  const SCALE = 2048 / Math.max(spanX, spanZ); // pixels per metre
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(spanX * SCALE);
  canvas.height = Math.ceil(spanZ * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(228, 210, 168, 0.24)';
  const lined = (x, z) =>
    neighbours(x, z).filter((h) => Math.hypot(x - h.x, z - h.z) < 13).length > 1 &&
    !clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius - 8);
  for (const width of [8, 6, 4.4, 3]) {
    // a wide faint pass under narrower ones: the edge fades instead of cutting
    ctx.lineWidth = width * SCALE;
    ctx.beginPath();
    for (const street of streets) {
      let drawing = false;
      // a point every 5 m or less, so a long straight stops where its houses do
      const points = street.flatMap(([x, z], i) => {
        if (!i) return [[x, z]];
        const [px, pz] = street[i - 1];
        const steps = Math.ceil(Math.hypot(x - px, z - pz) / 5);
        return Array.from({ length: steps }, (_, k) => [px + ((x - px) * (k + 1)) / steps, pz + ((z - pz) * (k + 1)) / steps]);
      });
      for (const [x, z] of points) {
        if (!lined(x, z)) drawing = false;
        else if (drawing) ctx.lineTo((x - minX) * SCALE, (z - minZ) * SCALE);
        else {
          ctx.moveTo((x - minX) * SCALE, (z - minZ) * SCALE);
          drawing = true;
        }
      }
    }
    ctx.stroke();
  }
  const worn = new THREE.CanvasTexture(canvas);
  worn.colorSpace = THREE.SRGBColorSpace;
  const streetsMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(spanX, spanZ),
    new THREE.MeshStandardMaterial({ map: worn, transparent: true, depthWrite: false, roughness: 1 }),
  );
  streetsMesh.rotation.x = -Math.PI / 2;
  streetsMesh.position.set(minX + spanX / 2, BANK.height + 0.07, minZ + spanZ / 2);

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
    streetsMesh,
    createInstances(new THREE.BoxGeometry(1, 1, 1), facades, bodies),
    createInstances(roofGeometry, createSurface('tiles', 3), roofs),
  );
  group.userData.chimneys = chimneys;
  group.userData.facades = facades;
  return group;
}
