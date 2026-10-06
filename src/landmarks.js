import * as THREE from 'three';
import { BANK, COLORS, yawTowards } from './config.js';
import { createInstances } from './instancing.js';
import { createSurface } from './materials.js';

// Buildings with a silhouette of their own. Each one is assembled from a few
// unit solids placed in a local frame: +X runs along the building's long axis
// and the origin sits on the ground at the centre of its footprint. The
// models are schematic: positions come from the layout, shapes are a sketch.

const STONE = new THREE.Color(COLORS.stone);
const PALE = new THREE.Color(0xe2d3b0);
const ROOF = new THREE.Color(COLORS.roofs[0]);
const TILE_BLUE = new THREE.Color(0x3f6f9f);

const clamp = THREE.MathUtils.clamp;

// Hard edges for the polygonal solids, which would otherwise shade as round.
function faceted(geometry) {
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

// Unit solids, all one unit wide and tall and resting on y = 0.
function createSolids() {
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-0.5, 0);
  gableShape.lineTo(0.5, 0);
  gableShape.lineTo(0, 1);
  gableShape.closePath();
  const gable = new THREE.ExtrudeGeometry(gableShape, { depth: 1, bevelEnabled: false });
  gable.translate(0, 0, -0.5); // ridge along Z

  const pyramid = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  pyramid.rotateY(Math.PI / 4);

  return {
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    gable,
    pyramid: pyramid.translate(0, 0.5, 0),
    oct: faceted(new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0)),
    hex: faceted(new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0)),
    cone: faceted(new THREE.ConeGeometry(0.5, 1, 8).translate(0, 0.5, 0)),
    dome: new THREE.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  };
}

const RIDGE_ALONG_X = Math.PI / 2;

const MODELS = {
  micalet(add) {
    add('oct', [0, 0, 0], [14, 51, 14], STONE);
    add('oct', [0, 51, 0], [15, 1.4, 15], PALE);
    add('box', [0, 52.4, 0], [5, 8, 1.6], STONE);
  },

  cathedral(add, { length = 95, width = 28 }) {
    const crossing = length * 0.18;
    add('box', [0, 0, 0], [length, 22, width], STONE);
    add('gable', [0, 22, 0], [width, 5, length], ROOF, RIDGE_ALONG_X);
    add('box', [crossing, 0, 0], [width * 0.8, 22, width * 2.1], STONE);
    add('gable', [crossing, 22, 0], [width * 0.8, 5, width * 2.1], ROOF);
    add('oct', [crossing, 22, 0], [17, 18, 17], PALE);
    add('cone', [crossing, 40, 0], [17, 3, 17], ROOF);
    add('oct', [length / 2, 0, 0], [width, 20, width], STONE);
  },

  llotja(add) {
    add('box', [8, 0, 0], [36, 17, 21], STONE);
    add('box', [8, 17, 0], [36.8, 1.2, 21.8], PALE);
    add('box', [-14.5, 0, 0], [9, 27, 9], STONE);
    add('box', [-14.5, 27, 0], [9.8, 1.2, 9.8], PALE);
    add('box', [-30, 0, 0], [22, 16, 19], STONE);
  },

  palace(add) {
    add('box', [0, 0, 0], [96, 18, 26], PALE);
    add('gable', [0, 18, 0], [26, 4, 96], ROOF, RIDGE_ALONG_X);
    add('box', [-20, 0, 24], [50, 14, 24], PALE);
    add('gable', [-20, 14, 24], [24, 3.5, 50], ROOF, RIDGE_ALONG_X);
    for (const x of [-42, 42]) {
      for (const z of [-11, 11]) {
        add('box', [x, 0, z], [9, 27, 9], STONE);
        add('pyramid', [x, 27, z], [10, 5, 10], ROOF);
      }
    }
  },

  convent(add, { length }) {
    const size = clamp(length ?? 70, 50, 90) * 0.6;
    add('box', [0, 0, -12], [size, 16, 13], PALE);
    add('gable', [0, 16, -12], [13, 4, size], ROOF, RIDGE_ALONG_X);
    add('box', [-size / 2 - 2, 0, -3], [5.5, 28, 5.5], STONE);
    add('pyramid', [-size / 2 - 2, 28, -3], [6.5, 5, 6.5], ROOF);
    add('box', [0, 0, 12], [size, 9, 30], PALE);
    add('box', [0, 9, 12], [size + 1, 0.8, 31], ROOF);
  },

  church(add, { length, width, dome = false, tower = true, towerHeight = 32, towerSides = 4 }) {
    const naveLength = clamp(length ?? 40, 30, 50);
    const naveWidth = clamp(width ?? 18, 14, 20);
    add('box', [0, 0, 0], [naveLength, 15, naveWidth], PALE);
    add('gable', [0, 15, 0], [naveWidth, 5, naveLength], ROOF, RIDGE_ALONG_X);
    if (tower) {
      const x = -naveLength / 2 + 3;
      const z = naveWidth / 2 + 3;
      if (towerSides === 6) {
        add('hex', [x, 0, z], [9, towerHeight, 9], STONE);
        add('cone', [x, towerHeight, z], [7, 6, 7], PALE);
      } else {
        add('box', [x, 0, z], [6, towerHeight, 6], STONE);
        add('pyramid', [x, towerHeight, z], [7, 5, 7], ROOF);
      }
    }
    if (dome) {
      const diameter = naveWidth * 0.9;
      add('oct', [naveLength * 0.2, 15, 0], [diameter, 6, diameter], PALE);
      add('dome', [naveLength * 0.2, 21, 0], [diameter, diameter, diameter], TILE_BLUE);
    }
  },
};

export function createLandmarks(layout, path) {
  const parts = {};
  const local = new THREE.Object3D();

  for (const landmark of layout.landmarks) {
    const build = MODELS[landmark.kind];
    if (!build) continue;

    let [axisX, axisZ] = landmark.axis ?? [1, 0];
    if (landmark.alignToRiver) {
      const { sample } = path.project(landmark.x, landmark.z);
      axisX = sample.tx;
      axisZ = sample.tz;
    }
    const frame = new THREE.Matrix4()
      .makeRotationY(yawTowards(axisX, axisZ))
      .setPosition(landmark.x, BANK.height, landmark.z);

    build((solid, position, scale, color, yaw = 0) => {
      local.position.set(...position);
      local.rotation.set(0, yaw, 0);
      local.scale.set(...scale);
      local.updateMatrix();
      const surface = color === ROOF || color === TILE_BLUE ? 'tiles' : 'masonry';
      (parts[`${solid}|${surface}`] ??= []).push({ matrix: frame.clone().multiply(local.matrix), color });
    }, landmark);
  }

  const solids = createSolids();
  const surfaces = { masonry: createSurface('masonry', 4), tiles: createSurface('tiles', 3) };
  const group = new THREE.Group();
  for (const [key, items] of Object.entries(parts)) {
    const [solid, surface] = key.split('|');
    group.add(createInstances(solids[solid], surfaces[surface], items));
  }
  return group;
}

// Clear ground each landmark needs, so the filler houses keep off it.
export function landmarkClearings(layout) {
  return layout.landmarks.map((landmark) => ({
    x: landmark.x,
    z: landmark.z,
    radius: Math.max(landmark.length ?? 40, landmark.width ?? 20, 30) / 2 + 8,
  }));
}
