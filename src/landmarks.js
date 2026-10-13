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

// Same row, with a shaped opening. A round arch reads as a semicircle when
// its height is about 1.67 times its width: the head is the top 30 percent.
function archRow(add, solid, { from, to, step, y, z, width, height, depth = 0.4, color = DARK }) {
  for (let x = from; x <= to + 0.01; x += step) {
    add(solid, [x, y, z], [depth, height, width], color, FACING_Z);
  }
}

// One piece on each flat of a prism. `radius` is the distance from the axis
// to the piece's centre; the piece's local +X, its thickness, points outward.
function around(add, { x = 0, z = 0, sides, radius, y, solid, height, width, depth, color, skip }) {
  const first = sides === 4 ? 0 : 0.5;
  for (let k = 0; k < sides; k++) {
    const angle = ((k + first) / sides) * Math.PI * 2;
    const outX = Math.sin(angle);
    const outZ = Math.cos(angle);
    if (skip?.(outX, outZ)) continue;
    add(solid, [x + outX * radius, y, z + outZ * radius], [depth, height, width], color, yawTowards(outX, outZ));
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

// Copies position, normal and uv. The masonry shader reads position and
// normal; a missing uv still breaks the stock map chunk before it is replaced.
function mergeParts(parts) {
  const geometries = parts.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry));
  let count = 0;
  for (const geometry of geometries) count += geometry.getAttribute('position').count;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let offset = 0;
  for (const geometry of geometries) {
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');
    position.set(positions.array.subarray(0, positions.count * 3), offset * 3);
    normal.set(normals.array.subarray(0, normals.count * 3), offset * 3);
    if (uvs) uv.set(uvs.array.subarray(0, uvs.count * 2), offset * 2);
    offset += positions.count;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

// Wall opening in the same axes as a thin box: local X is the thickness,
// local Z the width, and the piece rests on y = 0. rotateY(+π/2) sends the
// extruded depth (old +Z) to local −X and the profile width (old X) to +Z.
function openingGeometry(shape) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 8 });
  geometry.translate(0, 0, -0.5);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

function pointedShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, 0.58);
  shape.lineTo(-0.16, 0.9);
  shape.lineTo(0, 1);
  shape.lineTo(0.16, 0.9);
  shape.lineTo(0.5, 0.58);
  shape.lineTo(0.5, 0);
  shape.closePath();
  return shape;
}

// Semicircular head on jambs. The ellipse peaks at y = 1, so a caller gets a
// true semicircle by making the height about 1.67 times the width.
function roundShape() {
  const spring = 0.7;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, spring);
  shape.absellipse(0, spring, 0.5, 1 - spring, Math.PI, 0, true);
  shape.lineTo(0.5, 0);
  shape.closePath();
  return shape;
}

// Rose: a ring and eight spokes in the YZ plane, normal along +X, resting on
// y = 0. Two rings, opposite windings, so a FrontSide material shows it from
// either side of a wall. The spokes are the tracery; counts are a sketch.
function wheelGeometry() {
  const front = new THREE.RingGeometry(0.34, 0.5, 16);
  front.rotateY(-Math.PI / 2); // +Z normal swings to +X
  const back = new THREE.RingGeometry(0.34, 0.5, 16);
  back.rotateY(Math.PI / 2);
  const parts = [front, back];
  for (let k = 0; k < 8; k++) {
    const spoke = new THREE.BoxGeometry(0.22, 0.76, 0.055);
    spoke.rotateX((k / 8) * Math.PI * 2);
    parts.push(spoke);
  }
  const hub = new THREE.CylinderGeometry(0.08, 0.08, 0.24, 8);
  hub.rotateZ(Math.PI / 2);
  parts.push(hub);
  for (const geometry of parts) geometry.translate(0, 0.5, 0);
  return mergeParts(parts);
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

  const disk = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  disk.rotateZ(Math.PI / 2); // axis along X, so the face stands in a wall

  return {
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    gable,
    pyramid: pyramid.translate(0, 0.5, 0),
    oct: faceted(new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0)),
    hex: faceted(new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0)),
    cone: faceted(new THREE.ConeGeometry(0.5, 1, 8).translate(0, 0.5, 0)),
    dome: new THREE.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    pointed: openingGeometry(pointedShape()),
    arch: openingGeometry(roundShape()),
    wheel: wheelGeometry(),
    disk: faceted(disk.translate(0, 0.5, 0)),
    ball: new THREE.SphereGeometry(0.5, 8, 5).translate(0, 0.5, 0),
  };
}

const RIDGE_ALONG_X = Math.PI / 2;

