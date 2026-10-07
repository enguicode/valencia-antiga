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
const ALABASTER = new THREE.Color(0xf6ecd2); // the cathedral lantern's translucent windows
const RENDER = new THREE.Color(0xe9dcbc); // limewashed walls
const BRICK = new THREE.Color(0xb98562);

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
function ringOfOpenings(add, { x, y, z, sides, apothem, width, height, color = DARK }) {
  const firstFace = sides === 4 ? 0 : 0.5;
  for (let k = 0; k < sides; k++) {
    const angle = ((k + firstFace) / sides) * Math.PI * 2;
    const outX = Math.sin(angle);
    const outZ = Math.cos(angle);
    add('box', [x + outX * apothem, y, z + outZ * apothem], [0.4, height, width], color, yawTowards(outX, outZ));
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
  // The cathedral's bell tower: an octagonal prism 50.85 m to the terrace,
  // the same as its perimeter, in four storeys. Around 1700 the pierced
  // Gothic parapet was still there and the stone bell gable was not yet
  // finished, so a plain bell frame stands in for it.
  micalet(add) {
    const across = 16.6; // corner to corner
    const height = 50.85;
    const corner = across / 2;
    const flat = corner * 0.924;
    add('oct', [0, 0, 0], [across, height, across], STONE);
    // A slim buttress up each of the eight edges
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      add('box', [Math.sin(angle) * (corner - 0.1), 0, Math.cos(angle) * (corner - 0.1)], [1.1, height, 1.1], STONE, yawTowards(Math.sin(angle), Math.cos(angle)));
    }
    // Mouldings between the storeys: blind, the "prison", the ringer's house, the bells
    for (const y of [14, 25, 36]) add('oct', [0, y, 0], [across + 0.9, 0.7, across + 0.9], PALE);
    const window = (face, y, tall) => {
      const angle = ((face + 0.5) / 8) * Math.PI * 2;
      add('box', [Math.sin(angle) * (flat + 0.05), y, Math.cos(angle) * (flat + 0.05)], [0.4, tall, 1.3], DARK, yawTowards(Math.sin(angle), Math.cos(angle)));
    };
    window(1, 18, 3);
    window(2, 29, 3);
    window(6, 29, 3);
    // The bell chamber: one tall opening on every face, with a moulding over them
    ringOfOpenings(add, { x: 0, y: 38, z: 0, sides: 8, apothem: flat + 0.05, width: 2.8, height: 9.5 });
    add('oct', [0, 48.3, 0], [across + 0.7, 0.6, across + 0.7], PALE);
    // Terrace with its pierced parapet
    add('oct', [0, height, 0], [across + 1.2, 0.5, across + 1.2], PALE);
    for (let k = 0; k < 24; k++) {
      const angle = (k / 24) * Math.PI * 2;
      add('box', [Math.sin(angle) * (flat + 0.3), height + 0.5, Math.cos(angle) * (flat + 0.3)], [0.45, 1.7, 0.45], PALE, yawTowards(Math.sin(angle), Math.cos(angle)));
    }
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      add('box', [Math.sin(angle) * corner, height + 0.5, Math.cos(angle) * corner], [0.9, 3.2, 0.9], PALE);
    }
    // Bell frame: two piers and a beam, with the hours bell hung between them
    for (const x of [-2.1, 2.1]) add('box', [x, height + 0.5, 0], [1, 8, 1.3], STONE);
    add('box', [0, height + 8.5, 0], [5.8, 0.8, 1.5], STONE);
    add('box', [0, height + 5.4, 0], [1.7, 2.3, 1.7], DARK);
  },

  // The cathedral: 94 m long and 53.65 m across the transept, apse to the
  // east-north-east (+X here). The Micalet stands across the foot of the
  // nave, joined to it since the nave was lengthened at the end of the 15th
  // century. Flat terraces rather than pitched roofs, Gothic pinnacles still
  // in place, and the two-storey lantern with its alabaster windows.
  cathedral(add, { length = 94, width = 28 }) {
    const nave = 23;
    const transept = 53.65;
    const crossing = length * 0.2;
    const west = -1; // local -Z looks north-north-west, towards the Apostles' door
    add('box', [0, 0, 0], [length, nave, width], STONE);
    add('box', [0, nave, 0], [length + 0.6, 0.9, width + 0.6], PALE);
    add('box', [crossing, 0, 0], [width * 0.78, nave, transept], STONE);
    add('box', [crossing, nave, 0], [width * 0.78 + 0.6, 0.9, transept + 0.6], PALE);
    // Lantern: two storeys of eight windows each, then a low roof
    add('oct', [crossing, nave, 0], [18, 17.5, 18], PALE);
    for (const y of [nave + 1.2, nave + 9.4]) {
      ringOfOpenings(add, { x: crossing, y, z: 0, sides: 8, apothem: 8.35, width: 4.4, height: 6.6, color: ALABASTER });
    }
    add('oct', [crossing, nave + 8.4, 0], [18.8, 0.6, 18.8], STONE);
    add('oct', [crossing, nave + 17.5, 0], [18.8, 0.7, 18.8], STONE);
    add('cone', [crossing, nave + 18.2, 0], [18, 2.4, 18], ROOF);
    // Apse with its ring of chapels
    add('oct', [length / 2 - 4, 0, 0], [width * 1.05, nave - 2, width * 1.05], STONE);
    add('oct', [length / 2 - 4, 0, 0], [width * 1.55, 11, width * 1.55], STONE);
    ringOfOpenings(add, { x: length / 2 - 4, y: 12.5, z: 0, sides: 8, apothem: width * 0.486, width: 2.2, height: 6 });
    // The Obra Nova: three tiers of open arcades beside the apse, facing the square
    add('box', [length / 2 - 12, 0, west * (width / 2 + 9)], [15, 15, 9], PALE);
    for (const y of [1.2, 6, 10.6]) {
      windowRow(add, { from: length / 2 - 17.5, to: length / 2 - 6.5, step: 2.75, y, z: west * (width / 2 + 13.55), width: 1.7, height: 3.4 });
    }
    // Buttresses, pinnacles and tall windows along the nave
    for (const side of [-1, 1]) {
      for (let x = -length / 2 + 5; x < crossing - width * 0.5; x += 9) {
        add('box', [x, 0, side * (width / 2 + 1.4)], [1.8, nave - 2, 2.8], STONE);
        add('pyramid', [x, nave - 2, side * (width / 2 + 1.4)], [1.6, 4, 1.6], PALE);
        add('box', [x + 4.5, 10, side * (width / 2 + 0.05)], [0.35, 8, 2.2], DARK, FACING_Z);
      }
      // Transept doors: the Apostles' on one arm, with its rose window; the Almoina on the other
      const end = side * (transept / 2 + 0.05);
      add('box', [crossing, 0, end], [0.4, 9, 5.5], DARK, FACING_Z);
      add('box', [crossing, 0, side * (transept / 2 + 0.35)], [0.5, 11.5, 8.5], PALE, FACING_Z);
      if (side === west) add('oct', [crossing, 13.5, end - 0.4], [6.45, 0.9, 6.45], ALABASTER);
    }
    // Chapter house by the foot of the nave, and the plain front of 1700: the
    // door is squeezed in between the bell tower and the chapter house
    add('box', [-length / 2 + 8, 0, -west * (width / 2 + 8)], [13, 16, 13], STONE);
    add('box', [-length / 2 - 0.05, 0, -west * 10.5], [0.4, 8, 4.5], DARK);
  },

  llotja(add) {
    add('box', [8, 0, 0], [36, 17, 21], STONE);
    add('box', [8, 17, 0], [36.8, 1.2, 21.8], PALE);
    add('box', [-14.5, 0, 0], [9, 27, 9], STONE);
    add('box', [-14.5, 27, 0], [9.8, 1.2, 9.8], PALE);
    add('box', [-30, 0, 0], [22, 16, 19], STONE);
  },

  // The Palau del Real, pulled down in 1810, as it stood around 1700. From
  // Arciniega's studies of the building accounts and of the surviving plans
  // (see docs/sources.md): the main front, from west to east, was the Torre
  // Cremada, the gallery of stone and brick built about 1640 with its
  // balconies, the Torre dels Àngels beside the entrance, and the corner of
  // the older palace, the Real Vell, with a small bell gable. The towers ended
  // in parapets and merlons; their spires came after 1713. Lengths are
  // estimates. +Z looks at the river and +X is east.
  palace(add) {
    const front = 20; // z of the main facade
    const merlons = (x, z, half, y) => {
      for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0]]) {
        add('box', [x + dx * (half - 0.6), y, z + dz * (half - 0.6)], [1.1, 1.3, 1.1], STONE);
      }
    };
    // The Real Nou, round its two courtyards, to the west
    add('box', [-27, 0, -2], [70, 13, 44], RENDER);
    add('box', [-27, 13, -2], [70.8, 1, 44.8], STONE);
    add('box', [-40, 13.4, -2], [22, 0.3, 22], DARK); // the great courtyard, seen from above
    add('box', [-12, 13.4, -4], [12, 0.3, 14], DARK); // the small one
    windowRow(add, { from: -58, to: 4, step: 6.2, y: 7.5, z: -24.05, width: 1.5, height: 3.2 });
    // The gallery between the two towers: an arcade of round arches on
    // pillars, and over it a gallery of windows with iron balconies
    add('box', [-27, 0, front + 1.5], [46, 12.5, 5], PALE);
    add('box', [-27, 12.5, front + 1.5], [46.6, 0.8, 5.6], STONE);
    windowRow(add, { from: -46.5, to: -7.5, step: 3.9, y: 0.3, z: front + 4.05, width: 2.5, height: 4.7 });
    add('box', [-27, 6, front + 4.3], [46, 0.45, 1.1], STONE);
    windowRow(add, { from: -46.5, to: -7.5, step: 3.9, y: 7.2, z: front + 4.05, width: 1.6, height: 3.4 });
    for (let x = -48.4; x <= -5.5; x += 3.9) add('box', [x, 6.4, front + 4.7], [0.35, 0.9, 0.35], DARK);
    // Torre Cremada at the west end, with its three windows
    add('box', [-55, 0, front + 1], [10, 20, 10], STONE);
    add('box', [-55, 20, front + 1], [10.8, 0.7, 10.8], STONE);
    merlons(-55, front + 1, 5.4, 20.7);
    for (const y of [4, 9.5, 15]) add('box', [-55, y, front + 6.05], [0.35, 2.8, 1.5], DARK, FACING_Z);
    // Torre dels Àngels by the entrance: balcony, and the royal arms painted on it
    add('box', [1, 0, front + 1], [10, 23, 10], STONE);
    add('box', [1, 23, front + 1], [10.8, 0.7, 10.8], STONE);
    merlons(1, front + 1, 5.4, 23.7);
    add('box', [1, 9, front + 6.05], [0.35, 3.2, 1.8], DARK, FACING_Z);
    add('box', [1, 8.6, front + 6.5], [0.5, 0.35, 3.4], STONE, FACING_Z);
    add('box', [1, 14.5, front + 6.1], [0.3, 4.2, 3.6], PALE, FACING_Z);
    // The main entrance, between the gallery and the tower
    add('box', [-6, 0, front + 4.1], [0.5, 6.4, 4.2], DARK, FACING_Z);
    // The Real Vell at the east corner, with the lower church and its bell gable
    add('box', [27, 0, -2], [38, 12, 40], RENDER);
    add('box', [27, 12, -2], [38.8, 0.9, 40.8], STONE);
    add('box', [27, 12.3, -2], [16, 0.3, 16], DARK); // its courtyard
    windowRow(add, { from: 13, to: 41, step: 5.6, y: 6, z: 18.05, width: 1.4, height: 3 });
    add('box', [10, 12.9, 17.5], [3.4, 4, 0.7], STONE);
    add('box', [10, 14.2, 17.5], [1.3, 1.6, 0.9], DARK);
    // Its corner towers: lower at the back, and the one nearest the bridge
    // (the Torre de la Reina) the tallest
    for (const [x, z, tall] of [[44, 16, 19], [44, -20, 14], [10, -20, 14]]) {
      add('box', [x, 0, z], [7.5, tall, 7.5], STONE);
      merlons(x, z, 4.1, tall);
      ringOfOpenings(add, { x, y: tall - 5, z, sides: 4, apothem: 3.8, width: 1.3, height: 2.6 });
    }
    // Garden walls to the north and west, where the gardens lay
    for (const [x, z, sx, sz] of [[-20, -100, 140, 1], [-90, -40, 1, 120], [50, -62, 1, 76], [-76, 22, 28, 1]]) {
      add('box', [x, 0, z], [sx, 3.6, sz], RENDER);
    }
  },

  // The Trinitat: a tall, buttressed single-nave church lying along the
  // river with its apse downstream, entered from a forecourt on the river
  // side through a pinnacled Gothic door; a two-storey cloister behind, and a
  // long blank wall towards the water. The belfry is a guess: no source
  // describes it. +Z looks at the river.
  trinitat(add) {
    add('box', [0, 0, 6], [40, 16, 12], RENDER);
    add('gable', [0, 16, 6], [12, 4.5, 40], ROOF, RIDGE_ALONG_X);
    add('oct', [20, 0, 6], [12.5, 16, 12.5], RENDER);
    add('cone', [20, 16, 6], [12.5, 4, 12.5], ROOF);
    for (let x = -16; x <= 16; x += 8) {
      add('box', [x, 0, 12.9], [1.5, 13, 2], STONE);
      add('box', [x, 0, -0.9], [1.5, 13, 2], STONE);
      if (x < 16) add('box', [x + 4, 8.5, 12.05], [0.35, 5, 1.3], DARK, FACING_Z);
    }
    // The door: archivolts under an ogee arch, between pinnacles
    add('box', [-4, 0, 12.5], [0.5, 9.5, 6.4], STONE, FACING_Z);
    add('box', [-4, 0, 12.8], [0.4, 6.5, 3.4], DARK, FACING_Z);
    add('pyramid', [-4, 9.5, 12.5], [3, 3, 1], PALE);
    for (const x of [-7.6, -0.4]) {
      add('box', [x, 0, 12.7], [0.9, 10, 0.9], PALE);
      add('pyramid', [x, 10, 12.7], [1, 2.6, 1], PALE);
    }
    // Cloister, two storeys round a court, and the belfry
    add('box', [-2, 0, -17], [36, 9.5, 30], RENDER);
    add('box', [-2, 9.5, -17], [37, 0.8, 31], ROOF);
    windowRow(add, { from: -17, to: 13, step: 4.3, y: 5.6, z: -1.95, width: 1.6, height: 2.6 });
    add('box', [15, 0, -3], [4.6, 23, 4.6], STONE);
    add('pyramid', [15, 23, -3], [5.4, 4.5, 5.4], ROOF);
    ringOfOpenings(add, { x: 15, y: 17.5, z: -3, sides: 4, apothem: 2.35, width: 1.4, height: 3.6 });
    // Perimeter wall with its gate towards the river, and the cart yard
    add('box', [0, 0, 27], [84, 4.2, 1], RENDER);
    add('box', [-42, 0, 6], [1, 4.2, 43], RENDER);
    add('box', [42, 0, 6], [1, 4.2, 43], RENDER);
    add('box', [-4, 0, 27.3], [0.5, 3.4, 3], DARK, FACING_Z);
    add('box', [-30, 0, 10], [18, 6, 10], RENDER);
    windowRow(add, { from: -35, to: -25, step: 5, y: 0.3, z: 15.05, width: 3.4, height: 3.6 });
  },

  // Sant Pius V as it stood when work stopped in 1699: the river range with
  // its two corner towers and three tiers of windows, in bare brick on a
  // stone plinth; the courtyard unfinished; no church and no dome, which came
  // decades later. +Z looks at the river.
  santPius(add) {
    add('box', [0, 0, 22], [56, 16, 12], BRICK);
    add('box', [0, 0, 22], [56.4, 1.6, 12.4], STONE);
    add('gable', [0, 16, 22], [12, 3.5, 56], ROOF, RIDGE_ALONG_X);
    add('box', [0, 15.6, 28.2], [56, 0.6, 0.8], PALE);
    for (const y of [3, 7.4, 11.8]) {
      windowRow(add, { from: -18, to: 18, step: 4.5, y, z: 28.05, width: 1.5, height: 2.6 });
    }
    for (const x of [-24.5, 24.5]) {
      add('box', [x, 0, 23], [9, 22, 9], BRICK);
      add('box', [x, 0, 23], [9.4, 1.6, 9.4], STONE);
      add('box', [x, 22, 23], [9.8, 1, 9.8], PALE); // flat parapet, no spire
      for (const [dx, dz] of [[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3]]) add('box', [x + dx, 23, 23 + dz], [0.8, 1.4, 0.8], PALE);
      ringOfOpenings(add, { x, y: 17, z: 23, sides: 4, apothem: 4.55, width: 1.5, height: 2.8 });
      for (const y of [3, 7.4, 11.8]) add('box', [x, y, 27.55], [0.35, 2.6, 1.5], DARK, FACING_Z);
    }
    // One side range finished, the other only begun, the far range half built
    add('box', [22, 0, -2], [12, 15, 36], BRICK);
    add('gable', [22, 15, -2], [12, 3, 36], ROOF);
    add('box', [-22, 0, -2], [12, 5.5, 36], BRICK);
    add('box', [6, 0, -24], [44, 9, 10], BRICK);
    // Scaffolding poles on the unfinished side
    for (let z = -16; z <= 12; z += 7) add('box', [-29, 0, z], [0.3, 11, 0.3], DARK);
    add('box', [-29, 8, -2], [0.3, 0.3, 30], DARK);
  },

  convent(add, landmark) {
    if (landmark.id === 'trinitat') return MODELS.trinitat(add);
    if (landmark.id === 'sant-pius') return MODELS.santPius(add);
    const { length } = landmark;
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
