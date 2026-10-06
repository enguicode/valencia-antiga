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
const DARK = new THREE.Color(0x2f2720); // openings: windows, doors, belfries

// Openings set into a wall are thin dark slabs standing just proud of it.
// These helpers lay them out; `yaw` turns a slab to face out of a side wall.
const FACING_Z = Math.PI / 2;

// A row of openings along a wall that runs along X, at the given z.
function windowRow(add, { from, to, step, y, z, width, height }) {
  for (let x = from; x <= to + 0.01; x += step) {
    add('box', [x, y, z], [0.35, height, width], DARK, FACING_Z);
  }
}

// One opening on each face of a tower with `sides` faces. A square tower is
// a box, whose faces look along the axes; the polygonal ones are prisms whose
// first face is half a step round from there.
function ringOfOpenings(add, { x, y, z, sides, apothem, width, height }) {
  const firstFace = sides === 4 ? 0 : 0.5;
  for (let k = 0; k < sides; k++) {
    const angle = ((k + firstFace) / sides) * Math.PI * 2;
    const outX = Math.sin(angle);
    const outZ = Math.cos(angle);
    add('box', [x + outX * apothem, y, z + outZ * apothem], [0.4, height, width], DARK, yawTowards(outX, outZ));
  }
}

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
    // String courses dividing the shaft into its storeys
    for (const y of [12.5, 25, 37]) add('oct', [0, y, 0], [14.8, 0.7, 14.8], PALE);
    // The belfry: a tall opening on each of the eight faces
    ringOfOpenings(add, { x: 0, y: 39, z: 0, sides: 8, apothem: 6.5, width: 2.4, height: 8.5 });
    // Traceried crown, terrace and bell gable
    add('oct', [0, 48.6, 0], [15, 2.4, 15], PALE);
    add('oct', [0, 51, 0], [15.6, 1.4, 15.6], PALE);
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      add('box', [Math.sin(angle) * 7.3, 52.4, Math.cos(angle) * 7.3], [0.9, 2.6, 0.9], PALE);
    }
    add('box', [0, 52.4, 0], [5, 8, 1.6], STONE);
    add('box', [0, 55, 0], [1.8, 3, 1.9], DARK);
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
    // The lantern over the crossing is nearly all window
    ringOfOpenings(add, { x: crossing, y: 25, z: 0, sides: 8, apothem: 7.9, width: 3.4, height: 5.5 });
    ringOfOpenings(add, { x: crossing, y: 32.5, z: 0, sides: 8, apothem: 7.9, width: 3.4, height: 5.5 });
    // Buttresses and tall windows down both sides of the nave
    for (const side of [-1, 1]) {
      for (let x = -length / 2 + 5; x < crossing - width * 0.5; x += 9) {
        add('box', [x, 0, side * (width / 2 + 1.4)], [1.8, 19, 2.8], STONE);
        add('box', [x + 4.5, 9, side * (width / 2 + 0.05)], [0.35, 8, 2.2], DARK, FACING_Z);
      }
    }
    ringOfOpenings(add, { x: length / 2, y: 8, z: 0, sides: 8, apothem: width * 0.462, width: 2.4, height: 7 });
    // West door
    add('box', [-length / 2 - 0.05, 0, 0], [0.4, 10, 6], DARK);
    add('box', [-length / 2 - 0.3, 0, 0], [0.5, 13, 9], PALE);
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
        add('box', [x, 18, z], [9.6, 0.6, 9.6], PALE);
        ringOfOpenings(add, { x, y: 20.5, z, sides: 4, apothem: 4.55, width: 1.6, height: 3.2 });
      }
    }
    // Two storeys of windows on both long fronts, a cornice and the main door
    for (const z of [-13.05, 13.05]) {
      windowRow(add, { from: -33, to: 33, step: 6, y: 4, z, width: 1.7, height: 3 });
      windowRow(add, { from: -33, to: 33, step: 6, y: 11, z, width: 1.7, height: 3.6 });
    }
    add('box', [0, 17.4, 0], [97, 0.7, 27], STONE);
    add('box', [0, 0, -13.1], [0.4, 7.5, 5], DARK, FACING_Z);
    add('box', [0, 0, -13.4], [0.5, 9.5, 8], STONE, FACING_Z);
    windowRow(add, { from: -40, to: 0, step: 5, y: 5, z: 36.05, width: 1.5, height: 3 });
  },

  convent(add, { length }) {
    const size = clamp(length ?? 70, 50, 90) * 0.6;
    add('box', [0, 0, -12], [size, 16, 13], PALE);
    add('gable', [0, 16, -12], [13, 4, size], ROOF, RIDGE_ALONG_X);
    add('box', [-size / 2 - 2, 0, -3], [5.5, 28, 5.5], STONE);
    add('pyramid', [-size / 2 - 2, 28, -3], [6.5, 5, 6.5], ROOF);
    add('box', [0, 0, 12], [size, 9, 30], PALE);
    add('box', [0, 9, 12], [size + 1, 0.8, 31], ROOF);
    // Church: side windows, buttresses and a west door
    for (const z of [-18.55, -5.45]) {
      windowRow(add, { from: -size / 2 + 6, to: size / 2 - 6, step: 7, y: 7, z, width: 1.4, height: 6 });
    }
    for (let x = -size / 2 + 2.5; x <= size / 2 - 2; x += 7) add('box', [x, 0, -19.3], [1.4, 13, 1.6], STONE);
    add('box', [size / 2 + 0.05, 0, -12], [0.4, 6.5, 3.6], DARK);
    // Belfry and the cloister range's two rows of small windows
    ringOfOpenings(add, { x: -size / 2 - 2, y: 22, z: -3, sides: 4, apothem: 2.8, width: 1.6, height: 4 });
    add('box', [-size / 2 - 2, 20.5, -3], [6.1, 0.5, 6.1], PALE);
    windowRow(add, { from: -size / 2 + 4, to: size / 2 - 4, step: 4.5, y: 1.6, z: 27.05, width: 1.1, height: 2 });
    windowRow(add, { from: -size / 2 + 4, to: size / 2 - 4, step: 4.5, y: 5.6, z: 27.05, width: 1.1, height: 2 });
  },

  church(add, { length, width, dome = false, tower = true, towerHeight = 32, towerSides = 4 }) {
    const naveLength = clamp(length ?? 40, 30, 50);
    const naveWidth = clamp(width ?? 18, 14, 20);
    add('box', [0, 0, 0], [naveLength, 15, naveWidth], PALE);
    add('gable', [0, 15, 0], [naveWidth, 5, naveLength], ROOF, RIDGE_ALONG_X);
    for (const side of [-1, 1]) {
      windowRow(add, {
        from: -naveLength / 2 + 7,
        to: naveLength / 2 - 6,
        step: 7,
        y: 7,
        z: side * (naveWidth / 2 + 0.05),
        width: 1.4,
        height: 5.5,
      });
    }
    add('box', [naveLength / 2 + 0.05, 0, 0], [0.4, 6.5, 3.6], DARK);
    if (tower) {
      const x = -naveLength / 2 + 3;
      const z = naveWidth / 2 + 3;
      if (towerSides === 6) {
        add('hex', [x, 0, z], [9, towerHeight, 9], STONE);
        add('cone', [x, towerHeight, z], [7, 6, 7], PALE);
        for (const y of [towerHeight * 0.4, towerHeight * 0.68]) add('hex', [x, y, z], [9.6, 0.6, 9.6], PALE);
        ringOfOpenings(add, { x, y: towerHeight * 0.74, z, sides: 6, apothem: 3.95, width: 1.6, height: 6 });
      } else {
        add('box', [x, 0, z], [6, towerHeight, 6], STONE);
        add('pyramid', [x, towerHeight, z], [7, 5, 7], ROOF);
        add('box', [x, towerHeight * 0.7, z], [6.6, 0.5, 6.6], PALE);
        ringOfOpenings(add, { x, y: towerHeight * 0.74, z, sides: 4, apothem: 3.05, width: 1.7, height: 4.5 });
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