// What each parish church changes in the shared body. Local +X is the layout
// axis and +Z its right-hand side; `apse` is the end the apse closes,
// `towerAt` the [end, side] corner the tower stands at and `chapelDome` the
// [fraction of the length, side] of a domed chapel against the flank. `turn`
// lays the nave across the layout axis, where the footprint is nearly square.
const CHURCHES = {
  'santa-caterina': { apse: 1, towerAt: [1, 1] },
  'sants-joans': { apse: 1, towerAt: [-1, 1], chapelDome: [0.15, -1] },
  'sant-marti': { apse: 1, towerAt: [-1, -1], chapelDome: [0.15, -1] },
  'sant-nicolau': { apse: 1, towerAt: [-1, 1] },
};

const MODELS = {
  // The cathedral's bell tower: an octagonal prism 50.85 m to the terrace,
  // the same as its perimeter. Four equal bodies, each twice a face wide
  // (the perimeter is the height, so a body is a quarter of it): blind base,
  // the old prison, the ringer's house, and the bell chamber. Around 1700
  // the pierced Gothic parapet was still up. The stone belfry was not
  // finished, so a cage on two piers stands in for it, tall enough to reach
  // the 63 m of the whole tower and wide enough for the hours bell.
  micalet(add) {
    const across = 16.6; // corner to corner
    const height = 50.85;
    const corner = across / 2;
    const flat = corner * Math.cos(Math.PI / 8);
    const body = height / 4;
    add('oct', [0, 0, 0], [across, height, across], STONE);
    // Prismatic buttresses on the eight edges, proud of the corner so the
    // faces sit back between them.
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      const outX = Math.sin(angle);
      const outZ = Math.cos(angle);
      add('box', [outX * (corner + 0.15), 0, outZ * (corner + 0.15)], [1.35, height, 1.35], STONE, yawTowards(outX, outZ));
    }
    // String courses between the four bodies.
    for (let k = 1; k <= 3; k++) add('oct', [0, body * k, 0], [across + 0.85, 0.5, across + 0.85], PALE);
    const slit = (face, y) => {
      const angle = ((face + 0.5) / 8) * Math.PI * 2;
      add('pointed', [Math.sin(angle) * (flat + 0.12), y, Math.cos(angle) * (flat + 0.12)], [0.4, 3.4, 0.85], DARK, yawTowards(Math.sin(angle), Math.cos(angle)));
    };
    // One slit in the prison, two in the ringer's house.
    slit(1, body + 4.5);
    slit(2, body * 2 + 4.7);
    slit(6, body * 2 + 4.7);
    // Bell chamber: a plain band, then a pointed window, and above it a gable
    // across the face. The gable is the stone stand-in for the openwork head;
    // the wheel is the oculus in that head.
    const bell = body * 3;
    const sill = bell + 2.55;
    around(add, { sides: 8, radius: flat + 0.02, y: sill, solid: 'pointed', height: 6.15, width: 3.35, depth: 0.42, color: STONE });
    around(add, { sides: 8, radius: flat + 0.28, y: sill + 0.22, solid: 'pointed', height: 4.85, width: 2.15, depth: 0.36, color: DARK });
    const gableBase = sill + 4.15;
    for (let face = 0; face < 8; face++) {
      const angle = ((face + 0.5) / 8) * Math.PI * 2;
      const outX = Math.sin(angle);
      const outZ = Math.cos(angle);
      // Gable width runs along local X. Aim that along the face, so the
      // thickness (local Z) points out.
      add('gable', [outX * (flat + 0.2), gableBase, outZ * (flat + 0.2)], [5.05, 4.9, 0.5], STONE, yawTowards(outZ, -outX));
    }
    around(add, { sides: 8, radius: flat + 0.52, y: gableBase + 1.85, solid: 'disk', height: 1.45, width: 1.45, depth: 0.16, color: DARK });
    around(add, { sides: 8, radius: flat + 0.68, y: gableBase + 1.7, solid: 'wheel', height: 1.75, width: 1.75, depth: 0.22, color: STONE });
    add('oct', [0, height - 1.05, 0], [across + 0.75, 0.5, across + 0.75], PALE);
    // Terrace. Rails and posts stand in for the pierced parapet; the corner
    // posts grow a pinnacle.
    add('oct', [0, height, 0], [across + 1.15, 0.45, across + 1.15], PALE);
    const side = across * Math.sin(Math.PI / 8);
    for (let k = 0; k < 8; k++) {
      const angle = ((k + 0.5) / 8) * Math.PI * 2;
      const outX = Math.sin(angle);
      const outZ = Math.cos(angle);
      const yaw = yawTowards(outX, outZ);
      add('box', [outX * (flat + 0.32), height + 0.55, outZ * (flat + 0.32)], [0.26, 0.22, side * 0.82], PALE, yaw);
      add('box', [outX * (flat + 0.32), height + 1.7, outZ * (flat + 0.32)], [0.26, 0.28, side * 0.82], PALE, yaw);
    }
    for (let k = 0; k < 24; k++) {
      const angle = (k / 24) * Math.PI * 2;
      add('box', [Math.sin(angle) * (flat + 0.34), height + 0.45, Math.cos(angle) * (flat + 0.34)], [0.42, 1.6, 0.42], PALE, yawTowards(Math.sin(angle), Math.cos(angle)));
    }
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      add('box', [Math.sin(angle) * (corner + 0.12), height + 0.45, Math.cos(angle) * (corner + 0.12)], [0.95, 2.7, 0.95], PALE);
      add('pyramid', [Math.sin(angle) * (corner + 0.12), height + 3.15, Math.cos(angle) * (corner + 0.12)], [0.85, 1.35, 0.85], PALE);
    }
    // Cage for the hours bell, facing the plaza (local −X). Two stone piers,
    // a beam and an opening. The bell is 2.35 m across; stone, because the
    // bronze is not modelled. A finial brings the top to 63 m.
    const base = height + 0.45;
    for (const z of [-2.15, 2.15]) add('box', [0, base, z], [1.4, 9.7, 1.25], STONE);
    add('box', [0, base + 9.7, 0], [1.6, 0.7, 5.55], STONE);
    add('pointed', [0, base + 2.6, 0], [0.65, 6.5, 3.25], STONE);
    add('pointed', [0, base + 2.95, 0], [0.9, 5.35, 2.4], DARK);
    add('ball', [-0.65, base + 5.85, 0], [2.35, 2.05, 2.35], STONE);
    add('pyramid', [0, base + 10.4, 0], [1.05, 1.3, 1.05], STONE);
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
    // Lantern: two storeys of eight alabaster windows. Each gets a pointed
    // stone frame, a mullion and a transom; the upper storey also a wheel in
    // the head, standing in for the rose under the gable. Corner pinnacles
    // stay below the cone's tip.
    add('oct', [crossing, nave, 0], [18, 17.5, 18], PALE);
    for (const y of [nave + 1.2, nave + 9.4]) {
      around(add, { x: crossing, sides: 8, radius: 8.18, y: y - 0.2, solid: 'pointed', height: 7.5, width: 5.15, depth: 0.4, color: STONE });
      ringOfOpenings(add, { x: crossing, y, z: 0, sides: 8, apothem: 8.35, width: 4.4, height: 6.6, color: ALABASTER });
      around(add, { x: crossing, sides: 8, radius: 8.78, y: y + 0.35, solid: 'box', height: 5.9, width: 0.32, depth: 0.26, color: STONE });
      around(add, { x: crossing, sides: 8, radius: 8.78, y: y + 3.3, solid: 'box', height: 0.28, width: 4.15, depth: 0.26, color: STONE });
    }
    around(add, { x: crossing, sides: 8, radius: 8.95, y: nave + 13.7, solid: 'wheel', height: 2.15, width: 2.15, depth: 0.28, color: STONE });
    add('oct', [crossing, nave + 8.4, 0], [18.8, 0.6, 18.8], STONE);
    add('oct', [crossing, nave + 17.5, 0], [18.8, 0.7, 18.8], STONE);
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      add('pyramid', [crossing + Math.sin(angle) * 9.15, nave + 16.4, Math.cos(angle) * 9.15], [1.2, 3.4, 1.2], PALE);
    }
    add('cone', [crossing, nave + 18.2, 0], [18, 2.4, 18], ROOF);
    // Apse with its ring of chapels. Buttresses sit just inside the chapel
    // octagon's corners, so the plan does not grow. Windows only on the faces
    // that look out of the nave (local +X is the apse).
    const apseX = length / 2 - 4;
    const chapelR = (width * 1.55) / 2;
    const chapelFlat = chapelR * Math.cos(Math.PI / 8);
    add('oct', [apseX, 0, 0], [width * 1.05, nave - 2, width * 1.05], STONE);
    add('oct', [apseX, 0, 0], [width * 1.55, 11, width * 1.55], STONE);
    add('oct', [apseX, 10.6, 0], [width * 1.55 + 0.6, 0.5, width * 1.55 + 0.6], PALE);
    const outward = (outX) => outX < 0.12;
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      const outX = Math.sin(angle);
      const outZ = Math.cos(angle);
      if (outward(outX)) continue;
      add('box', [apseX + outX * (chapelR - 0.5), 0, outZ * (chapelR - 0.5)], [1.3, 12.2, 1.3], STONE, yawTowards(outX, outZ));
      add('pyramid', [apseX + outX * (chapelR - 0.5), 12.2, outZ * (chapelR - 0.5)], [1.2, 2.1, 1.2], PALE);
    }
    around(add, { x: apseX, sides: 8, radius: chapelFlat + 0.02, y: 2.1, solid: 'pointed', height: 7.2, width: 3.3, depth: 0.45, color: STONE, skip: outward });
    around(add, { x: apseX, sides: 8, radius: chapelFlat + 0.26, y: 2.4, solid: 'pointed', height: 6.1, width: 2.35, depth: 0.36, color: DARK, skip: outward });
    around(add, { x: apseX, sides: 8, radius: width * 0.5, y: 12.2, solid: 'pointed', height: 6.6, width: 2.5, depth: 0.4, color: DARK, skip: outward });
    // The Obra Nova: three tiers of round arches beside the apse, facing the square
    add('box', [length / 2 - 12, 0, west * (width / 2 + 9)], [15, 15, 9], PALE);
    for (const y of [0.7, 5.5, 10.2]) {
      archRow(add, 'arch', { from: length / 2 - 17.5, to: length / 2 - 6.5, step: 2.75, y, z: west * (width / 2 + 13.55), width: 1.85, height: 3.1 });
    }
    for (let x = length / 2 - 18.9; x <= length / 2 - 5.1; x += 2.75) {
      add('box', [x, 0, west * (width / 2 + 13.75)], [0.42, 14.2, 0.42], STONE);
    }
    // Buttresses, pinnacles and tall windows along the nave
    for (const side of [-1, 1]) {
      for (let x = -length / 2 + 5; x < crossing - width * 0.5; x += 9) {
        add('box', [x, 0, side * (width / 2 + 1.4)], [1.8, nave - 2, 2.8], STONE);
        add('pyramid', [x, nave - 2, side * (width / 2 + 1.4)], [1.6, 4, 1.6], PALE);
        add('pointed', [x + 4.5, 9.4, side * (width / 2 + 0.12)], [0.4, 8.4, 2.15], DARK, FACING_Z);
      }
      // Transept doors. The old pale slab sat in front of the opening and hid
      // it; three pointed archivolts leave the dark arch proud of the stone.
      // The Apostles' side (local −Z) carries the 6.45 m rose, upright.
      const at = (outset) => side * (transept / 2 + outset);
      add('pointed', [crossing, 0, at(0.06)], [0.5, 12.4, 8.6], STONE, FACING_Z);
      add('pointed', [crossing, 0, at(0.28)], [0.42, 10.6, 6.4], PALE, FACING_Z);
      add('pointed', [crossing, 0, at(0.5)], [0.38, 8.8, 4.4], DARK, FACING_Z);
      if (side === west) {
        add('disk', [crossing, 12.5, at(0.62)], [0.32, 6.45, 6.45], ALABASTER, FACING_Z);
        add('wheel', [crossing, 12.5, at(0.84)], [0.3, 6.45, 6.45], STONE, FACING_Z);
        add('gable', [crossing, 16.2, at(0.1)], [10.4, 5.4, 0.65], STONE);
        for (const dx of [-5.6, -4.55, 4.55, 5.6]) {
          add('box', [crossing + dx, 1.3, at(0.4)], [0.3, 3.1, 0.55], DARK, FACING_Z);
          add('box', [crossing + dx, 4.4, at(0.34)], [0.26, 0.32, 0.8], PALE, FACING_Z);
        }
      }
    }
    // Chapter house by the foot of the nave, and the plain front of 1700: the
    // door is squeezed in between the bell tower and the chapter house
    add('box', [-length / 2 + 8, 0, -west * (width / 2 + 8)], [13, 16, 13], STONE);
    add('arch', [-length / 2 - 0.22, 0, -west * 10.5], [0.42, 7.6, 4.4], DARK);
    add('arch', [-length / 2 - 0.02, 0, -west * 10.5], [0.36, 8.6, 5.4], STONE);
  },

  llotja(add) {
    // In plan, as it stands: the trading hall runs back from the square
    // (local -X is the front), the tower stands on its corner, and the
    // Consolat de Mar carries the front on from the tower, with the walled
    // court of the orange trees behind it. Tiled roofs behind the merlons.
    const HALL = { x: 0, z: 8, length: 36, width: 21, height: 17 };
    const TOWER = { x: -13.5, z: -7, size: 9, height: 27 };
    const CONSOLAT = { x: -12.5, z: -21, depth: 11, length: 19, height: 16 };
    const front = -HALL.length / 2;
    const merlon = (x, z, y) => add('box', [x, y, z], [1.25, 1.05, 1.05], STONE);
    const crown = (cx, cz, sx, sz, y) => {
      add('box', [cx, y, cz], [sx + 0.8, 0.45, sz + 0.8], PALE);
      const rim = (half, n, put) => {
        for (let k = 0; k < n; k++) put(((k + 0.5) / n - 0.5) * half * 2);
      };
      rim(sx / 2, Math.round(sx / 4.4), (d) => {
        merlon(cx + d, cz + sz / 2 + 0.35, y + 0.15);
        merlon(cx + d, cz - sz / 2 - 0.35, y + 0.15);
      });
      rim(sz / 2, Math.round(sz / 4.4), (d) => {
        merlon(cx + sx / 2 + 0.35, cz + d, y + 0.15);
        merlon(cx - sx / 2 - 0.35, cz + d, y + 0.15);
      });
    };

    add('box', [HALL.x, 0, HALL.z], [HALL.length, HALL.height, HALL.width], STONE);
    crown(HALL.x, HALL.z, HALL.length, HALL.width, HALL.height);
    add('gable', [HALL.x, HALL.height + 0.45, HALL.z], [HALL.width - 3, 3.2, HALL.length - 3], ROOF, RIDGE_ALONG_X);

    add('box', [TOWER.x, 0, TOWER.z], [TOWER.size, TOWER.height, TOWER.size], STONE);
    crown(TOWER.x, TOWER.z, TOWER.size, TOWER.size, TOWER.height);

    add('box', [CONSOLAT.x, 0, CONSOLAT.z], [CONSOLAT.depth, CONSOLAT.height, CONSOLAT.length], STONE);
    crown(CONSOLAT.x, CONSOLAT.z, CONSOLAT.depth, CONSOLAT.length, CONSOLAT.height);
    add('gable', [CONSOLAT.x, CONSOLAT.height + 0.45, CONSOLAT.z], [CONSOLAT.depth - 3, 2.4, CONSOLAT.length - 3], ROOF);

    // The court: a wall along the two sides the buildings leave open.
    const court = { x0: CONSOLAT.x + CONSOLAT.depth / 2, x1: HALL.length / 2, z0: CONSOLAT.z - CONSOLAT.length / 2, height: 5 };
    add('box', [(court.x0 + court.x1) / 2, 0, court.z0 + 0.4], [court.x1 - court.x0, court.height, 0.8], STONE);
    add('box', [court.x1 - 0.4, 0, (court.z0 + HALL.z - HALL.width / 2) / 2], [0.8, court.height, HALL.z - HALL.width / 2 - court.z0], STONE);

    // The front on the square: the door of the hall between two windows...
    add('pointed', [front - 0.02, 0, HALL.z], [0.42, 8.2, 3.3], STONE, Math.PI);
    add('pointed', [front - 0.25, 0.2, HALL.z], [0.38, 6.8, 2.3], DARK, Math.PI);
    for (const dz of [-6.2, 6.2]) add('pointed', [front - 0.05, 2.2, HALL.z + dz], [0.4, 7.4, 2.2], DARK, Math.PI);
    // ...and the Consolat, with its gallery of small arches under the eaves.
    const consolatFront = CONSOLAT.x - CONSOLAT.depth / 2 - 0.05;
    for (let k = 0; k < 4; k++) {
      const z = CONSOLAT.z + ((k + 0.5) / 4 - 0.5) * (CONSOLAT.length - 3);
      add('box', [consolatFront, 2.2, z], [0.35, 3.2, 1.6], DARK);
      add('box', [consolatFront, 7.2, z], [0.35, 3.4, 1.7], DARK);
    }
    for (let k = 0; k < 9; k++) {
      const z = CONSOLAT.z + ((k + 0.5) / 9 - 0.5) * (CONSOLAT.length - 2);
      add('arch', [consolatFront, 12.2, z], [0.36, 2.5, 1.3], DARK, Math.PI);
    }
    // The long sides of the hall: a door between four windows on the street,
    // windows only towards the court.
    const side = HALL.z + HALL.width / 2 + 0.05;
    add('pointed', [HALL.x, 0.2, side], [0.38, 6.8, 2.3], DARK, FACING_Z);
    for (const dx of [-12.5, -6.5, 6.5, 12.5]) {
      add('pointed', [HALL.x + dx, 2.2, side], [0.4, 7.4, 2.2], DARK, FACING_Z);
      add('pointed', [HALL.x + dx, 2.2, HALL.z - HALL.width / 2 - 0.05], [0.4, 7.4, 2.2], DARK, -FACING_Z);
    }
    around(add, { x: TOWER.x, z: TOWER.z, sides: 4, radius: TOWER.size / 2 + 0.2, y: 8, solid: 'pointed', height: 5.2, width: 1.6, depth: 0.36, color: DARK });
    around(add, { x: TOWER.x, z: TOWER.z, sides: 4, radius: TOWER.size / 2 + 0.2, y: 19, solid: 'pointed', height: 5, width: 1.6, depth: 0.36, color: DARK });
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
    archRow(add, 'arch', { from: -46.5, to: -7.5, step: 3.9, y: 0.2, z: front + 4.15, width: 2.45, height: 4.1 });
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
    add('arch', [-6, 0, front + 3.85], [0.42, 7.2, 4.6], STONE, FACING_Z);
    add('arch', [-6, 0, front + 4.15], [0.46, 6.2, 3.6], DARK, FACING_Z);
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
      add('pyramid', [x, 13, 12.9], [1.45, 2.2, 1.5], STONE);
      add('pyramid', [x, 13, -0.9], [1.45, 2.2, 1.5], STONE);
      if (x < 16) add('pointed', [x + 4, 7.6, 12.2], [0.4, 5.8, 1.35], DARK, FACING_Z);
    }
    // The door: pointed archivolts between the pinnacles, and a small bell
    // gable under the wall-head. The ogee is not modelled; the pyramid that
    // stood in for it read as a spike.
    add('pointed', [-4, 0, 12.35], [0.48, 10.2, 6.5], STONE, FACING_Z);
    add('pointed', [-4, 0, 12.55], [0.4, 8.8, 4.9], PALE, FACING_Z);
    add('pointed', [-4, 0, 12.78], [0.38, 7.2, 3.25], DARK, FACING_Z);
    for (const x of [-7.6, -0.4]) {
      add('box', [x, 0, 12.7], [0.9, 10, 0.9], PALE);
      add('pyramid', [x, 10, 12.7], [1, 2.6, 1], PALE);
    }
    add('box', [-5.35, 10.5, 12.8], [0.7, 3.9, 0.7], STONE);
    add('box', [-2.65, 10.5, 12.8], [0.7, 3.9, 0.7], STONE);
    add('pointed', [-4, 10.85, 13.05], [0.36, 3.35, 1.65], DARK, FACING_Z);
    add('box', [-4, 14.05, 12.85], [0.55, 0.5, 3.8], STONE, FACING_Z);
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
    add('box', [0, 6.15, 28.25], [0.28, 0.32, 52], PALE, FACING_Z);
    add('box', [0, 10.55, 28.25], [0.28, 0.32, 52], PALE, FACING_Z);
    for (const y of [3, 7.4, 11.8]) {
      for (let x = -18; x <= 18.01; x += 4.5) {
        if (y === 3 && Math.abs(x) < 0.1) continue;
        add('box', [x, y - 0.18, 27.95], [0.28, 3.05, 1.95], PALE, FACING_Z);
        add('box', [x, y, 28.15], [0.32, 2.6, 1.45], DARK, FACING_Z);
      }
    }
    add('arch', [0, 0, 28.05], [0.4, 4.0, 2.55], STONE, FACING_Z);
    add('arch', [0, 0, 28.28], [0.38, 3.4, 1.95], DARK, FACING_Z);
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

  // Corpus Christi keeps the generic nave (40 × 18 × 15) and the 32 m corner
  // tower, so the height and the plan stay put. The screen, the espadaña and
  // the blue-tile dome are a sketch of the finished church: in 1704 it was
  // still in works, and the real belfry is the espadaña, not this tower.
  // The dome's top (about 24 m) stays under the tower.
  corpusChristi(add) {
    const naveLength = 40;
    const naveWidth = 18;
    const towerHeight = 32;
    add('box', [0, 0, 0], [naveLength, 15, naveWidth], PALE);
    add('gable', [0, 15, 0], [naveWidth, 5, naveLength], ROOF, RIDGE_ALONG_X);
    for (const side of [-1, 1]) {
      for (let x = -naveLength / 2 + 7; x <= naveLength / 2 - 6; x += 7) {
        add('pointed', [x, 6.2, side * (naveWidth / 2 + 0.1)], [0.38, 6.3, 1.5], DARK, FACING_Z);
      }
      for (let x = -12; x <= 14.01; x += 6.5) {
        add('box', [x, 0, side * (naveWidth / 2 + 0.65)], [1.25, 12, 1.3], STONE);
        add('pyramid', [x, 12, side * (naveWidth / 2 + 0.65)], [1.15, 2.1, 1.15], PALE);
      }
    }
    const tx = -naveLength / 2 + 3;
    const tz = naveWidth / 2 + 3;
    add('box', [tx, 0, tz], [6, towerHeight, 6], STONE);
    add('pyramid', [tx, towerHeight, tz], [7, 5, 7], ROOF);
    add('box', [tx, towerHeight * 0.7, tz], [6.6, 0.5, 6.6], PALE);
    ringOfOpenings(add, { x: tx, y: towerHeight * 0.74, z: tz, sides: 4, apothem: 3.05, width: 1.7, height: 4.5 });
    const face = naveLength / 2;
    add('box', [face + 0.15, 0, 0], [0.6, 13.8, 16.4], PALE);
    add('box', [face + 0.35, 13.15, 0], [0.8, 0.7, 17.2], STONE);
    add('gable', [face + 0.45, 13.85, 0], [17.2, 4.4, 0.7], PALE, RIDGE_ALONG_X);
    for (const z of [-7.2, -2.5, 2.5, 7.2]) {
      add('box', [face + 0.5, 0, z], [0.5, 13.2, 0.65], STONE);
      add('ball', [face + 0.5, 14.35, z], [0.62, 0.62, 0.62], STONE);
    }
    add('arch', [face + 0.55, 0, 0], [0.4, 6.4, 4.0], STONE);
    add('arch', [face + 0.78, 0, 0], [0.4, 5.4, 3.1], DARK);
    add('box', [face + 0.7, 17.15, -1.15], [0.5, 2.7, 0.5], STONE);
    add('box', [face + 0.7, 17.15, 1.15], [0.5, 2.7, 0.5], STONE);
    add('arch', [face + 0.88, 17.35, 0], [0.36, 2.35, 1.45], DARK);
    add('gable', [face + 0.7, 19.7, 0], [3.5, 1.15, 0.55], STONE, RIDGE_ALONG_X);
    add('ball', [face + 0.7, 20.85, 0], [0.5, 0.5, 0.5], STONE);
    add('oct', [4, 17.7, 0], [7.4, 1.05, 7.4], PALE);
    add('dome', [4, 18.6, 0], [10, 10, 10], TILE_BLUE);
  },

  // The basilica of the Desemparats (1652-1667) is not a nave: a nearly
  // square block under tiled roofs, with a great oval dome on its drum rising
  // out of the middle. Local -Z looks at the square. Sizes are read off an
  // aerial view.
  desemparats(add) {
    const BLOCK = { length: 32, width: 29, height: 14 };
    const DOME = { length: 19, width: 14.5 };
    add('box', [0, 0, 0], [BLOCK.length, BLOCK.height, BLOCK.width], PALE);
    add('box', [0, BLOCK.height, 0], [BLOCK.length + 0.7, 0.5, BLOCK.width + 0.7], STONE);
    add('pyramid', [0, BLOCK.height + 0.5, 0], [BLOCK.length, 4.2, BLOCK.width], ROOF);
    add('oct', [0, BLOCK.height, 0], [DOME.length + 1.6, 9, DOME.width + 1.6], PALE);
    add('oct', [0, BLOCK.height + 9, 0], [DOME.length + 2.4, 0.6, DOME.width + 2.4], STONE);
    add('dome', [0, BLOCK.height + 9.6, 0], [DOME.length, 13, DOME.width], TILE_BLUE);
    add('oct', [0, BLOCK.height + 15.6, 0], [2.6, 2.6, 2.6], PALE);
    add('cone', [0, BLOCK.height + 18.2, 0], [2.9, 1.8, 2.9], TILE_BLUE);
    // windows round the drum, on the faces that clear the roof
    around(add, { sides: 8, radius: (DOME.width + 1.6) / 2 - 0.2, y: BLOCK.height + 5, solid: 'arch', height: 2.8, width: 1.5, depth: 0.4, color: DARK, skip: (outX) => Math.abs(outX) > 0.5 });
    // towards the square: three doors and a row of windows over them
    const face = -BLOCK.width / 2 - 0.05;
    for (const x of [-8, 0, 8]) {
      add('arch', [x, 0, face - 0.1], [0.4, 6, 3.4], STONE, -FACING_Z);
      add('arch', [x, 0.1, face - 0.3], [0.38, 5.1, 2.5], DARK, -FACING_Z);
    }
    for (let x = -12; x <= 12.01; x += 4.8) add('box', [x, 8.6, face], [0.35, 2.6, 1.3], DARK, -FACING_Z);
    for (const side of [-1, 1]) {
      for (let z = -9; z <= 9.01; z += 6) add('box', [side * (BLOCK.length / 2 + 0.05), 8.6, z], [0.35, 2.6, 1.3], DARK);
    }
  },

  church(add, landmark) {
    if (landmark.id === 'corpus-christi') {
      MODELS.corpusChristi(add);
      return;
    }
    if (landmark.id === 'desemparats') {
      MODELS.desemparats(add);
      return;
    }
    // A Valencian Gothic parish: one tall nave, chapels between the buttresses
    // under a lean-to roof, a polygonal apse and the door at the other end.
    const { length, width, dome = false, tower = true, towerHeight = 32, towerSides = 4 } = landmark;
    const spec = CHURCHES[landmark.id] ?? {};
    const { apse = -1, towerAt = [-1, 1], chapelDome } = spec;
    if (spec.turn) {
      const place = add;
      add = (solid, [x, y, z], scale, color, yaw = 0) => place(solid, [z, y, -x], scale, color, yaw + Math.PI / 2);
    }
    const naveLength = clamp(length ?? 40, 30, 50);
    const naveWidth = clamp(width ?? 18, 14, 20) - 4;
    const NAVE = 17;
    const CHAPEL = { depth: 3.6, height: 9.5 };
    const flank = naveWidth / 2 + CHAPEL.depth;
    add('box', [0, 0, 0], [naveLength, NAVE, naveWidth], PALE);
    add('gable', [0, NAVE, 0], [naveWidth, 4.5, naveLength], ROOF, RIDGE_ALONG_X);
    add('oct', [apse * naveLength / 2, 0, 0], [naveWidth, NAVE, naveWidth], PALE);
    add('cone', [apse * naveLength / 2, NAVE, 0], [naveWidth + 0.6, 4.5, naveWidth + 0.6], ROOF);
    for (const side of [-1, 1]) {
      add('box', [0, 0, side * (naveWidth / 2 + CHAPEL.depth / 2)], [naveLength, CHAPEL.height, CHAPEL.depth], PALE);
      // half of this gable is buried in the nave: what shows is the lean-to
      add('gable', [0, CHAPEL.height, side * naveWidth / 2], [CHAPEL.depth * 2 + 0.6, 2.4, naveLength], ROOF, RIDGE_ALONG_X);
      for (let x = -naveLength / 2 + 0.6; x <= naveLength / 2 - 0.5; x += 6.4) {
        add('box', [x, 0, side * (flank - 0.3)], [1.2, 13.5, 1.6], STONE);
        add('pyramid', [x, 13.5, side * (flank - 0.3)], [1.2, 1.8, 1.6], PALE);
        add('box', [x, 12, side * (naveWidth / 2 + 1.4)], [0.9, 2.6, 2.8], STONE);
        if (x + 6.4 > naveLength / 2 - 0.5) continue;
        add('pointed', [x + 3.2, 12, side * (naveWidth / 2 + 0.1)], [0.38, 4.2, 1.5], DARK, FACING_Z);
        add('box', [x + 3.2, 4.2, side * (flank + 0.05)], [0.35, 2.4, 0.9], DARK, FACING_Z);
      }
    }
    const front = -apse * (naveLength / 2 + 0.05);
    add('pointed', [front, 0, 0], [0.5, 7, 3.8], DARK);
    add('disk', [front, 10.2, 0], [0.3, 4.2, 4.2], DARK);
    add('wheel', [front - apse * 0.12, 10.2, 0], [0.3, 4.2, 4.2], STONE);
    if (spec.tower ?? tower) {
      const x = towerAt[0] * (naveLength / 2 - 3);
      const z = towerAt[1] * (flank + 3);
      if (towerSides === 6) {
        // Baroque belfry in stages: shaft, bell stage, a narrower lantern and a spire
        const h = towerHeight;
        add('hex', [x, 0, z], [8.4, h * 0.78, 8.4], STONE);
        for (const y of [0.2, 0.4, 0.6, 0.78]) add('hex', [x, h * y - 0.6, z], [9.2, 0.6, 9.2], PALE);
        ringOfOpenings(add, { x, y: h * 0.62, z, sides: 6, apothem: 3.68, width: 1.7, height: h * 0.13 });
        add('hex', [x, h * 0.78, z], [5.4, h * 0.12, 5.4], PALE);
        ringOfOpenings(add, { x, y: h * 0.8, z, sides: 6, apothem: 2.38, width: 1.1, height: h * 0.08 });
        add('hex', [x, h * 0.9, z], [6, 0.5, 6], STONE);
        add('dome', [x, h * 0.9 + 0.5, z], [5, 5, 5], PALE);
        add('cone', [x, h * 0.9 + 2.6, z], [1.6, h * 0.1 - 3.6, 1.6], PALE);
        add('ball', [x, h - 1, z], [1, 1, 1], STONE);
      } else {
        add('box', [x, 0, z], [6, towerHeight, 6], STONE);
        add('pyramid', [x, towerHeight, z], [7, 5, 7], ROOF);
        add('box', [x, towerHeight * 0.7, z], [6.6, 0.5, 6.6], PALE);
        ringOfOpenings(add, { x, y: towerHeight * 0.74, z, sides: 4, apothem: 3.05, width: 1.7, height: 4.5 });
      }
    }
    if (chapelDome) {
      const x = chapelDome[0] * naveLength;
      const z = chapelDome[1] * (flank + 3.5);
      add('box', [x, 0, z], [9, 11, 9], PALE);
      add('pyramid', [x, 11, z], [9.4, 1.6, 9.4], ROOF);
      add('oct', [x, 11, z], [7.6, 3.4, 7.6], PALE);
      add('dome', [x, 14.4, z], [7.4, 7.4, 7.4], TILE_BLUE);
      add('ball', [x, 18, z], [0.9, 1.4, 0.9], PALE);
    }
    if (dome) {
      const diameter = naveWidth * 0.9;
      add('oct', [naveLength * 0.2, NAVE, 0], [diameter, 5, diameter], PALE);
      add('dome', [naveLength * 0.2, NAVE + 5, 0], [diameter, diameter, diameter], TILE_BLUE);
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
