import * as THREE from 'three';
import { FOG } from './config.js';

const CELL = 400;
const chunks = [];
const position = new THREE.Vector3();

// Builds instanced meshes split by map cell, so that whole cells can be
// skipped when they are off screen or lost in the fog. Each item is
// { matrix, color? }.
export function createInstances(geometry, material, items) {
  const cells = new Map();
  for (const item of items) {
    position.setFromMatrixPosition(item.matrix);
    const key = `${Math.floor(position.x / CELL)},${Math.floor(position.z / CELL)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(item);
  }
  const group = new THREE.Group();
  for (const cellItems of cells.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, cellItems.length);
    cellItems.forEach((item, i) => {
      mesh.setMatrixAt(i, item.matrix);
      if (item.color) mesh.setColorAt(i, item.color);
    });
    mesh.computeBoundingSphere();
    chunks.push(mesh);
    group.add(mesh);
  }
  return group;
}

export function cullInstances(camera) {
  for (const mesh of chunks) {
    const sphere = mesh.boundingSphere;
    mesh.visible = sphere.center.distanceTo(camera.position) < FOG.far + sphere.radius;
  }
}
