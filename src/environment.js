import * as THREE from 'three';
import { RIVER, BANK, COLORS, createRandom } from './config.js';

const Z_START = -RIVER.overrun;
const Z_END = RIVER.length + RIVER.overrun;

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

// One bank as a strip: a slope rising out of the water, then near-flat ground.
function createBank(side) {
  const half = RIVER.width / 2;
  const profile = [
    [side * (half - 2), -2],
    [side * (half + BANK.slopeRun), BANK.height],
    [side * (half + BANK.extent), BANK.height + 1],
  ];
  const vertices = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, y0] = profile[i];
    const [x1, y1] = profile[i + 1];
    vertices.push(
      x0, y0, Z_START, x1, y1, Z_START, x1, y1, Z_END,
      x0, y0, Z_START, x1, y1, Z_END, x0, y0, Z_END,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.grass,
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, material);
}

// Orchard trees on the bank opposite the city, mostly there to give a sense of speed.
function createTrees(side) {
  const count = 320;
  const random = createRandom(1704);
  const foliage = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(2.6, 0),
    new THREE.MeshStandardMaterial({ color: COLORS.foliage, roughness: 1, flatShading: true }),
    count,
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.3, 0.4, 2, 5),
    new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1, flatShading: true }),
    count,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const x = side * (RIVER.width / 2 + BANK.slopeRun + 3 + random() ** 2 * 130);
    const z = Z_START + random() * (Z_END - Z_START);
    const scale = 0.7 + random() * 0.9;
    const ground = BANK.height;

    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.position.set(x, ground + scale, z);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, ground + scale * 3.8, z);
    dummy.updateMatrix();
    foliage.setMatrixAt(i, dummy.matrix);
  }
  const group = new THREE.Group();
  group.add(trunks, foliage);
  return group;
}

export function createEnvironment(scene) {
  scene.fog = new THREE.Fog(COLORS.horizon, 110, 430);

  const sky = createSky();
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xd6e6f5, 0x8a7a55, 1.2));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
  sun.position.set(70, 90, -50);
  scene.add(sun);

  scene.add(createBank(1), createBank(-1), createTrees(1));

  return { sky };
}
