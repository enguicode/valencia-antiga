import * as THREE from 'three';
import { BANK, COLORS, createRandom } from './config.js';
import { createInstances } from './instancing.js';

// Generic houses filling the walled city. They are placeholders for volume:
// there is no street plan behind them.

const HOUSE_COUNT = 2600;
const WALL_CLEARANCE = 16;

function isInside(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToEdges(x, z, polygon) {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[j];
    const [bx, bz] = polygon[i];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

export function createCity(layout) {
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

  const random = createRandom(1356);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const dummy = new THREE.Object3D();

  for (let placed = 0; placed < HOUSE_COUNT; ) {
    const x = minX + random() * spanX;
    const z = minZ + random() * spanZ;
    if (!isInside(x, z, polygon) || distanceToEdges(x, z, polygon) < WALL_CLEARANCE) continue;

    const width = 7 + random() * 6;
    const depth = 7 + random() * 8;
    const height = 8 + random() * 7;
    const roofHeight = 2 + random() * 1.5;
    const yaw = random() * Math.PI;

    dummy.rotation.set(0, yaw, 0);
    dummy.position.set(x, BANK.height + height / 2, z);
    dummy.scale.set(width, height, depth);
    dummy.updateMatrix();
    bodies.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(pick(COLORS.houseWalls)) });

    dummy.position.set(x, BANK.height + height + roofHeight / 2, z);
    dummy.scale.set(width * 1.08, roofHeight, depth * 1.08);
    dummy.updateMatrix();
    roofs.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(pick(COLORS.roofs)) });

    placed++;
  }

  // The river banks only reach so far inland, so the city gets its own floor.
  const floor = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x, -z)))),
    new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 1, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = BANK.height;

  const material = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const group = new THREE.Group();
  group.add(
    floor,
    createInstances(new THREE.BoxGeometry(1, 1, 1), material, bodies),
    createInstances(roofGeometry, material, roofs),
  );
  return group;
}
