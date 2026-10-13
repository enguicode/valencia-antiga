import * as THREE from 'three';
import { BANK, COLORS, createRandom, yawTowards } from './config.js';
import { createInstances } from './instancing.js';
import { landmarkClearings } from './landmarks.js';
import { TEXTURES, createSurface } from './materials.js';

// Generic houses filling the walled city, in rows round every block. The
// blocks, and so the streets and squares between them, are those of Tosca's
// plan of 1704 (data/blocks.json, scripts/trace-tosca.py); the houses are
// placeholders for volume.

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

export function createCity(layout, blocks) {
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

  const houseCells = new Map();
  const neighbours = (x, z) => {
    const found = [];
    for (const dx of [-CELL, 0, CELL]) for (const dz of [-CELL, 0, CELL]) found.push(...(houseCells.get(cellOf(x + dx, z + dz)) ?? []));
    return found;
  };

  let placed = 0;
  for (const [outline, ...enclosed] of blocks) {
    const within = (x, z) => isInside(x, z, outline) && !enclosed.some((square) => isInside(x, z, square));
    // Houses stand shoulder to shoulder along every edge of the block, the
    // outline and the squares inside it, facing the street.
    for (const ring of [outline, ...enclosed]) {
      const edge = [...ring, ring[0]];
      const marks = [0];
      for (let i = 1; i < edge.length; i++) marks.push(marks[i - 1] + Math.hypot(edge[i][0] - edge[i - 1][0], edge[i][1] - edge[i - 1][1]));
      const length = marks.at(-1);
      const at = (d) => {
        let i = 1;
        while (i < edge.length - 1 && marks[i] < d) i++;
        const t = (Math.max(0, Math.min(length, d)) - marks[i - 1]) / (marks[i] - marks[i - 1] || 1);
        return [edge[i - 1][0] + (edge[i][0] - edge[i - 1][0]) * t, edge[i - 1][1] + (edge[i][1] - edge[i - 1][1]) * t];
      };
      for (let along = random() * 2; along < length; ) {
        const width = 6.5 + random() * 6;
        const height = 7 + random() * 8;
        const roofHeight = 2 + random() * 1.5;
        const middle = along + width / 2;
        along += width;
        if (middle + width / 2 > length + 1) break;

        // the outline is traced from pixels and jitters: take the run of the
        // edge over the width of the house, not the stretch it stands on
        const [px, pz] = at(middle);
        const [ax, az] = at(middle - width / 2);
        const [bx, bz] = at(middle + width / 2);
        const run = Math.hypot(bx - ax, bz - az);
        if (run < width * 0.7) continue; // a corner
        const tx = (bx - ax) / run;
        const tz = (bz - az) / run;
        // as deep as the block allows, on whichever side of the edge is block
        let spot;
        for (const depth of [8 + random() * 6, 6]) {
          for (const side of [-1, 1]) {
            const [x, z] = [px - tz * side * (depth / 2 + 0.2), pz + tx * side * (depth / 2 + 0.2)];
            if (!spot && within(x, z) && within(px - tz * side * depth, pz + tx * side * depth)) spot = { x, z, depth };
          }
        }
        if (!spot) continue;
        const { x, z, depth } = spot;
        const radius = Math.min(width, depth) * 0.48;
        if (!isInside(x, z, polygon) || distanceToEdges(x, z, polygon) < WALL_CLEARANCE) continue;
        if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;
        if (squares.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;
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

  // The river banks only reach so far inland, so the city gets its own floor.
  const floor = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x, -z)))),
    createSurface('mottle', 5, { color: 0xd0c4a4, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = BANK.height + 0.04; // just over the river bank's ground, which it overlaps

  // The blocks of Tosca's plan (data/blocks.json), laid on the floor: what is
  // left between them is street and square, at the width the plan gives.
  const ring = (points) => points.map(([x, z]) => new THREE.Vector2(x, -z));
  const shapes = blocks.map(([outline, ...squares]) => {
    const shape = new THREE.Shape(ring(outline));
    shape.holes = squares.map((square) => new THREE.Path(ring(square)));
    return shape;
  });
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(shapes), createSurface('mottle', 9, { color: 0x9a8862, side: THREE.DoubleSide }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = BANK.height + 0.1;

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
    ground,
    createInstances(new THREE.BoxGeometry(1, 1, 1), facades, bodies),
    createInstances(roofGeometry, createSurface('tiles', 3), roofs),
  );
  group.userData.chimneys = chimneys;
  group.userData.facades = facades;
  return group;
}
