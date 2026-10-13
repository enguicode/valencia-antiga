import * as THREE from 'three';
import { RIVER, BANK, createRandom } from './config.js';
import { PRETIL } from './riverside.js';

// Lights that come on at dusk: lamps along the bridges and the parapet,
// torches at the gates and fireflies among the trees. They are glowing
// points, not real light sources. All of it is decoration.

const LAMP = new THREE.Color(0xffb45a);
const TORCH = new THREE.Color(0xff8a3c);
const FIREFLY = new THREE.Color(0xc8f06a);
const BRIDGE_SPAN = RIVER.width + BANK.slopeRun * 2 + 4;

export function createNightLights(layout, path) {
  const random = createRandom(1865);
  const positions = [];
  const colors = [];
  const sizes = [];
  const phases = [];
  const drifts = [];
  const add = (x, y, z, color, size, drift = 0) => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    sizes.push(size);
    phases.push(random());
    drifts.push(drift);
  };

  // Lamps on both parapets of every bridge
  for (const bridge of layout.bridges) {
    const { sample } = path.project(bridge.x, bridge.z);
    for (let lateral = -BRIDGE_SPAN / 2 + 6; lateral <= BRIDGE_SPAN / 2 - 6; lateral += 13) {
      for (const side of [-1, 1]) {
        add(
          sample.x + sample.rx * lateral + sample.tx * side * 4.2,
          9.45,
          sample.z + sample.rz * lateral + sample.tz * side * 4.2,
          LAMP,
          1,
        );
      }
    }
  }

  // Lamps along the city-side parapet
  const every = Math.round(48 / path.step);
  path.samples.forEach((sample, i) => {
    if (i % every !== 0 || sample.s < path.start - 100 || sample.s > path.garden) return;
    const lateral = PRETIL.offset + 0.4;
    add(sample.x + sample.rx * lateral, BANK.height + 2.1, sample.z + sample.rz * lateral, LAMP, 0.9);
  });

  // A pair of torches outside each gate
  const count = layout.wall.length;
  const centre = layout.wall.reduce((sum, [x, z]) => [sum[0] + x / count, sum[1] + z / count], [0, 0]);
  for (const gate of layout.gates) {
    const [x, z] = layout.wall[gate.vertex];
    const outward = new THREE.Vector2(x - centre[0], z - centre[1]).normalize();
    for (const side of [-1, 1]) {
      add(
        x + outward.x * 11 - outward.y * side * 3,
        BANK.height + 4.5,
        z + outward.y * 11 + outward.x * side * 3,
        TORCH,
        1.5,
      );
    }
  }

  // Fireflies over the orchards of the far bank
  for (let i = 0; i < 420; i++) {
    const s = path.start + random() * (path.end - path.start);
    const point = path.pointAt(s);
    const lateral = -(PRETIL.offset + 3 + random() * 55);
    add(
      point.x + point.rx * lateral,
      BANK.height + 0.6 + random() * 4,
      point.z + point.rz * lateral,
      FIREFLY,
      0.35,
      1,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('drift', new THREE.Float32BufferAttribute(drifts, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, night: { value: 0 } }]),
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      attribute float phase;
      attribute float drift;
      uniform float time;
      uniform float night;
      varying vec3 vColor;
      varying float vStrength;
      #include <fog_pars_vertex>
      void main() {
        vec3 wander = vec3(
          sin(time * 0.6 + phase * 6.28), sin(time * 0.9 + phase * 10.0) * 0.6, cos(time * 0.5 + phase * 4.0));
        vec4 mvPosition = modelViewMatrix * vec4(position + wander * 1.6 * drift, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float flame = 0.85 + 0.15 * sin(time * 9.0 + phase * 40.0);
        float blink = pow(max(0.0, sin(time * 1.3 + phase * 6.28)), 3.0);
        vStrength = night * mix(flame, blink, drift);
        vColor = color;
        gl_PointSize = clamp(size * (1700.0 / -mvPosition.z), 3.0, 72.0);
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vStrength;
      #include <fog_pars_fragment>
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float glow = 0.7 * pow(max(0.0, 1.0 - d), 2.2) + 1.4 * smoothstep(0.3, 0.0, d);
        float haze = 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
        gl_FragColor = vec4(vColor * glow * vStrength * haze, 1.0);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  function update(time, night) {
    points.visible = night > 0.02;
    material.uniforms.time.value = time;
    material.uniforms.night.value = night;
  }

  return { points, update };
}
