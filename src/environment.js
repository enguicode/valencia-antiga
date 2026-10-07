import * as THREE from 'three';
import { RIVER, BANK, FOG, COLORS, createRandom } from './config.js';
import { buildRibbon } from './path.js';
import { createInstances } from './instancing.js';
import { PRETIL } from './riverside.js';
import { createSurface } from './materials.js';

// Near side, north up, one bit per pixel of a 200px wash. The shape of
// the seas is the real one; the ink is flat, so it reads as a drawing.
const SEA_WASH = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAPgAAADD8AAAAAAAAAAAAAAAAAAAAAAAAAH4AAAB4yAAAAAAAAAAAAAAAAAAAAAAAACP8AAAOecwAAAAAAAAAAAAAAAAAAAAAAAH/8AAAH/4PAAAAAAAAAAAAAAAAAAAAAAAH/8AAfj/+fwAAAAAAAAAAAAAAAAAAAAAAH/8AA////v8AAAAAAAAAAAAAAAAAAAAAAD//AAf/////AAAAAAAAAAAAAAAAAAAAAAB//8AH/////wAAAAAAAAAAAAAAAAAAAAAA///AD/////8AAAAAAAAAAAAAAAAAAAAAAf//wA//////gAAAAAAAAAAAAAAAAAAAAAP//8AP/////4AAAAAAAAAAAAAAAAAAAAAD///AD/////+AAAAAAAAAAAAAAAAAAAAAB///AA//////gAAAAAAAAAAAAAAAAAAAAAf//gA//////wAAAAAAAAAAAAAAAAAAAAAP//4A//////wAAAAAAAAAAAAAAAAAAAAAP//8Af/////8AAAAAAAAAAAAAAAAAAAAAH///YH//////AAAAAAAAAAAAAAAAAAAAAD///+H//////wAAAD4AAAAAAAAAAAAAAAA////n//////8AAAB/gAAAAAAAAAAAAAAAf///////////gAAA/+AfAAAAAAAAAAAAAP///////////+AAAP/gPwAAAAAAAAAAAAH////////////gAAH/+f+AAAAAAAAAAAAB////////////4AAB////gAAAAAAAAAAAA////////////+AAAf///wAAAAAAAAAAAAf////////////wAAP///8AAAAAAAAAAAAH////////////8AAD////AAAAAAAAAAAAD////////////+AAD////4AAAAAAAAAAAA////////////8AAD/////AAAAAAAAAAAAf////////////AAA/////8AAAAAAAAAAAD//8/////////wAAP/////gAAAAAAAAAAA///P////////EAAB/////4AAAAAAAAAAA///j////////gAAAP////+AAAAAAAAAAAf//w///////54AA4D/////wAAAAAAAAAAH//8Pf/////+eAAfA/////+AAAAAAAAAAB///D3///////gAPwH/////gAAAAAAAAAAf//w9///////4AD8D/////4AAAAAAAAAAD//4P////////AAeA/////+AAAAAAAAAAA//+B////////4AGAP/////gAAAAAAAAAAP//Af//v/////ABAH/////4AAAAAQAAAAP//gH//x/////9AAB//////AAAAAeAAAAH///z//8f/////4AA//////wAAAADgAAAD//////+D//////AAP/////8AAAAA8AAAB///////g//////wAD//////AAAADPgAAAf//////8//////8AA//////wAAAB/8AAAP/////////////+AAP/////8AAAAf/gAAD////////7/////gAD//////AAAAH/8AAB////////w///7/gAAf/////4dwAB//AAAf///////4H/g+/wAAD///////+AAf/4AAH///////8B/4Hv4AGM////////wAD/+AAB/////j/8AMAA/8AD///g/////8AA//gAAf////4/4AAAAH/gB//f8D/////AAP/4AAP/////P+AAAAB/4B//gfgf////wAD/+AAD/////z/wAAAAf+c//4H8H////+AA//AAA/////9/8AAAAH//P//B/g/////gAH/wAAH//////+AAAAAf////4f4f////4AB/8AAB/////7/gAAAAB//////wf/////AAP/AAAf////8P4AAAAA//////8P/////4AB/wAAH////8D+AAAAAP//////D//////gAf8AAB/////AfgAAAAD//////g//////8AD+AAAP////gH8AAAAA//5///gH//////gAfAAAD////4B+AAAAAP/8B//wD//////4AAAAAAf///4AfgAAAAH/+AP/4A//////4AAAAAAH///+AH4AAAAB/+AB/8AP/////8AAAAAAB////gB/AAAAA/+AAD+AB//////AAAAAAAf///wAP+AAAYP/gAAAAAf/////wAAAAAAH///8AD+AAAPD/4AAAAAH/////+AAAAAAB////gAcAAAP//+AAAAAB//////wAAAAAAP///8AeAAAD///gAAAAAf/////8BAAAAAD////gPwAAB///8AAAAAD//////A8AAAAAf///4H+AAB////gAAAAA//////wPgAAAAH////h/4AAf///4AAAAAP/////8D8AAAAD////8//AAD////gAAAAD//////B/gAAAA/////P/4AAf///8AAAAAf/////x/8AAAAP//////+AAH////AAAAAD/////8f/gAAAD///////gAA////8AAAAA/////+P//AAAA///////2AAP//vfAAAAAH///D////4AAAP///////gAD//wHwAAAAB///wf///+AAAH////////AAf/wB8AAAAAf//4AR///gAAA///////44AD/4AfAAAAAAf/8AAf//wAAAP///////P+Af+ADwAAAAAA/+AAH//+AAAB///////z/wD/AAAAAAAAAB/gAD///wAAAP////////+AQAAAAAAAAAAf4AA///8AAAB/////////AAAAAAAAAAAAH+AAP///AAAAf////////wAAAAAAAAAAAA/AAB///wAAAH////////4AAAAAAAAAAAAPgAAf//oAAAB////////wAGAAAAAAAAAADwAAD//+AAAAf///////8ADwAAAAAAAAAB4AAA///gAAAD////////AB+AAAAAAAAAAcAAAP//4AAAA//////B/+APgAAAAAAAAAAAAAH//+AAAAP/////wf/gD8AAAAAAAAAAAAAB///AAAAB/////8H/4A/AAAAAAAAAAAAAAf//gAAAAP/////B//APwAAAAAAAAAAAAAH//gAAAAD/////wf/wD/AAAAAAAAAAAAAB//gAAAAA/////8H/+A/4AAAAAAAAAAAAAD/wAAAAAH/////D//wP+AAAAAAAAAAAAAA/4AAAAAB/////8//8B/gAAAAAAAAAAAAAP+AAAAAAfP///////4P4AAAAAAAAAAAAAD/gAAAAADz/+/////+D+AAAAAAAAAAAAAB/wAAAAAA8f/H/////g/gAAAAAAAAAAAAAYAAAAAAAHH/h/////8P4AAAAAAAAAAAAAAAAAAAAAAB/4P////3D/AAAAAAAAAAAAAAAAAAAAAAAf8D///vwx/wAAAAAAAAAAAAAAAAAAAAAAGAAP/+B8e/wAAAAAAAAAAAAAAAAAAAAAADgACf/Afn/8AAAAAAAAAAAAAAAAAAAAAAA4AAj/gH///AAAAAAAAAAAAAAAAAAAAAAAMAAd/4B////AAAAAAAAAAAAAAAAAAAAAAAAAH/+Af///4AAAAAAAAAAAAAAAAAAAAAAAAB//gH///8AAAAAAAAAAAAAAAAAAAAAAAAAf/4D///+AAAAAAAAAAAAAAAAAAAAAAAAAP/gB////gAAAAAAAAAAAAAAAAAAAAAAAAH/wAf///wAAAAAAAAAAAAAAAAAAAAAAAAP/4AGf//8AAAAAAAAAAAAAAAAAAAAAAAAD/+AAD///gAAAAAAAAAAAAAAAAAAAAAAAB//gAAf//4AAAAAAAAAAAAAAAAAAAAAAAAf/4AAH//8AAAAAAAAAAAAAAAAAAAAAAAAH//AAB///AAAAAAAAAAAAAAAAAAAAAAAAB///+H///wAAAAAAAAAAAAAAAAAAAAAAAAf///w////AAAAAAAAAAAAAAAAAAAAAAAAD///+P///4AAAAAAAAAAAAAAAAAAAAAAAA////h///+AAAAAAAAAAAAAAAAAAAAAAAAH//58f///AAAAAAAAAAAAAAAAAAAAAAAAA//+Pn///wAAAAAAAAAAAAAAAAAAAAAAAAP//h8///8AAAAAAAAAAAAAAAAAAAAAAAAD//Ifn//+AAAAAAAAAAAAAAAAAAAAAAAAAH/wP4P/4AAAAAAAAAAAAAAAAAAAAAAAAAB/8D8BwYAAAAAAAAAAAAAAAAAAAAAAAAAAP/B8AAGAAAAAAAAAAAAAAAAAAAAAAAAAAABg8AAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function seaWash() {
  const width = 200;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, width);
  const bytes = Uint8Array.from(atob(SEA_WASH), (char) => char.charCodeAt(0));
  const data = image.data;
  for (let i = 0; i < width * width; i++) {
    if (((bytes[i >> 3] >> (7 - (i & 7))) & 1) === 0) continue;
    const pixel = i * 4;
    // Bone ink. A cool grey read as a photograph against the paper.
    data[pixel] = 207;
    data[pixel + 1] = 187;
    data[pixel + 2] = 156;
    data[pixel + 3] = 210;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

// Paper, the sea wash and three craters. A photograph sat too sharp against
// the painted city.
function drawMoon() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;
  const ground = context.createRadialGradient(center, center, size * 0.08, center, center, center);
  ground.addColorStop(0, '#f6efe2');
  ground.addColorStop(0.75, '#efe3cc');
  ground.addColorStop(1, '#e4d3b6');
  context.fillStyle = ground;
  context.fillRect(0, 0, size, size);

  const random = createRandom(1700);
  for (let i = 0; i < 10; i++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 50 + random() * 90;
    const blot = context.createRadialGradient(x, y, 0, x, y, radius);
    blot.addColorStop(0, `rgba(255, 248, 230, ${0.08 + random() * 0.1})`);
    blot.addColorStop(1, 'rgba(255, 248, 230, 0)');
    context.fillStyle = blot;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  // The wash is stored small. Blur it as it scales up, so the coasts stay
  // soft instead of stepping.
  context.save();
  context.imageSmoothingEnabled = true;
  context.filter = 'blur(5px)';
  context.drawImage(seaWash(), 0, 0, size, size);
  context.restore();

  const crater = (x, y, radius) => {
    const cx = x * size;
    const cy = y * size;
    const r = radius * size;
    context.fillStyle = 'rgba(255, 250, 240, 0.65)';
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(176, 150, 118, 0.7)';
    context.beginPath();
    context.arc(cx + r * 0.16, cy + r * 0.18, r * 0.52, 0, Math.PI * 2);
    context.fill();
  };
  crater(0.33, 0.42, 0.018); // Copernicus
  crater(0.175, 0.36, 0.01); // Aristarchus
  crater(0.43, 0.83, 0.014); // Tycho

  const limb = context.createRadialGradient(center, center, center * 0.7, center, center, center);
  limb.addColorStop(0, 'rgba(120, 96, 64, 0)');
  limb.addColorStop(1, 'rgba(120, 96, 64, 0.28)');
  context.fillStyle = limb;
  context.globalCompositeOperation = 'multiply';
  context.fillRect(0, 0, size, size);
  return canvas;
}

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

  // A painted disc, not a lit surface: filmic tone mapping would flatten the wash.
  const moonMap = new THREE.CanvasTexture(drawMoon());
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
