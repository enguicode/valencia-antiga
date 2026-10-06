import * as THREE from 'three';
import { RIVER, BANK, FOG, COLORS, createRandom } from './config.js';
import { buildRibbon } from './path.js';
import { createInstances } from './instancing.js';
import { PRETIL } from './riverside.js';

function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(COLORS.skyTop) },
      horizonColor: { value: new THREE.Color(COLORS.horizon) },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vDirection;
      void main() {
        float t = pow(clamp(vDirection.y, 0.0, 1.0), 0.55);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), material);
}

// One bank: a shore rising out of the water up to the foot of the parapet
// wall, then flat ground at street level behind it. The flat part is kept
// perfectly level so the folds it makes on the inside of bends cannot be seen.
function createBank(path, side) {
  const half = RIVER.width / 2;
  const shore = buildRibbon(path.samples, [
    [side * (half - 2), -2],
    [side * PRETIL.offset, PRETIL.foot],
  ]);
  const street = buildRibbon(path.samples, [
    [side * (PRETIL.offset + PRETIL.thickness), BANK.height],
    [side * (half + BANK.extent), BANK.height],
  ]);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.grass,
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  for (const geometry of [shore, street]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

// Orchard trees on the bank opposite the city.
function createTrees(path, clearings) {
  const count = Math.round(path.length / 4.5);
  const random = createRandom(1704);
  const foliage = [];
  const trunks = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const sample = path.samples[Math.floor(random() * path.samples.length)];
    const lateral = -(PRETIL.offset + 4 + random() ** 2 * 130);
    const x = sample.x + sample.rx * lateral;
    const z = sample.z + sample.rz * lateral;
    const scale = 0.7 + random() * 0.9;
    if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;

    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.position.set(x, BANK.height + scale, z);
    dummy.updateMatrix();
    trunks.push({ matrix: dummy.matrix.clone() });

    dummy.position.set(x, BANK.height + scale * 3.8, z);
    dummy.updateMatrix();
    foliage.push({ matrix: dummy.matrix.clone() });
  }
  const group = new THREE.Group();
  group.add(
    createInstances(
      new THREE.CylinderGeometry(0.3, 0.4, 2, 5),
      new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1, flatShading: true }),
      trunks,
    ),
    createInstances(
      new THREE.IcosahedronGeometry(2.6, 0),
      new THREE.MeshStandardMaterial({ color: COLORS.foliage, roughness: 1, flatShading: true }),
      foliage,
    ),
  );
  return group;
}

export function createEnvironment(scene, path, clearings) {
  scene.fog = new THREE.Fog(COLORS.horizon, FOG.near, FOG.far);

  const sky = createSky();
  scene.add(sky);

  // Low sun from the north-west, as on a summer evening: it is the only time
  // of day the north-facing river front of the city is lit.
  scene.add(new THREE.HemisphereLight(0xd6e6f5, 0x8a7a55, 1.2));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
  sun.position.set(-60, 55, -80);
  scene.add(sun);

  scene.add(createBank(path, 1), createBank(path, -1), createTrees(path, clearings));

  return { sky };
}
