import * as THREE from 'three';
import { RIVER, BANK, COLORS } from './config.js';

// Shared by the water mesh and the boat, so the hull rides the same swell it floats on.
export function waveHeight(x, z, time) {
  return (
    Math.sin(z * 0.18 + time * 1.3) * 0.16 +
    Math.sin(x * 0.31 + z * 0.07 - time * 0.9) * 0.13 +
    Math.sin((x + z) * 0.55 + time * 2.1) * 0.07
  );
}

export function createWater() {
  const width = RIVER.width + BANK.slopeRun * 2;
  const length = RIVER.length + RIVER.overrun * 2;
  const geometry = new THREE.PlaneGeometry(width, length, 12, Math.round(length / 3));
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, RIVER.length / 2);

  const material = new THREE.MeshStandardMaterial({
    color: COLORS.water,
    roughness: 0.45,
    metalness: 0.15,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const positions = geometry.attributes.position;

  function update(time) {
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, waveHeight(positions.getX(i), positions.getZ(i), time));
    }
    positions.needsUpdate = true;
  }

  return { mesh, update };
}
