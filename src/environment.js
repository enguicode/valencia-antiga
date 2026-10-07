import * as THREE from 'three';
import { RIVER, BANK, FOG, COLORS, createRandom } from './config.js';
import { buildRibbon } from './path.js';
import { createInstances } from './instancing.js';
import { PRETIL } from './riverside.js';
import { createSurface } from './materials.js';

// A short fringe of light. The disc covers the middle of this sprite, so only
// the falloff past its edge is seen.
function drawMoonGlow() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;
  const glow = context.createRadialGradient(center, center, center * 0.5, center, center, center);
  glow.addColorStop(0, 'rgba(255, 248, 236, 0.7)');
  glow.addColorStop(0.35, 'rgba(255, 244, 220, 0.18)');
  glow.addColorStop(1, 'rgba(255, 244, 220, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);
  return canvas;
}

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
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), material);

  // Stars ride on the sky dome and are faded in at night.
  const random = createRandom(1238);
  const points = [];
  for (let i = 0; i < 350; i++) {
    const azimuth = random() * Math.PI * 2;
    const height = 0.08 + random() * 0.92;
    const ring = Math.sqrt(1 - height * height);
    points.push(Math.cos(azimuth) * ring * 1100, height * 1100, Math.sin(azimuth) * ring * 1100);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xfff6e0,
      size: 2,
      sizeAttenuation: false,
      fog: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  stars.frustumCulled = false;
  sky.add(stars);

  // Near side, north up, from the Lunar Reconnaissance Orbiter. Left out of
  // filmic tone mapping, which flattens the seas. The photo's corners are the
  // limb colour so the mipmaps do not pick up black.
  const moonMap = new THREE.TextureLoader().load(new URL('./moon.jpg', import.meta.url).href);
  moonMap.colorSpace = THREE.SRGBColorSpace;
  moonMap.anisotropy = 8;
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(38, 64),
    new THREE.MeshBasicMaterial({
      map: moonMap,
      fog: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  moon.material.toneMapped = false;
  const glowMap = new THREE.CanvasTexture(drawMoonGlow());
  glowMap.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(38 * 1.65, 48),
    new THREE.MeshBasicMaterial({
      map: glowMap,
      fog: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.material.toneMapped = false;
  glow.renderOrder = 1;
  moon.renderOrder = 2;
  moon.userData.glow = glow;
  const hang = new THREE.Vector3(-0.4, 0.8, -0.3).normalize();
  // The halo sits a step further away, so it is drawn behind the disc.
  glow.position.copy(hang).multiplyScalar(1094);
  moon.position.copy(hang).multiplyScalar(1080);
  glow.lookAt(0, 0, 0);
  moon.lookAt(0, 0, 0);
  sky.add(glow, moon);
  return { sky, stars, moon };
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
  const material = createSurface('mottle', 9, { color: COLORS.grass, side: THREE.DoubleSide });
  const group = new THREE.Group();
  for (const geometry of [shore, street]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

// A lumpy sphere: each vertex is pushed in or out by an amount that depends
// only on where it is, so the seam of the sphere stays closed.
function createCrownGeometry() {
  const geometry = new THREE.SphereGeometry(2.6, 8, 6);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const bump = Math.sin(vertex.x * 2.3 + vertex.y * 1.7) * Math.cos(vertex.z * 2.1 - vertex.y * 1.3);
    vertex.multiplyScalar(1 + bump * 0.22);
    positions.setXYZ(i, vertex.x, vertex.y * 0.85, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
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

    // A second, smaller mass off to one side keeps the crown from being a ball.
    dummy.scale.setScalar(scale * 0.7);
    dummy.position.set(x + Math.cos(i) * scale * 1.5, BANK.height + scale * 4.9, z + Math.sin(i) * scale * 1.5);
    dummy.updateMatrix();
    foliage.push({ matrix: dummy.matrix.clone() });
  }
  const group = new THREE.Group();
  group.add(
    createInstances(
      new THREE.CylinderGeometry(0.3, 0.42, 2, 7),
      new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1 }),
      trunks,
    ),
    createInstances(
      createCrownGeometry(),
      createSurface('mottle', 2.2, { color: COLORS.foliage }),
      foliage,
    ),
  );
  return group;
}

export function createEnvironment(scene, path, clearings) {
  scene.fog = new THREE.Fog(COLORS.horizon, FOG.near, FOG.far);

  const { sky, stars, moon } = createSky();
  scene.add(sky);

  // Colours, strengths and the sun's position are driven by the atmosphere.
  const hemisphere = new THREE.HemisphereLight(0xd6e6f5, 0x8a7a55, 1.2);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
  scene.add(sun, sun.target);

  scene.add(createBank(path, 1), createBank(path, -1), createTrees(path, clearings));

  return { sky, stars, moon, sun, hemisphere, skyMaterial: sky.material };
}
