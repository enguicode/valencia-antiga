import * as THREE from 'three';
import { RIVER, BANK, FOG, COLORS } from './config.js';
import { buildRibbon, setRibbonWindow } from './path.js';
import { TEXTURES } from './materials.js';

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

  // Smooth water: the swell moves the surface, and two layers of a ripple
  // normal map sliding over each other give it its texture. What it reflects
  // comes from the scene's environment map.
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.water,
    roughness: 0.32,
    metalness: 0,
    envMapIntensity: 0.55,
  });
  const ripples = { rippleMap: { value: TEXTURES.ripples }, rippleTime: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, ripples);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRipplePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRipplePosition = position.xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D rippleMap;\nuniform float rippleTime;\nvarying vec2 vRipplePosition;',
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec3 rippleA = texture2D(rippleMap, vRipplePosition * 0.11 + rippleTime * vec2(0.012, 0.02)).xyz * 2.0 - 1.0;
        vec3 rippleB = texture2D(rippleMap, vRipplePosition * 0.29 - rippleTime * vec2(0.021, 0.009)).xyz * 2.0 - 1.0;
        vec3 rippleNormal = normalize(vec3(rippleA.x + rippleB.x, 5.0, rippleA.y + rippleB.y));
        normal = normalize((viewMatrix * vec4(rippleNormal, 0.0)).xyz);`,
      );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const positions = geometry.attributes.position;
  const reach = Math.ceil((FOG.far + 50) / path.step);

  // Only the rows that can be seen through the fog are animated.
  function update(time, centreRow) {
    ripples.rippleTime.value = time;
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
