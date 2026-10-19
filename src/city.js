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
const ROWS = 3;
const BACK_DEPTH = 9;
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
  const footprints = []; // each house's ground plan, for riding into it
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
    // Houses stand shoulder to shoulder along every straight run of the
    // block's edge, the outline and the squares inside it, facing the street.
    const slots = [];
    for (const ring of [outline, ...enclosed]) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, az] = ring[j];
        const [bx, bz] = ring[i];
        const run = Math.hypot(bx - ax, bz - az);
        if (run < 5) continue;
        const tx = (bx - ax) / run;
        const tz = (bz - az) / run;
        const width = run / Math.max(1, Math.round(run / (7.5 + random() * 4)));
        // whichever side of the edge is block
        const side = [-1, 1].find((s) => within((ax + bx) / 2 - tz * s * 3, (az + bz) / 2 + tx * s * 3));
        if (!side) continue;
        for (let along = width / 2; along < run; along += width) {
          slots.push({ px: ax + tx * along, pz: az + tz * along, tx, tz, nx: -tz * side, nz: tx * side, width, reach: 0 });
        }
      }
    }
    // Behind the front row, lower back rows fill the block; the heart of the
    // big ones stays open, as yard. The back rows are filler, not Tosca's.
    for (let row = 0; row < ROWS; row++) {
      for (const slot of slots) {
        if (slot.shut) continue;
        const { px, pz, tx, tz, nx, nz, width } = slot;
        const fits = (depth) => within(px + nx * (slot.reach + depth / 2), pz + nz * (slot.reach + depth / 2)) && within(px + nx * (slot.reach + depth), pz + nz * (slot.reach + depth));
        const depth = (row ? [BACK_DEPTH] : [8 + random() * 6, 6]).find(fits);
        if (!depth) {
          slot.shut = true;
          continue;
        }
        const x = px + nx * (slot.reach + depth / 2 + 0.2);
        const z = pz + nz * (slot.reach + depth / 2 + 0.2);
        slot.reach += depth;
        const height = row ? 5 + random() * 5 : 7 + random() * 8;
        const roofHeight = 2 + random() * 1.5;
        const radius = Math.min(width, depth) * 0.48;
        if (!isInside(x, z, polygon) || distanceToEdges(x, z, polygon) < WALL_CLEARANCE) continue;
        if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;
        if (squares.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;
        if (neighbours(x, z).some((h) => Math.hypot(x - h.x, z - h.z) < radius + h.radius)) continue;
        const key = cellOf(x, z);
        if (!houseCells.has(key)) houseCells.set(key, []);
        houseCells.get(key).push({ x, z, radius });

        footprints.push({ x, z, tx, tz, along: width / 2, across: depth / 2 });
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
    createSurface('earth', 3, { color: 0xd0c4a4, side: THREE.DoubleSide }),
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
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(shapes), createSurface('earth', 3, { color: 0xa5946e, side: THREE.DoubleSide }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = BANK.height + 0.1;

  // A second drawing lights the windows; it is faded in at night.
  const facades = new THREE.MeshStandardMaterial({
    map: TEXTURES.facade,
    emissive: 0xffffff,
    emissiveMap: TEXTURES.facadeGlow,
    emissiveIntensity: 0,
    roughness: 0.95,
  });
  // Doors and windows keep their size whatever the house: the drawing, two
  // bays by two floors, is repeated along the front and its upper floor up
  // it. The side walls stay blank, and at night each window has its own luck.
  facades.onBeforeCompile = (shader) => {
    const varyings = '#include <common>\nvarying vec3 vFront;\nvarying vec2 vHouse;';
    shader.vertexShader = shader.vertexShader.replace('#include <common>', varyings).replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
      vec2 bays = max(vec2(2.0), floor(vec2(length(instanceMatrix[0].xyz) / 3.0, length(instanceMatrix[1].xyz) / 3.2) + 0.5));
      vFront = vec3(uv * vec2(bays.x / 2.0, bays.y), abs(normal.z));
      vHouse = fract(instanceMatrix[3].xz * 0.37);`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', varyings)
      .replace(
        '#include <map_fragment>',
        `vec2 houseUv = vec2(vFront.x, vFront.y < 1.0 ? vFront.y * 0.5 : 0.5 + fract(vFront.y) * 0.5);
        vec2 houseDx = dFdx(vFront.xy) * vec2(1.0, 0.5);
        vec2 houseDy = dFdy(vFront.xy) * vec2(1.0, 0.5);
        float isFront = step(0.5, vFront.z);
        diffuseColor *= mix(vec4(0.8, 0.8, 0.8, 1.0), textureGrad(map, houseUv, houseDx, houseDy), isFront);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `float lit = step(0.6, fract(sin(dot(floor(vec2(vFront.x * 2.0, vFront.y)) + vHouse, vec2(12.9898, 78.233))) * 43758.5453));
        totalEmissiveRadiance *= textureGrad(emissiveMap, houseUv, houseDx, houseDy).rgb * lit * isFront;`,
      );
  };
  const group = new THREE.Group();
  group.add(
    floor,
    ground,
    createInstances(new THREE.BoxGeometry(1, 1, 1), facades, bodies),
    createInstances(roofGeometry, createSurface('tiles', 3), roofs),
  );
  group.userData.chimneys = chimneys;
  group.userData.facades = facades;
  group.userData.houses = footprints;
  return group;
}
