import * as THREE from 'three';
import { COLORS, createRandom } from './config.js';

// Surfaces. Every texture is painted here on a canvas, so the page still
// ships no image files. Most are neutral greys and take their hue from the
// material or instance colour. The greys stay near the middle of the range:
// a near-white map leaves no room for that hue once the noon sun and the
// filmic tone map have had their turn, and the stone comes out grey.

const SIZE = 256;

function paint(draw, { repeat = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const grey = (value, alpha = 1) => `rgba(${value}, ${value}, ${value}, ${alpha})`;

// Fine grain over the whole canvas, so no surface is a flat colour.
function speckle(context, random, amount, strength) {
  for (let i = 0; i < amount; i++) {
    const shade = random() < 0.5 ? 0 : 255;
    context.fillStyle = grey(shade, random() * strength);
    const size = 1 + random() * 2;
    context.fillRect(random() * SIZE, random() * SIZE, size, size);
  }
}

// Soft blotches that wrap around the edges, to keep the texture tileable.
function blotches(context, random, amount, radius, strength) {
  for (let i = 0; i < amount; i++) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    const r = radius * (0.5 + random());
    const shade = random() < 0.55 ? 0 : 255;
    for (const dx of [-SIZE, 0, SIZE]) {
      for (const dy of [-SIZE, 0, SIZE]) {
        const gradient = context.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        gradient.addColorStop(0, grey(shade, strength * random()));
        gradient.addColorStop(1, grey(shade, 0));
        context.fillStyle = gradient;
        context.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  }
}

function paintMasonry(context) {
  const random = createRandom(11);
  context.fillStyle = grey(118); // mortar, dark enough that the courses read
  context.fillRect(0, 0, SIZE, SIZE);
  const course = SIZE / 8;
  for (let row = 0; row < 8; row++) {
    let x = -random() * 50;
    while (x < SIZE) {
      const width = 34 + random() * 46;
      // Mid grey, not near-white: the honey tint has to survive the multiply.
      context.fillStyle = grey(186 + Math.floor(random() * 36));
      context.fillRect(x + 1.5, row * course + 1.5, width - 3, course - 3);
      // the same block again past the right edge, so the course tiles
      context.fillRect(x + 1.5 - SIZE, row * course + 1.5, width - 3, course - 3);
      x += width;
    }
  }
  blotches(context, random, 18, 34, 0.1);
  speckle(context, random, 4000, 0.1);
}

// Curved roof tiles. Channels run across U and the overlaps run down V,
// which is how the roof mapping lays the texture on a slope.
function paintTiles(context) {
  const random = createRandom(12);
  const channels = 8;
  const courses = 8;
  const pitch = SIZE / channels;
  const course = SIZE / courses;
  context.fillStyle = grey(120);
  context.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < channels; i++) {
    const left = i * pitch;
    const crown = context.createLinearGradient(left, 0, left + pitch, 0);
    crown.addColorStop(0, grey(55));
    crown.addColorStop(0.18, grey(110));
    crown.addColorStop(0.5, grey(235));
    crown.addColorStop(0.82, grey(110));
    crown.addColorStop(1, grey(55));
    context.fillStyle = crown;
    context.fillRect(left, 0, pitch, SIZE);
    // the valley where two channels meet
    context.fillStyle = grey(0, 0.35);
    context.fillRect(left, 0, 1.5, SIZE);
  }
  for (let r = 0; r < courses; r++) {
    const y = r * course;
    const lip = context.createLinearGradient(0, y, 0, y + course * 0.28);
    lip.addColorStop(0, grey(0, 0.55));
    lip.addColorStop(0.45, grey(0, 0.12));
    lip.addColorStop(1, grey(0, 0));
    context.fillStyle = lip;
    context.fillRect(0, y, SIZE, course * 0.28);
    context.fillStyle = grey(255, 0.16);
    context.fillRect(0, y + 2, SIZE, 1);
  }
  blotches(context, random, 10, 36, 0.08);
  speckle(context, random, 1800, 0.08);
}

// Rammed-earth lifts: horizontal pours, not ashlar. One copy is four lifts.
function paintTapial(context) {
  const random = createRandom(19);
  const lifts = 4;
  const lift = SIZE / lifts;
  for (let row = 0; row < lifts; row++) {
    const y = row * lift;
    const shade = 168 + Math.floor(random() * 30);
    context.fillStyle = grey(shade);
    context.fillRect(0, y, SIZE, lift);
    for (let x = 0; x < SIZE; x += 7) {
      context.fillStyle = grey(random() < 0.5 ? 0 : 255, 0.04 + random() * 0.04);
      context.fillRect(x, y + 3, 1, lift - 8);
    }
    context.fillStyle = grey(0, 0.38);
    context.fillRect(0, y + lift - 4, SIZE, 4);
    context.fillStyle = grey(255, 0.12);
    context.fillRect(0, y + lift - 6, SIZE, 1);
    for (let hole = 18; hole < SIZE - 20; hole += 46) {
      const x = hole + (row % 2) * 16;
      context.fillStyle = grey(40, 0.75);
      context.beginPath();
      context.ellipse(x, y + lift - 2, 2.2, 1.6, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  blotches(context, random, 18, 30, 0.1);
  speckle(context, random, 4000, 0.1);
}

// Running bond, smaller than the ashlar, so brick does not read as stone.
function paintBrick(context) {
  const random = createRandom(22);
  const courses = 10;
  const course = SIZE / courses;
  context.fillStyle = grey(86);
  context.fillRect(0, 0, SIZE, SIZE);
  for (let row = 0; row < courses; row++) {
    let x = (row % 2) * -26;
    while (x < SIZE) {
      const width = 44 + random() * 12;
      context.fillStyle = grey(168 + Math.floor(random() * 34));
      context.fillRect(x + 1.5, row * course + 1.5, width - 3, course - 3);
      context.fillRect(x + 1.5 - SIZE, row * course + 1.5, width - 3, course - 3);
      x += width;
    }
  }
  blotches(context, random, 10, 28, 0.08);
  speckle(context, random, 2200, 0.08);
}

// Limewash: light, soft, no courses. Darker maps cannot reach a pale plaster.
function paintPlaster(context) {
  const random = createRandom(23);
  context.fillStyle = grey(236);
  context.fillRect(0, 0, SIZE, SIZE);
  blotches(context, random, 36, 38, 0.12);
  speckle(context, random, 3500, 0.07);
}

// Beaten earth. Darker than the masonry and with no courses, so a stone
// building still separates from the ground by value as well as by colour.
function paintEarth(context) {
  const random = createRandom(21);
  context.fillStyle = grey(148);
  context.fillRect(0, 0, SIZE, SIZE);
  blotches(context, random, 80, 42, 0.32);
  for (let i = 0; i < 22; i++) {
    context.fillStyle = grey(96 + Math.floor(random() * 70), 0.4);
    context.beginPath();
    context.ellipse(
      random() * SIZE,
      random() * SIZE,
      6 + random() * 24,
      4 + random() * 14,
      random() * 6,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  speckle(context, random, 7000, 0.18);
}

function paintMottle(context) {
  const random = createRandom(13);
  context.fillStyle = grey(205);
  context.fillRect(0, 0, SIZE, SIZE);
  blotches(context, random, 90, 26, 0.3);
  speckle(context, random, 9000, 0.2);
}

function paintPlanks(context) {
  const random = createRandom(14);
  const plank = SIZE / 8;
  for (let i = 0; i < 8; i++) {
    context.fillStyle = grey(185 + Math.floor(random() * 55));
    context.fillRect(0, i * plank, SIZE, plank);
    for (let g = 0; g < 26; g++) {
      context.fillStyle = grey(random() < 0.6 ? 0 : 255, 0.05 + random() * 0.09);
      context.fillRect(0, i * plank + random() * plank, SIZE, 1);
    }
    context.fillStyle = grey(0, 0.55);
    context.fillRect(0, i * plank, SIZE, 1.5);
  }
  speckle(context, random, 2500, 0.1);
}

function paintCloth(context) {
  const random = createRandom(15);
  context.fillStyle = grey(236);
  context.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < SIZE; i += 2) {
    context.fillStyle = grey(0, 0.03 + random() * 0.03);
    context.fillRect(i, 0, 1, SIZE);
    context.fillRect(0, i, SIZE, 1);
  }
  for (let seam = 0; seam < 6; seam++) {
    context.fillStyle = grey(0, 0.16);
    context.fillRect((seam * SIZE) / 6, 0, 1.5, SIZE);
  }
  blotches(context, random, 18, 50, 0.1);
}

// A house front: three floors of shuttered windows and a door, on plaster.
function paintFacade(context) {
  const random = createRandom(16);
  context.fillStyle = grey(232);
  context.fillRect(0, 0, SIZE, SIZE);
  blotches(context, random, 30, 40, 0.1);
  const grime = context.createLinearGradient(0, SIZE * 0.72, 0, SIZE);
  grime.addColorStop(0, grey(0, 0));
  grime.addColorStop(1, grey(0, 0.22));
  context.fillStyle = grime;
  context.fillRect(0, 0, SIZE, SIZE);

  const columns = [0.2, 0.5, 0.8];
  [0.14, 0.42].forEach((top) => {
    for (const centre of columns) {
      const x = centre * SIZE - 15;
      const y = top * SIZE;
      context.fillStyle = grey(120);
      context.fillRect(x - 3, y - 3, 36, 50);
      context.fillStyle = 'rgb(46, 40, 36)';
      context.fillRect(x, y, 30, 44);
      context.fillStyle = 'rgb(92, 104, 84)';
      context.fillRect(x, y, 9, 44);
      context.fillRect(x + 21, y, 9, 44);
      context.fillStyle = grey(110);
      context.fillRect(x - 6, y + 46, 42, 4);
    }
  });
  for (const centre of columns) {
    const isDoor = centre === 0.5;
    const width = isDoor ? 38 : 26;
    const height = isDoor ? 62 : 34;
    const x = centre * SIZE - width / 2;
    const y = SIZE - height - (isDoor ? 0 : 22);
    context.fillStyle = grey(115);
    context.fillRect(x - 3, y - 3, width + 6, height + 3);
    context.fillStyle = isDoor ? 'rgb(74, 52, 36)' : 'rgb(46, 40, 36)';
    context.fillRect(x, y, width, height);
  }
  speckle(context, random, 3500, 0.08);
}

// The same house front after dark: black everywhere except the windows that
// have a light on. It must line up with paintFacade.
function paintFacadeGlow(context) {
  const random = createRandom(18);
  context.fillStyle = '#000';
  context.fillRect(0, 0, SIZE, SIZE);
  for (const top of [0.14, 0.42]) {
    for (const centre of [0.2, 0.5, 0.8]) {
      if (random() < 0.45) continue;
      const warmth = 150 + Math.floor(random() * 60);
      context.fillStyle = `rgb(255, ${warmth}, 70)`;
      context.fillRect(centre * SIZE - 6, top * SIZE, 12, 44);
    }
  }
  context.fillStyle = 'rgb(255, 170, 70)';
  context.fillRect(0.2 * SIZE - 13, SIZE - 56, 26, 34);
}

// Tileable ripples as a normal map: a sum of waves with whole-number
// frequencies, differentiated analytically.
function createRippleNormals() {
  const random = createRandom(17);
  const waves = Array.from({ length: 14 }, () => {
    const fx = Math.round((random() - 0.5) * 14);
    const fy = Math.round((random() - 0.5) * 14) || 1;
    return { fx, fy, phase: random() * Math.PI * 2, height: 1 / (1 + Math.hypot(fx, fy)) };
  });
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let dx = 0;
      let dy = 0;
      for (const wave of waves) {
        const slope =
          Math.cos(((wave.fx * x + wave.fy * y) / SIZE) * Math.PI * 2 + wave.phase) * wave.height;
        dx += slope * wave.fx;
        dy += slope * wave.fy;
      }
      const norm = Math.hypot(dx, dy, 3.2);
      const i = (y * SIZE + x) * 4;
      data[i] = (-dx / norm) * 127 + 128;
      data[i + 1] = (-dy / norm) * 127 + 128;
      data[i + 2] = (3.2 / norm) * 127 + 128;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, SIZE, SIZE);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export const TEXTURES = {
  masonry: paint(paintMasonry),
  tiles: paint(paintTiles),
  tapial: paint(paintTapial),
  brick: paint(paintBrick),
  plaster: paint(paintPlaster),
  earth: paint(paintEarth),
  mottle: paint(paintMottle),
  planks: paint(paintPlanks),
  cloth: paint(paintCloth),
  facade: paint(paintFacade, { repeat: false }),
  facadeGlow: paint(paintFacadeGlow, { repeat: false }),
  ripples: createRippleNormals(),
};

// Maps the texture by position instead of by UVs, in the object's own axes
// and in metres, so nothing stretches however a box or a wall is scaled.
// `metres` is how much surface one copy of the texture covers.
// `roof` lays tiles across the slope and down it, instead of blending three
// planes, so the channels are not smeared on a pitch.
function projectByPosition(material, metres, roof = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.surfaceScale = { value: 1 / metres };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurfacePosition;\nvarying vec3 vSurfaceNormal;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 surfaceStretch = vec3(1.0);
        #ifdef USE_INSTANCING
          surfaceStretch = vec3(
            length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        #endif
        vSurfacePosition = position * surfaceStretch;
        vSurfaceNormal = normal;`,
      );
    const sample = roof
      ? `vec3 surfacePoint = vSurfacePosition * surfaceScale;
        vec3 surfaceAbs = abs(vSurfaceNormal);
        vec2 surfaceUv;
        if (surfaceAbs.y >= surfaceAbs.x && surfaceAbs.y >= surfaceAbs.z) {
          surfaceUv = surfaceAbs.x > surfaceAbs.z ? surfacePoint.zx : surfacePoint.xz;
        } else if (surfaceAbs.x >= surfaceAbs.z) {
          surfaceUv = surfacePoint.zy;
        } else {
          surfaceUv = surfacePoint.xy;
        }
        diffuseColor *= texture2D(map, surfaceUv);`
      : `vec3 surfaceWeight = pow(abs(vSurfaceNormal), vec3(6.0));
        surfaceWeight /= surfaceWeight.x + surfaceWeight.y + surfaceWeight.z;
        vec3 surfacePoint = vSurfacePosition * surfaceScale;
        diffuseColor *=
          texture2D(map, surfacePoint.zy) * surfaceWeight.x +
          texture2D(map, surfacePoint.xz) * surfaceWeight.y +
          texture2D(map, surfacePoint.xy) * surfaceWeight.z;`;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float surfaceScale;\nvarying vec3 vSurfacePosition;\nvarying vec3 vSurfaceNormal;',
      )
      .replace('#include <map_fragment>', sample);
  };
  material.customProgramCacheKey = () => `surface-${metres}${roof ? '-roof' : ''}`;
  return material;
}

// A textured, position-mapped material. Extra options go straight to
// MeshStandardMaterial.
export function createSurface(texture, metres, options = {}) {
  return projectByPosition(
    new THREE.MeshStandardMaterial({ map: TEXTURES[texture], roughness: 0.95, ...options }),
    metres,
    texture === 'tiles',
  );
}

export const stoneSurface = () => createSurface('masonry', 4, { color: COLORS.stone, roughness: 0.9 });
