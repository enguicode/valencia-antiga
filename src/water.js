import * as THREE from 'three';
import { RIVER, BANK, FOG, COLORS } from './config.js';
import { buildRibbon, setRibbonWindow } from './path.js';

const COLUMNS = 13;

// Shared by the water mesh and the boat, so the hull rides the same swell it floats on.
export function waveHeight(x, z, time) {
  return (
    Math.sin(z * 0.18 + time * 1.3) * 0.16 +
    Math.sin(x * 0.31 + z * 0.07 - time * 0.9) * 0.13 +
    Math.sin((x + z) * 0.55 + time * 2.1) * 0.07
  );
}

export function createWater(path) {
  const half = RIVER.width / 2 + BANK.slopeRun;
  const profile = Array.from({ length: COLUMNS }, (_, i) => [-half + (2 * half * i) / (COLUMNS - 1), 0]);
  const geometry = buildRibbon(path.samples, profile);

  const material = new THREE.MeshStandardMaterial({
    color: COLORS.water,
    roughness: 0.28,
    metalness: 0.3,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const positions = geometry.attributes.position;
  const reach = Math.ceil((FOG.far + 50) / path.step);

  // Only the rows that can be seen through the fog are animated.
  function update(time, centreRow) {
    const first = Math.max(0, centreRow - reach);
    const last = Math.min(path.samples.length - 1, centreRow + reach);
    for (let i = first * COLUMNS; i < (last + 1) * COLUMNS; i++) {
      positions.setY(i, waveHeight(positions.getX(i), positions.getZ(i), time));
    }
    positions.clearUpdateRanges();
    positions.addUpdateRange(first * COLUMNS * 3, (last - first + 1) * COLUMNS * 3);
    positions.needsUpdate = true;
    setRibbonWindow(first, last);
  }

  return { mesh, material, update };
}
