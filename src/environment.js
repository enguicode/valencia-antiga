import * as THREE from 'three';
import { RIVER, BANK, FOG, COLORS, createRandom } from './config.js';
import { buildRibbon } from './path.js';
import { createInstances } from './instancing.js';
import { PRETIL } from './riverside.js';
import { createSurface } from './materials.js';

// Near side, north up, as it looks from Earth: x and y are fractions of the
// canvas (y grows downward), radii are fractions of its width.
function drawMoon() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;

  const ground = context.createRadialGradient(center, center * 0.94, size * 0.05, center, center, center);
  ground.addColorStop(0, '#f6f1e4');
  ground.addColorStop(0.7, '#e3d9c4');
  ground.addColorStop(1, '#b5aa96');
  context.fillStyle = ground;
  context.fillRect(0, 0, size, size);

  const random = createRandom(1700);
  const pixels = context.getImageData(0, 0, size, size);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (random() - 0.5) * 10;
    pixels.data[i] += grain;
    pixels.data[i + 1] += grain;
    pixels.data[i + 2] += grain * 0.75;
  }
  context.putImageData(pixels, 0, 0);

  // The seas are flat dark plains, overlapped so they join up, then blurred
  // once. A round falloff on each one read as a pile of bubbles.
  const plains = document.createElement('canvas');
  plains.width = size;
  plains.height = size;
  const ink = plains.getContext('2d');
  ink.fillStyle = '#3c3a36';
  const sea = (x, y, rx, ry, turn) => {
    ink.beginPath();
    ink.ellipse(x * size, y * size, rx * size, ry * size, turn, 0, Math.PI * 2);
    ink.fill();
  };
  sea(0.5, 0.155, 0.22, 0.02, -0.04); // Mare Frigoris, a thin band along the north
  sea(0.37, 0.35, 0.145, 0.12, 0.15); // Mare Imbrium
  sea(0.29, 0.29, 0.05, 0.035, -0.5); // Sinus Iridum, on Imbrium's shoulder
  sea(0.56, 0.37, 0.09, 0.08, 0.35); // Mare Serenitatis
  sea(0.48, 0.44, 0.04, 0.03, 0); // Mare Vaporum, the link between them
  sea(0.83, 0.39, 0.034, 0.048, 0.35); // Mare Crisium, the oval on its own
  sea(0.22, 0.5, 0.14, 0.18, -0.3); // Oceanus Procellarum
  sea(0.33, 0.55, 0.1, 0.08, -0.15); // Procellarum towards the middle
  sea(0.64, 0.5, 0.11, 0.075, 0.4); // Mare Tranquillitatis
  sea(0.72, 0.58, 0.075, 0.06, 0.5); // Mare Fecunditatis, joined to it
  sea(0.64, 0.6, 0.045, 0.04, 0.2); // Mare Nectaris
  sea(0.4, 0.64, 0.11, 0.08, -0.1); // Mare Nubium
  sea(0.29, 0.68, 0.05, 0.042, 0); // Mare Humorum
  context.save();
  context.filter = 'blur(12px)';
  context.globalCompositeOperation = 'multiply';
  context.drawImage(plains, 0, 0);
  context.restore();

  const crater = (x, y, radius) => {
    context.save();
    context.translate(x * size, y * size);
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, 'rgba(255, 252, 244, 0.95)');
    glow.addColorStop(0.35, 'rgba(255, 248, 230, 0.45)');
    glow.addColorStop(1, 'rgba(255, 248, 230, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  // Tycho's rays first, so the bright crater sits on top of them.
  context.save();
  context.translate(0.47 * size, 0.8 * size);
  context.strokeStyle = 'rgba(255, 250, 240, 0.35)';
  context.lineWidth = 5;
  context.lineCap = 'round';
  // Uneven on purpose: eight equal rays looked like a drawn star.
  for (const [angle, reach] of [
    [0.5, 90],
    [1.15, 160],
    [1.8, 70],
    [2.6, 180],
    [3.4, 120],
    [4.3, 150],
    [5.2, 80],
  ]) {
    context.beginPath();
    context.moveTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
    context.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
    context.stroke();
  }
  context.restore();
  crater(0.47, 0.8, 22); // Tycho
  crater(0.36, 0.48, 16); // Copernicus
  crater(0.26, 0.47, 11); // Kepler
  crater(0.2, 0.37, 10); // Aristarchus

  const limb = context.createRadialGradient(center, center, center * 0.78, center, center, center);
  limb.addColorStop(0, 'rgba(0, 0, 0, 0)');
  limb.addColorStop(1, 'rgba(42, 38, 32, 0.5)');
  context.fillStyle = limb;
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

  // The moon sits where the night light comes from. The disc carries the
  // seas you can actually pick out: the big dark field on the west, the two
  // eyes of the north, and the oval of Crisium off on its own to the east.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(38, 64),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(drawMoon()),
      fog: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  // A sky disc, not a lit surface: filmic tone mapping would flatten the seas.
  moon.material.toneMapped = false;
  moon.material.map.colorSpace = THREE.SRGBColorSpace;
  moon.position.set(-0.4, 0.8, -0.3).normalize().multiplyScalar(1080);
  moon.lookAt(0, 0, 0);
  sky.add(moon);
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
