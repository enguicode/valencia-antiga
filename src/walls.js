import * as THREE from 'three';
import { BANK, WALL, COLORS, yawTowards } from './config.js';
import { gateFacing } from './bridges.js';
import { createInstances } from './instancing.js';
import { stoneSurface, createSurface } from './materials.js';

// City wall along the perimeter in the layout: a curtain between vertices,
// round towers on the vertices of the river front, plain piers on the rest,
// and a gate where the layout says so. Every piece is
// described in a local frame whose +X points out of the city and whose origin
// sits at the foot of the wall.

const BASE_Y = BANK.height - 0.5;
const MERLON = { width: 1, height: 1.2, spacing: 2.4 };
const RIVER_FRONT = 230; // metres from the river within which the wall has towers
// The tower of Santa Caterina, begun in 1390 on the corner where the wall
// reaches the river: round, with a relief of the saint between two shields
// of the city. Its size is an estimate.
// The wall-walk of the Serrans towers: how far its lip stands out, how tall
// its corbels are, how much narrower the tower is above it, and how far below
// it the walk of the central body runs. Read off photographs and aerial
// views, not measured.
const GALLERY = { lip: 1.2, corbel: 2.3, setBack: 0.87, centreDrop: 2 };
// The dry moat at the foot of the Serrans towers: a trench that follows the
// polygon of each tower round its front and outer flank, with the way in
// between the two. It is documented (filled in 1871, dug out again in 1893);
// the outline is read off an aerial photograph and the depth is a guess.
const MOAT = { depth: 3.2, width: 4.5, causeway: 7.5 };
// The city side of Serrans, as fractions of the height of the towers: how
// tall the lowest arch is, where the middle hall starts and how tall its arch
// is, how tall the upper one is, and how tall the arch of the central body
// is. Read off a photograph.
const BACK = { ground: 0.26, mid: [0.42, 0.26], upper: 0.2, centre: 0.22 };
const SANTA_CATERINA = { radius: 5.6, height: WALL.height + 7 };

// Gates as they stood around 1700, as far as the sources go (docs/sources.md).
// Serrans and Quart survive and are measured; the rest are known only from
// descriptions, and their sizes here are estimates.
const GATE_STYLES = {
  // two towers flanking a lower central body with the arch
  // `gallery` is how far up the towers the corbelled wall-walk runs; above it
  // the towers go on, a little narrower. Widths taken off a photograph.
  // `walledUp`: a prison from 1586 to 1887, with the great arches towards the
  // city filled in and small barred windows in their place.
  serrans: { kind: 'polygonal', radius: 6.6, height: 33, gap: 11.9, centre: 28, gallery: 0.7, squareBack: true, tracery: true, stair: true, moat: true, rear: true, walledUp: true },
  // `step`: the front of the central body stops at a parapet this far up the
  // towers, and the rest stands back behind it to a second one.
  quart: { kind: 'round', radius: 5.3, height: 34, gap: 8.8, centre: 28, step: 0.7, batter: true, squareBack: true, rear: true },
  'sant-josep': { kind: 'round', radius: 4.2, height: 20, gap: 7, centre: 16, batter: true },
  trinitat: { kind: 'square', radius: 3.5, height: 14, gap: 6.5, centre: 11.5 },
  // a single tower with the gate through it
  mar: { kind: 'single', size: 9, height: 15, annex: true },
  'sant-vicent': { kind: 'single', size: 9, height: 14.5, niches: true },
  // no tower: an arch in a taller, slightly projecting stretch of wall
  real: { kind: 'plain', width: 11, height: 12.5 },
  // The small gates of the landward side. Russafa had two square towers and
  // was shut only in 1707; Torrent was an arch through a battlemented tower;
  // the Jueus gate had been a single tower since 1607 and was walled up about
  // 1689; the Coixo and Tints gates were plain openings in the curtain.
  russafa: { kind: 'square', radius: 3.5, height: 14, gap: 6.5, centre: 11.5 },
  torrent: { kind: 'single', size: 8, height: 14 },
  jueus: { kind: 'single', size: 9, height: 14.5, blocked: true },
  coixo: { kind: 'plain', width: 9, height: 11.5 },
  tints: { kind: 'plain', width: 9, height: 11.5 },
};

function createArchGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, 0.9);
  shape.absarc(0, 0.9, 0.5, Math.PI, 0, true);
  shape.lineTo(0.5, 0);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 10);
  geometry.rotateY(Math.PI / 2); // face outwards, along local +X
  return geometry;
}

// A lancet for the blind tracery. The real panel is a field of cusped
// ogees; this is the readable shorthand that stays inside the triangle budget.
function createLancetGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, 0.42);
  shape.quadraticCurveTo(-0.12, 1.28, 0, 1.4);
  shape.quadraticCurveTo(0.12, 1.28, 0.5, 0.42);
  shape.lineTo(0.5, 0);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 5);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

// Slightly pointed, for the Portal del Real ("arco algo apuntado").
// Two centres sit just inside the jambs, so the crown peaks a little above
// a semicircle of the same span. A single quadratic pulled into a triangle.
const POINTED_HEIGHT = 0.9 + Math.sqrt(0.6 * 0.6 - 0.1 * 0.1); // spring plus rise, below
function createPointedArchGeometry() {
  const spring = 0.9;
  const offset = 0.1;
  const radius = 0.5 + offset;
  const rise = Math.sqrt(radius * radius - offset * offset);
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, spring);
  shape.absarc(offset, spring, radius, Math.PI, Math.atan2(rise, -offset), true);
  shape.absarc(-offset, spring, radius, Math.atan2(rise, offset), 0, true);
  shape.lineTo(0.5, 0);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 12);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

// A stone plate in the gate's local frame (X out of the city, Y up, Z along
// the wall) with arched holes cut through it. Used where a flat dark arch
// on a solid box would hide an opening that is actually open.
function createPlateGeometry(width, height, thickness, holes, outerX) {
  const half = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-half, height);
  shape.lineTo(half, height);
  shape.lineTo(half, 0);
  shape.closePath();
  for (const hole of holes) {
    const path = new THREE.Path();
    // rotateY below flips shape X onto -Z, so the hole is authored already flipped.
    const z = -hole.z;
    const a = hole.width / 2;
    const rise = Math.max(0.25, hole.crown - hole.spring);
    path.moveTo(z - a, hole.foot);
    path.lineTo(z - a, hole.spring);
    path.absellipse(z, hole.spring, a, rise, Math.PI, 0, true);
    path.lineTo(z + a, hole.foot);
    path.closePath();
    shape.holes.push(path);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
  geometry.rotateY(Math.PI / 2); // thickness runs along +X
  geometry.translate(outerX - thickness, 0, 0); // outer face lands on outerX
  return geometry;
}

// A stone band standing on arches that are open at the foot: the front of a
// machicolation, seen from outside. One outline and no holes, so the wall
// behind shows through the arches as stone in shadow, not as a dark opening.
function createArcadeGeometry(width, height, thickness, centres, span, outerX, y) {
  const half = width / 2;
  const a = span / 2;
  const spring = height * 0.3;
  const rise = height * 0.58;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-half, height);
  shape.lineTo(half, height);
  shape.lineTo(half, 0);
  for (const z of [...centres].sort((p, q) => q - p)) {
    shape.lineTo(z + a, 0);
    shape.lineTo(z + a, spring);
    shape.absellipse(z, spring, a, rise, 0, Math.PI, false);
    shape.lineTo(z - a, 0);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
  geometry.rotateY(Math.PI / 2); // thickness runs along +X
  geometry.translate(outerX - thickness, y, 0);
  return geometry;
}

// Gives a solid hard edges again: without it the six sides of a polygonal
// tower would be shaded as if it were round.
function faceted(geometry) {
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

export function createWalls(layout, path) {
  const stone = stoneSurface();
  const dark = new THREE.MeshBasicMaterial({ color: COLORS.stoneDark });
  const shaded = stone.clone();
  shaded.color.multiplyScalar(0.62);
  const gloom = stone.clone();
  gloom.color.multiplyScalar(0.36);
  // The ground is one flat sheet with no holes. A pit is drawn first, then an
  // invisible lid that only writes depth, so the ground drawn after them
  // fails the depth test over the opening and the pit shows through.
  const pitWalls = shaded.clone();
  pitWalls.side = THREE.BackSide;
  const pitFloor = createSurface('mottle', 4, { color: 0x6f8048 }); // grass
  const pitLid = new THREE.MeshBasicMaterial({ colorWrite: false });
  const pit = (frame, geometry, material, x, y, z, order = -2) => {
    shade(frame, geometry, material, x, y, z);
    extras[extras.length - 1].renderOrder = order;
  };
  // Away from the river the curtain was rammed earth. Four lifts cover 3.4 m,
  // so each pour is about 85 cm. The river front stays dressed stone.
  const earth = createSurface('tapial', 3.4, { color: 0xc4956a });
  // Quart and the Portal Nou were rough rendered masonry, not dressed stone.
  const render = createSurface('mottle', 3.5, { color: 0xa8987a });
  const pale = createSurface('masonry', 2.5, { color: 0xe6d9b8 });

  const vertices = layout.wall.map(([x, z]) => ({ x, z }));
  const count = vertices.length;
  const centre = vertices.reduce((sum, v) => ({ x: sum.x + v.x / count, z: sum.z + v.z / count }), { x: 0, z: 0 });
  const gateByVertex = new Map(layout.gates.map((gate) => [gate.vertex, gate]));
  const towerByVertex = new Map((layout.towers ?? []).map((tower) => [tower.vertex, tower]));

  const lists = {
    curtains: [],
    earthCurtains: [],
    merlons: [],
    earthMerlons: [],
    earthPiers: [],
    slits: [],
    polygonal: [],
    round: [],
    rendered: [],
    renderedBlocks: [],
    passages: [],
    accents: [],
    arches: [],
    lancets: [],
    pointed: [],
    blind: [],
  };
  const plates = [];
  const extras = []; // one-off meshes
  const local = new THREE.Object3D();

  // A flat patch of darker stone, for surfaces that never see the sun.
  const shade = (frame, geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.updateMatrix();
    mesh.applyMatrix4(frame);
    extras.push(mesh);
  };

  const makeFrame = (x, z, outX, outZ) =>
    new THREE.Matrix4().makeRotationY(yawTowards(outX, outZ)).setPosition(x, BASE_Y, z);

  const place = (list, frame, x, y, z, { yaw = 0, scale = [1, 1, 1] } = {}) => {
    local.position.set(x, y, z);
    local.rotation.set(0, yaw, 0);
    local.scale.set(...scale);
    local.updateMatrix();
    list.push({ matrix: frame.clone().multiply(local.matrix) });
  };

  // Curtain segments
  const segments = vertices.map((a, i) => {
    const b = vertices[(i + 1) % count];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    let outX = (b.z - a.z) / length;
    let outZ = -(b.x - a.x) / length;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    if (outX * (midX - centre.x) + outZ * (midZ - centre.z) < 0) {
      outX = -outX;
      outZ = -outZ;
    }
    return { midX, midZ, outX, outZ, length };
  });

  for (const segment of segments) {
    const frame = makeFrame(segment.midX, segment.midZ, segment.outX, segment.outZ);
    const onRiver = Math.abs(path.project(segment.midX, segment.midZ).lateral) < RIVER_FRONT;
    place(onRiver ? lists.curtains : lists.earthCurtains, frame, 0, WALL.height / 2, 0, {
      scale: [1, 1, segment.length],
    });
    const face = WALL.thickness / 2 - MERLON.width / 2;
    const merlonCount = Math.floor(segment.length / MERLON.spacing);
    for (let i = 0; i < merlonCount; i++) {
      const along = (i + 0.5 - merlonCount / 2) * MERLON.spacing;
      place(onRiver ? lists.merlons : lists.earthMerlons, frame, face, WALL.height + MERLON.height / 2, along);
    }
  }

  // Towers and gates on the vertices
  vertices.forEach((vertex, i) => {
    const before = segments[(i + count - 1) % count];
    const after = segments[i];
    const gate = gateByVertex.get(i);
    const [outX, outZ] = (gate && gateFacing(layout, gate)) ?? [before.outX + after.outX, before.outZ + after.outZ];
    const frame = makeFrame(vertex.x, vertex.z, outX, outZ);
    const merlonRing = (x, z, radius, y, count) => {
      for (let k = 0; k < count; k++) {
        const angle = (k / count) * Math.PI * 2;
        place(lists.merlons, frame, x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius, { yaw: -angle });
      }
    };
    const merlonPolygon = (x, z, radius, y, sides) => {
      const faceR = radius * Math.cos(Math.PI / sides) - MERLON.width / 2;
      const faceW = 2 * radius * Math.sin(Math.PI / sides);
      const perSide = Math.round(faceW / 2);
      for (let f = 0; f < sides; f++) {
        const theta = (f + 0.5) * ((2 * Math.PI) / sides);
        const nx = Math.sin(theta);
        const nz = Math.cos(theta);
        for (let k = 0; k < perSide; k++) {
          const along = ((k + 0.5) / perSide - 0.5) * faceW * 0.9;
          place(lists.merlons, frame, x + nx * faceR + nz * along, y, z + nz * faceR - nx * along, { yaw: -Math.atan2(nz, nx) });
        }
      }
    };
    const merlonSquare = (x, z, half, y) => {
      const rim = half - MERLON.width / 2;
      const steps = Math.max(1, Math.floor(rim / 1.3));
      for (let step = -steps; step <= steps; step++) {
        const along = (step / steps) * rim;
        place(lists.merlons, frame, x + rim, y, z + along);
        place(lists.merlons, frame, x - rim, y, z + along);
        place(lists.merlons, frame, x + along, y, z + rim);
        place(lists.merlons, frame, x + along, y, z - rim);
      }
    };
    const arch = (x, width, height) => place(lists.arches, frame, x, 0.5, 0, { scale: [1, height / 1.4, width] });
    // A pointed opening on a face that looks into the city, with a sill.
    // Walled up, the arch still shows as a patch of rougher masonry with
    // one small window in it.
    const rearArch = (x, y, tall, z, width) => {
      const walled = GATE_STYLES[gate.id].walledUp;
      place(walled ? lists.blind : lists.pointed, frame, x - 0.05, y, z, { yaw: Math.PI, scale: [1, tall / POINTED_HEIGHT, width] });
      place(lists.passages, frame, x - 0.12, y - 0.2, z, { scale: [0.5, 0.4, width + 1.2] });
      if (walled) place(lists.slits, frame, x - 0.09, y + tall * 0.5, z, { yaw: Math.PI, scale: [1, 0.75, 2.4] });
    };

    if (!gate && towerByVertex.get(i)?.id === 'santa-caterina') {
      const { radius, height } = SANTA_CATERINA;
      place(lists.round, frame, 1.3, height / 2, 0, { scale: [radius, height, radius] });
      // a moulding under the parapet, and the parapet itself
      place(lists.round, frame, 1.3, height - 1.6, 0, { scale: [radius + 0.35, 0.5, radius + 0.35] });
      merlonRing(1.3, 0, radius - 0.5, height + MERLON.height / 2, 14);
      // the relief, looking out over the river, between the two shields
      place(lists.accents, frame, 1.3 + radius + 0.02, height * 0.62, 0, { scale: [0.3, 2.6, 2] });
      for (const side of [-1, 1]) {
        place(lists.accents, frame, 1.3 + radius - 0.25, height * 0.62 - 0.5, side * 1.9, { scale: [0.3, 1.1, 0.9], yaw: -side * 0.34 });
        place(lists.slits, frame, 1.3 + radius * 0.94, height * 0.34, side * radius * 0.34);
      }
      return;
    }

    if (!gate) {
      // The plan of 1704 shows towers only along the river front, rounded;
      // elsewhere the wall ran plain from gate to gate.
      if (Math.abs(path.project(vertex.x, vertex.z).lateral) < RIVER_FRONT) {
        const height = WALL.height + 2.5;
        place(lists.round, frame, 1.3, height / 2, 0, { scale: [4.2, height, 4.2] });
        merlonRing(1.3, 0, 3.7, height + MERLON.height / 2, 9);
        place(lists.slits, frame, 5.54, height * 0.6, 0);
      } else {
        place(lists.earthPiers, frame, 0, WALL.height / 2, 0, { scale: [3.8, WALL.height, 3.8] });
      }
      return;
    }

    const style = GATE_STYLES[gate.id];

    if (style.kind === 'plain') {
      place(lists.passages, frame, 0.4, style.height / 2, 0, { scale: [WALL.thickness + 1.4, style.height, style.width] });
      const faceX = 0.4 + (WALL.thickness + 1.4) / 2 + 0.05;
      // Portal del Real: a plain opening with a slightly pointed arch.
      // The other plain gates stay round.
      if (gate.id === 'real') {
        // Same height scale as the round arches (shape 1.4 tall → 6 m). This
        // crown sits a little above that, which is the whole of "algo apuntado".
        place(lists.pointed, frame, faceX, 0.5, 0, { scale: [1, 6 / 1.4, 4.2] });
      } else {
        arch(faceX, 4.2, 6);
      }
      // the same way through, seen from the city
      place(lists.arches, frame, 0.8 - faceX, 0.5, 0, { yaw: Math.PI, scale: [1, 6 / 1.4, 4.2] });
      for (let along = -style.width / 2 + 0.8; along <= style.width / 2 - 0.8; along += MERLON.spacing) {
        place(lists.merlons, frame, 1.2, style.height + MERLON.height / 2, along);
      }
      return;
    }

    if (style.kind === 'single') {
      const x = style.size * 0.2;
      place(lists.passages, frame, x, style.height / 2, 0, { scale: [style.size, style.height, style.size] });
      merlonSquare(x, 0, style.size / 2, style.height + MERLON.height / 2);
      place(lists.accents, frame, x, style.height - 2.2, 0, { scale: [style.size + 0.5, 0.5, style.size + 0.5] });
      // Corbels under the parapet, on the outer face only.
      for (let k = 0; k < 5; k++) {
        const along = ((k + 0.5) / 5 - 0.5) * (style.size - 1.4);
        place(lists.passages, frame, x + style.size / 2 + 0.22, style.height - 0.85, along, { scale: [0.48, 0.5, 0.46] });
      }
      if (style.blocked) {
        // Walled up: the arch shows as a paler patch in the tower
        place(lists.accents, frame, x + style.size / 2 + 0.03, 3.2, 0, { scale: [0.2, 6.4, 4.4] });
      } else {
        arch(x + style.size / 2 + 0.05, 4.4, 6.4);
        // the same way through, seen from the city
        place(lists.arches, frame, x - style.size / 2 - 0.05, 0.5, 0, { yaw: Math.PI, scale: [1, 6.4 / 1.4, 4.4] });
      }
      place(lists.slits, frame, x + style.size / 2 + 0.03, style.height * 0.72, 0);
      if (style.niches) {
        // The two statues of the Vicents, put up in 1677 and 1681
        for (const side of [-1, 1]) {
          place(lists.accents, frame, x + style.size / 2 + 0.15, 8.4, side * 2.7, { scale: [0.4, 2.4, 1.1] });
        }
      }
      if (style.annex) {
        // The Casa de les Armes stood against the wall beside the gate, on
        // the city side: a long plain hall under a tiled roof. Its shape is
        // a sketch. It is set against the next stretch of wall, not on the
        // corner's own frame, or it would stand outside.
        const HALL = { length: 30, depth: 7, height: 8.5, ridge: 2.6 }; // shallow: the houses start 16 m from the wall
        const reach = Math.hypot(after.midX - vertex.x, after.midZ - vertex.z) || 1;
        const along = style.size / 2 + 5 + HALL.length / 2;
        const inward = WALL.thickness / 2 + HALL.depth / 2;
        const hall = makeFrame(
          vertex.x + ((after.midX - vertex.x) / reach) * along - after.outX * inward,
          vertex.z + ((after.midZ - vertex.z) / reach) * along - after.outZ * inward,
          after.outX,
          after.outZ,
        );
        // The great round tower at the far end of it, crenellated, as the
        // engraving of Tosca's plan draws it. Size read off the engraving.
        const KEEP = { radius: 6.5, height: 14 };
        const far = style.size / 2 + 5 + HALL.length + KEEP.radius - 1;
        const keep = makeFrame(
          vertex.x + ((after.midX - vertex.x) / reach) * far - after.outX * (KEEP.radius * 0.4),
          vertex.z + ((after.midZ - vertex.z) / reach) * far - after.outZ * (KEEP.radius * 0.4),
          after.outX,
          after.outZ,
        );
        place(lists.round, keep, 0, KEEP.height / 2, 0, { scale: [KEEP.radius, KEEP.height, KEEP.radius] });
        place(lists.round, keep, 0, KEEP.height - 1.6, 0, { scale: [KEEP.radius + 0.35, 0.5, KEEP.radius + 0.35] });
        for (let k = 0; k < 16; k++) {
          const turn = (k / 16) * Math.PI * 2;
          place(lists.merlons, keep, Math.cos(turn) * (KEEP.radius - 0.5), KEEP.height + MERLON.height / 2, Math.sin(turn) * (KEEP.radius - 0.5), { yaw: -turn });
        }
        place(lists.renderedBlocks, hall, 0, HALL.height / 2, 0, { scale: [HALL.depth, HALL.height, HALL.length] });
        place(lists.accents, hall, 0, HALL.height + 0.15, 0, { scale: [HALL.depth + 0.6, 0.3, HALL.length + 0.6] });
        // A door and a row of windows on the side of the city.
        const face = -HALL.depth / 2 - 0.05;
        place(lists.arches, hall, face, 0.3, 0, { scale: [1, 4.6 / 1.4, 3.2], yaw: Math.PI });
        for (let k = 0; k < 6; k++) {
          const z = ((k + 0.5) / 6 - 0.5) * (HALL.length - 4);
          place(lists.slits, hall, face, HALL.height * 0.68, z, { scale: [1, 1, 2.6], yaw: Math.PI });
          if (Math.abs(z) > 3) place(lists.slits, hall, face, HALL.height * 0.3, z, { scale: [1, 0.8, 2.6], yaw: Math.PI });
        }
        const gable = new THREE.Shape();
        gable.moveTo(-HALL.depth / 2 - 0.5, 0);
        gable.lineTo(0, HALL.ridge);
        gable.lineTo(HALL.depth / 2 + 0.5, 0);
        gable.closePath();
        const roof = new THREE.Mesh(
          new THREE.ExtrudeGeometry(gable, { depth: HALL.length + 0.8, bevelEnabled: false }).translate(0, HALL.height + 0.3, -HALL.length / 2 - 0.4),
          createSurface('tiles', 3, { color: COLORS.roofs[1] }),
        );
        roof.applyMatrix4(hall);
        extras.push(roof);
      }
      return;
    }

    // Two towers and a central body
    const { radius, height, gap } = style;
    const towerX = radius * 0.6;
    const solid = style.kind === 'polygonal' ? lists.polygonal : style.batter ? lists.rendered : lists.round;
    const block = style.batter ? lists.renderedBlocks : lists.passages;
    // Machicolations under the parapet. The lip is a cylinder of 1.1 radii
    // from y = height-1 to height; a corbel centred on the vertex radius
    // sits inside it and never shows. These stand on the face — the flat of
    // a polygon, the shaft of a round tower — and stop inside the lip's
    // outer circle, with the arches just below the overhang. `sides` is 6
    // for a hexagon and 0 for a round tower. CylinderGeometry puts a vertex
    // at theta 0 on +Z, so a face normal is (sin theta, cos theta).
    // `tall` is the height of the corbels of a wall-walk that stands well
    // proud of the shaft: stepped, carrying a lip of `lip` radii, with the
    // arches between them reaching up to it.
    const corbelCourse = (x, z, wallR, lipBottom, sides, { tall = 0, lip = 1.1 } = {}) => {
      const corbelH = tall || 0.64;
      const y = tall ? lipBottom - corbelH / 2 : lipBottom - corbelH / 2 - 0.38;
      const archH = tall ? tall * 0.78 : 0.62;
      const archY = tall ? lipBottom - archH : lipBottom - archH - 0.22;
      const basis = (theta) => {
        const nx = Math.sin(theta);
        const nz = Math.cos(theta);
        return {
          nx,
          nz,
          tx: Math.cos(theta),
          tz: -Math.sin(theta),
          // rotation.y sends the box's local +X (the reach) to (cos yaw, 0, -sin yaw).
          yaw: Math.atan2(-nz, nx),
        };
      };
      const corbel = (theta, along, reach, radial, width, cy = y, h = corbelH) => {
        const { nx, nz, tx, tz, yaw } = basis(theta);
        place(block, frame, x + nx * radial + tx * along, cy, z + nz * radial + tz * along, {
          yaw,
          scale: [reach, h, width],
        });
      };
      const arch = (theta, along, surfaceR, archWidth) => {
        const { nx, nz, tx, tz, yaw } = basis(theta);
        place(lists.arches, frame, x + nx * surfaceR + tx * along, archY, z + nz * surfaceR + tz * along, {
          yaw,
          scale: [1, archH / 1.4, archWidth],
        });
      };
      if (!sides) {
        const count = Math.max(12, Math.round(wallR * 2.6));
        const embed = 0.12;
        const reach = wallR * 0.08 + embed;
        const radial = wallR - embed + reach / 2;
        const step = (2 * Math.PI) / count;
        for (let k = 0; k < count; k++) {
          corbel(k * step, 0, reach, radial, 0.4);
          arch(k * step + step / 2, 0, wallR + 0.05, Math.min(0.82, wallR * step * 0.48));
        }
        return;
      }
      const perFace = 4;
      const faceR = wallR * Math.cos(Math.PI / sides);
      const embed = 0.14;
      // A tall corbel stops just short of the flat of the lip it carries.
      const reach = tall
        ? wallR * lip * Math.cos(Math.PI / sides) - faceR + embed - 0.06
        : Math.max(0.6, wallR * 1.06 - faceR + embed);
      const radial = faceR - embed + reach / 2;
      const faceW = 2 * wallR * Math.sin(Math.PI / sides) * 0.88;
      for (let f = 0; f < sides; f++) {
        const theta = (f + 0.5) * ((2 * Math.PI) / sides);
        for (let i = 0; i < perFace; i++) {
          const along = ((i + 0.5) / perFace - 0.5) * faceW;
          const width = Math.min(0.52, (faceW / perFace) * 0.36);
          if (tall) {
            // two steps, the lower one half as deep
            corbel(theta, along, reach, radial, width, lipBottom - tall / 4, tall / 2);
            corbel(theta, along, reach / 2, faceR - embed + reach / 4, width, lipBottom - tall * 0.75, tall / 2);
          } else {
            corbel(theta, along, reach, radial, width);
          }
          if (i < perFace - 1) {
            arch(theta, along + faceW / perFace / 2, faceR + 0.06, tall ? (faceW / perFace) * 0.62 : Math.min(0.85, (faceW / perFace) * 0.5));
          }
        }
      }
    };
    const walkY = height * (style.gallery ?? 1);
    const upperR = radius * GALLERY.setBack;
    for (const direction of [-1, 1]) {
      const towerZ = direction * gap;
      if (style.kind === 'square') {
        place(lists.passages, frame, towerX, height / 2, towerZ, { scale: [radius * 2, height, radius * 2] });
        merlonSquare(towerX, towerZ, radius, height + MERLON.height / 2);
        place(lists.slits, frame, towerX + radius + 0.03, height * 0.6, towerZ);
        const half = radius;
        const y = height - 0.75;
        for (let k = 0; k < 3; k++) {
          const along = ((k + 0.5) / 3 - 0.5) * radius * 1.4;
          place(lists.passages, frame, towerX + half + 0.22, y, towerZ + along, { scale: [0.46, 0.48, 0.4] });
          place(lists.passages, frame, towerX + along, y, towerZ + half + 0.22, { scale: [0.4, 0.48, 0.46] });
          place(lists.passages, frame, towerX + along, y, towerZ - half - 0.22, { scale: [0.4, 0.48, 0.46] });
        }
        continue;
      }
      if (style.gallery) {
        // Shaft up to the wall-walk, which stands out on tall corbels; the
        // tower goes on above it, set back, to a plain parapet of its own.
        place(solid, frame, towerX, walkY / 2, towerZ, { scale: [radius, walkY, radius] });
        place(solid, frame, towerX, (walkY + height) / 2, towerZ, { scale: [upperR, height - walkY, upperR] });
        place(solid, frame, towerX, walkY - 0.5, towerZ, { scale: [radius * GALLERY.lip, 1, radius * GALLERY.lip] });
        corbelCourse(towerX, towerZ, radius, walkY - 1, 6, { tall: GALLERY.corbel, lip: GALLERY.lip });
        merlonPolygon(towerX, towerZ, radius * GALLERY.lip, walkY + MERLON.height / 2, 6);
        merlonPolygon(towerX, towerZ, upperR, height + MERLON.height / 2, 6);
      } else {
        place(solid, frame, towerX, height / 2, towerZ, { scale: [radius, height, radius] });
        merlonRing(towerX, towerZ, radius * 1.1 - MERLON.width / 2, height + MERLON.height / 2, Math.round(radius * 2.2));
        // Parapet lip. The corbels sit just under it; the shaft below stays plain.
        place(solid, frame, towerX, height - 0.5, towerZ, { scale: [radius * 1.1, 1, radius * 1.1] });
        corbelCourse(towerX, towerZ, radius, height - 1, style.kind === 'polygonal' ? 6 : 0);
      }
      if (style.tracery) {
        // String course a third of the way up, under the blind tracery.
        place(solid, frame, towerX, height / 3, towerZ, { scale: [radius * 1.04, 0.45, radius * 1.04] });
      }
      if (style.batter) {
        // A sloping foot, drawn as a broader band. No cannon scars: those are from 1808.
        place(solid, frame, towerX, 2.5, towerZ, { scale: [radius * 1.15, 5, radius * 1.15] });
        place(solid, frame, towerX, 5.2, towerZ, { scale: [radius * 1.07, 0.6, radius * 1.07] });
      }
      if (style.squareBack) {
        // Towards the city the towers are flat-backed
        const backH = style.gallery ? walkY : height;
        place(block, frame, towerX - radius * 0.8, backH / 2, towerZ, {
          scale: [radius * 1.6, backH, radius * 2],
        });
        if (style.gallery) {
          place(block, frame, towerX - radius * 0.8, (walkY + height) / 2, towerZ, {
            scale: [radius * 1.6, height - walkY, upperR * 2],
          });
        }
        if (style.rear) {
          // Towards the city each tower is open in tall pointed arches, one
          // hall over another. At Serrans there is a third at street level,
          // which the stair hides on the western tower.
          const rear = towerX - radius * 1.6;
          const upperW = style.gallery ? upperR : radius;
          if (style.stair && direction > 0) rearArch(rear, 0.4, height * BACK.ground, towerZ, radius * 1.05);
          rearArch(rear, height * BACK.mid[0], height * BACK.mid[1], towerZ, radius * 2 * 0.64);
          rearArch(rear, style.gallery ? walkY + 0.8 : height * 0.72, height * BACK.upper, towerZ, upperW * 2 * 0.72);
        }
      }
      if (style.batter && style.squareBack) {
        // Ashlar only at the arrises, against the rendered wall.
        for (const side of [-1, 1]) {
          place(lists.accents, frame, towerX - radius * 0.1, height * 0.55, towerZ + side * radius * 0.9, {
            scale: [0.38, height * 0.7, 0.42],
          });
        }
      }
      const face = towerX + radius * (style.kind === 'round' ? 1 : 0.866) + 0.04;
      // With a wall-walk the third slit goes above it, on the narrower body.
      for (const level of style.gallery ? [0.2, 0.45] : [0.2, 0.45, 0.62]) {
        place(lists.slits, frame, face, height * level, towerZ, { scale: [1, height / 17, 1.4] });
      }
      if (style.gallery) {
        place(lists.slits, frame, towerX + upperR * 0.866 + 0.04, height * 0.87, towerZ, { scale: [1, height / 17, 1.4] });
      }
      if (style.walledUp) {
        // As a prison the outer walls were pierced with barred windows; how
        // many there were and where is not known.
        for (const level of [0.3, 0.55]) {
          for (const side of [-1, 1]) place(lists.slits, frame, face, height * level, towerZ + side * 1.7, { scale: [1, 0.85, 3.2] });
        }
      }
    }

    if (style.moat) {
      const street = BANK.height - BASE_Y; // ground level in this frame
      const floor = street - MOAT.depth;
      const lid = street + 0.08;
      const x0 = WALL.thickness / 2 + 0.2;
      // The trench keeps a constant width from the faces of the tower.
      const outerR = radius + MOAT.width / Math.cos(Math.PI / 6);
      const kerb = { height: 0.9, thickness: 0.4 };
      for (const dir of [-1, 1]) {
        // Outline in plan, from the wall round the outer flank and the front
        // to the causeway: [x, distance along the wall from the gate's axis].
        const outline = [
          [x0, gap + outerR],
          [towerX, gap + outerR],
          [towerX + outerR * 0.866, gap + outerR / 2],
          [towerX + outerR * 0.866, MOAT.causeway],
          [x0, MOAT.causeway],
        ].map(([x, along]) => [x, dir * along]);
        // rotateX(-90°) lays the shape flat facing up, with its Y on -Z.
        const plan = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
        const flat = () => new THREE.ShapeGeometry(plan).rotateX(-Math.PI / 2);
        pit(frame, new THREE.ExtrudeGeometry(plan, { depth: MOAT.depth, bevelEnabled: false }).rotateX(-Math.PI / 2), pitWalls, 0, floor, 0);
        pit(frame, flat(), pitFloor, 0, floor + 0.03, 0);
        // the foot of the tower, down to the bottom: the polygon and its flat back
        pit(frame, faceted(new THREE.CylinderGeometry(radius, radius, lid - floor, 6)), stone, towerX, (floor + lid) / 2, dir * gap);
        pit(frame, new THREE.BoxGeometry(towerX - x0 + 1, lid - floor, radius * 2), stone, (towerX + x0 - 1) / 2, (floor + lid) / 2, dir * gap);
        pit(frame, flat(), pitLid, 0, lid, 0, -1);
        // a low parapet along the open sides
        for (let k = 0; k < outline.length - 1; k++) {
          const [ax, az] = outline[k];
          const [bx, bz] = outline[k + 1];
          place(lists.passages, frame, (ax + bx) / 2, street + kerb.height / 2, (az + bz) / 2, {
            yaw: Math.atan2(-(bz - az), bx - ax),
            scale: [Math.hypot(bx - ax, bz - az) + kerb.thickness, kerb.height, kerb.thickness],
          });
        }
      }
    }

    const centreH = style.centre;
    // Behind its front wall the central body stops at a terrace, level with
    // the floor of the upper halls of the towers.
    const terraceY = style.gallery ? walkY - 0.5 : centreH;
    const frontTop = style.step ? height * style.step : centreH;
    const depth = radius * 1.4;
    const front = 1 + depth / 2;
    const back = 1 - depth / 2;
    const open = gap * 2 - radius * 1.2; // the stretch of front between the towers
    const archWidth = Math.min(5, open * 0.5);
    const archHeight = archWidth * 1.3;
    if (style.stair) {
      // Serrans, from the city: the back is open in arches and the passage
      // goes right through. The leaves stay inside the old solid box.
      // One hole per plate: a second hole in the same shape made earcut
      // drop the opening and leave a solid wall.
      const leaf = 1.45;
      const passage = archWidth;
      const spring = archHeight - passage / 2;
      plates.push({
        frame,
        geometry: createPlateGeometry(open, centreH, leaf, [
          { z: 0, width: passage, foot: 0.02, spring, crown: archHeight },
        ], front),
      });
      const innerFront = front - leaf;
      const cityX = back;
      const towerInner = gap - radius;
      const jambW = towerInner - passage / 2 + 0.35;
      const jambZ = passage / 2 + jambW / 2;
      const jambDepth = innerFront - cityX;
      for (const dir of [-1, 1]) {
        place(lists.passages, frame, cityX + jambDepth / 2, terraceY / 2, dir * jambZ, {
          scale: [jambDepth, terraceY, jambW],
        });
      }
      const backLeaf = 1.15;
      const backH = archHeight + 0.6;
      plates.push({
        frame,
        geometry: createPlateGeometry(passage + 1.5, backH, backLeaf, [
          { z: 0, width: passage, foot: 0.02, spring, crown: archHeight },
        ], cityX + backLeaf),
      });
      const hallDepth = innerFront - cityX - backLeaf;
      // Inside the passage it is dark: both walls and the ceiling, so the
      // gateway stands out from the sunlit front.
      const through = front - cityX;
      for (const dir of [-1, 1]) {
        shade(frame, new THREE.PlaneGeometry(through, archHeight).rotateY(dir > 0 ? Math.PI : 0), gloom, cityX + through / 2, archHeight / 2, dir * (passage / 2 - 0.03));
      }
      shade(frame, new THREE.PlaneGeometry(hallDepth, passage - 0.2).rotateX(Math.PI / 2), gloom, cityX + backLeaf + hallDepth / 2, backH - 0.2, 0);
      // The curtain runs on through the gate and would show in the arch as a
      // sunlit wall: a dark face on each side of it reads as the way through.
      for (const dir of [-1, 1]) {
        shade(frame, new THREE.PlaneGeometry(passage, archHeight).rotateY((dir * Math.PI) / 2), gloom, dir * (WALL.thickness / 2 + 0.35), archHeight / 2, 0);
      }
      place(lists.passages, frame, cityX + backLeaf + hallDepth / 2, backH, 0, {
        scale: [hallDepth, 0.35, passage - 0.15],
      });
      // Above the gate the back is one tall hall open to the city through a
      // great pointed arch, wider than the passage below.
      place(lists.passages, frame, cityX + 0.35, (backH + terraceY) / 2, 0, {
        scale: [0.7, terraceY - backH, passage + 0.4],
      });
      const hallFloor = height * BACK.mid[0];
      rearArch(cityX, hallFloor, height * BACK.centre, 0, (gap - radius) * 2 * 0.72);
      // A flight on the terrace, against the back of the front wall, up to
      // its parapet walk.
      const flight = { steps: 9, width: 1.4 };
      const span = (gap - upperR) * 2 - 1;
      for (let step = 0; step < flight.steps; step++) {
        const top = terraceY + ((centreH - 1 - terraceY) * (step + 1)) / flight.steps;
        place(lists.passages, frame, innerFront - flight.width / 2, (terraceY + top) / 2, -span / 2 + ((step + 0.5) * span) / flight.steps, {
          scale: [flight.width, top - terraceY, span / flight.steps],
        });
      }
      place(lists.passages, frame, cityX + jambDepth / 2, terraceY - 0.4, 0, {
        scale: [jambDepth, 0.8, passage + 0.2],
      });
    } else {
      place(block, frame, 1, frontTop / 2, 0, { scale: [depth, frontTop, gap * 2] });
      if (style.step) {
        const setBack = 2.6;
        place(block, frame, 1 - setBack / 2, (frontTop + centreH) / 2, 0, { scale: [depth - setBack, centreH - frontTop, gap * 2] });
        for (let along = -open / 2 + 0.8; along <= open / 2 - 0.8; along += MERLON.spacing) {
          place(lists.merlons, frame, front - setBack - MERLON.width / 2, centreH + MERLON.height / 2, along);
        }
      }
      arch(front + 0.05, archWidth, archHeight);
      // the way through seen from the city and, in the great gates, the hall over it
      place(lists.arches, frame, back - 0.05, 0.5, 0, { yaw: Math.PI, scale: [1, archHeight / 1.4, archWidth] });
      if (style.rear) {
        rearArch(back, height * BACK.mid[0], height * BACK.centre, 0, (gap - radius) * 2 * 0.72);
      }
    }
    place(lists.accents, frame, front + 0.16, archHeight + 1.85, 0, { scale: [0.28, 1.7, 1.5] }); // royal arms
    if (style.tracery) {
      for (const dir of [-1, 1]) {
        place(lists.accents, frame, front + 0.12, archHeight + 1.45, dir * 2.3, { scale: [0.2, 1.05, 0.95] });
      }
    }
    // The string course runs on from the towers where they have one.
    const courseY = style.gallery ? height / 3 : Math.max(centreH / 3, archHeight + 0.85);
    place(block, frame, front + 0.18, courseY, 0, { scale: [0.5, 0.4, open * 0.96] });
    // With a wall-walk the machicolation sits at its level, a little below
    // the towers', and the wall goes on above it to its own parapet.
    const deckY = style.gallery ? walkY - GALLERY.centreDrop : frontTop;
    const corbelH = style.gallery ? GALLERY.corbel : 0.58;
    const corbelY = style.gallery ? deckY - 0.83 - corbelH / 2 : frontTop - 1.28;
    // Four corbels leave three wide arches between the towers, as built.
    const nCorb = style.gallery ? 4 : Math.max(6, Math.round(open / 1.45));
    const corbelSpan = open * 0.92;
    const corbelW = style.gallery ? 0.55 : 0.42;
    const pitch = corbelSpan / nCorb;
    const bays = [];
    for (let i = 0; i < nCorb; i++) {
      const z = -corbelSpan / 2 + (i + 0.5) * pitch;
      place(block, frame, front + 0.62, corbelY, z, { scale: [0.9, corbelH, corbelW] });
      if (i === nCorb - 1) continue;
      if (style.gallery) {
        bays.push(z + pitch / 2);
      } else {
        place(lists.arches, frame, front + 0.22, corbelY - 0.18, z + pitch / 2, {
          scale: [1, 0.46 / 1.4, Math.max(0.4, pitch * 0.55)],
        });
      }
    }
    if (style.gallery) {
      // The arches between the corbels are stone, with the wall behind them.
      plates.push({
        frame,
        geometry: createArcadeGeometry(corbelSpan - pitch + corbelW, corbelH, 0.45, bays, pitch - corbelW, front + 1.07, corbelY - corbelH / 2),
      });
      // Under the walk the wall is always in shade; without shadows nothing
      // else would say so, and the arches would vanish from the river.
      shade(frame, new THREE.PlaneGeometry(corbelSpan - pitch, corbelH).rotateY(Math.PI / 2), shaded, front + 0.03, corbelY, 0);
    }
    // The walk reaches the front of the arcade where there is one.
    const walkDepth = style.gallery ? 1.8 : 1.2;
    const walkX = style.gallery ? front + 0.2 : front - 0.1;
    place(block, frame, walkX, deckY - 0.55, 0, { scale: [walkDepth, 0.55, open] });
    for (let along = -open / 2 + 0.8; along <= open / 2 - 0.8; along += MERLON.spacing) {
      place(lists.merlons, frame, style.gallery ? front + 0.75 : front + 0.2, deckY + MERLON.height / 2, along);
      if (style.gallery) place(lists.merlons, frame, front - 0.6, centreH + MERLON.height / 2, along);
    }
    if (style.gallery) {
      // the one small window of the room over the gate
      place(lists.arches, frame, front + 0.05, deckY + 1.9, 0, { scale: [1, 1.7 / 1.4, 1.1] });
    }
    if (style.tracery) {
      // Blind tracery between the string course and the corbels. The real
      // field is cusped ogees over tall shallow bays; a pale panel, stone
      // mullions and one short row of lancets stand in for it. The lancets
      // stay small so they read as carving and not as windows.
      const panelW = Math.min(open * 0.62, 8.8);
      const panelBottom = courseY + 0.65;
      const friezeH = 1.7;
      const panelTop = corbelY - corbelH / 2 - 0.45;
      const fieldH = panelTop - panelBottom;
      const bayH = fieldH - friezeH;
      place(lists.accents, frame, front + 0.07, panelBottom + bayH / 2, 0, { scale: [0.14, bayH, panelW] });
      place(lists.accents, frame, front + 0.1, panelBottom, 0, { scale: [0.2, 0.26, panelW + 0.5] });
      place(lists.accents, frame, front + 0.1, panelTop, 0, { scale: [0.2, 0.26, panelW + 0.5] });
      place(lists.accents, frame, front + 0.1, (panelBottom + panelTop) / 2, -panelW / 2, { scale: [0.2, fieldH, 0.26] });
      place(lists.accents, frame, front + 0.1, (panelBottom + panelTop) / 2, panelW / 2, { scale: [0.2, fieldH, 0.26] });
      const bays = 7;
      const bay = panelW / bays;
      for (let i = 0; i <= bays; i++) {
        const z = -panelW / 2 + bay * i;
        place(lists.passages, frame, front + 0.16, panelBottom + bayH / 2, z, { scale: [0.18, bayH * 0.92, 0.2] });
      }
      place(lists.passages, frame, front + 0.16, panelBottom + bayH + 0.12, 0, { scale: [0.18, 0.24, panelW] });
      const cols = 9;
      const cell = panelW / cols;
      for (let i = 0; i < cols; i++) {
        const z = -panelW / 2 + cell * (i + 0.5);
        place(lists.lancets, frame, front + 0.2, panelTop - friezeH + 0.18, z, {
          scale: [1, (friezeH * 0.7) / 1.4, cell * 0.4],
        });
      }
    }
    if (style.stair) {
      // The great stair runs along the back of the western tower, not out
      // into the city: it starts beyond the tower's outer corner and climbs
      // towards the gate, landing level with the floor of the middle halls.
      const STAIR = { steps: 22, run: 18, width: 3.2 };
      const rear = towerX - radius * 1.6;
      const x = rear - STAIR.width / 2;
      const top = height * BACK.mid[0];
      const topZ = -(gap - radius); // the corner of the tower nearest the gate
      const going = STAIR.run / STAIR.steps;
      for (let step = 0; step < STAIR.steps; step++) {
        const rise = (top * (STAIR.steps - step)) / STAIR.steps;
        const z = topZ - (step + 0.5) * going;
        place(lists.passages, frame, x, rise / 2, z, { scale: [STAIR.width, rise, going * 1.04] });
        // a parapet on the open side, stepped with the flight
        place(lists.passages, frame, rear - STAIR.width + 0.16, rise + 0.45, z, { scale: [0.32, 0.9, going * 1.04] });
      }
      // the landing, in front of the hall over the gate
      const landing = gap - radius - archWidth / 2;
      // it reaches in to the back of the central body, which stands further out
      const outer = rear - STAIR.width;
      place(lists.passages, frame, (outer + back) / 2, top / 2, topZ + landing / 2, { scale: [back - outer, top, landing] });
      place(lists.passages, frame, rear - STAIR.width + 0.16, top + 0.45, topZ + landing / 2, { scale: [0.32, 0.9, landing] });
    }
  });

  const group = new THREE.Group();
  group.add(
    createInstances(new THREE.BoxGeometry(WALL.thickness, WALL.height, 1), stone, lists.curtains),
    createInstances(new THREE.BoxGeometry(WALL.thickness, WALL.height, 1), earth, lists.earthCurtains),
    createInstances(new THREE.BoxGeometry(MERLON.width, MERLON.height, MERLON.width * 1.2), stone, lists.merlons),
    createInstances(new THREE.BoxGeometry(MERLON.width, MERLON.height, MERLON.width * 1.2), earth, lists.earthMerlons),
    createInstances(new THREE.BoxGeometry(1, 1, 1), earth, lists.earthPiers),
    createInstances(new THREE.BoxGeometry(0.05, 1.6, 0.35), dark, lists.slits),
    createInstances(faceted(new THREE.CylinderGeometry(1, 1, 1, 6)), stone, lists.polygonal),
    createInstances(new THREE.CylinderGeometry(1, 1, 1, 28), stone, lists.round),
    createInstances(new THREE.CylinderGeometry(1, 1, 1, 28), render, lists.rendered),
    createInstances(new THREE.BoxGeometry(1, 1, 1), render, lists.renderedBlocks),
    createInstances(new THREE.BoxGeometry(1, 1, 1), stone, lists.passages),
    createInstances(new THREE.BoxGeometry(1, 1, 1), pale, lists.accents),
    createInstances(createArchGeometry(), dark, lists.arches),
  );
  // Stone, not the opening colour: the frieze is blind carving on the pale field.
  if (lists.lancets.length) group.add(createInstances(createLancetGeometry(), stone, lists.lancets));
  if (lists.pointed.length) group.add(createInstances(createPointedArchGeometry(), dark, lists.pointed));
  if (lists.blind.length) group.add(createInstances(createPointedArchGeometry(), render, lists.blind));
  for (const plate of plates) {
    const mesh = new THREE.Mesh(plate.geometry, stone);
    mesh.matrix.copy(plate.frame);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  group.add(...extras);
  return group;
}
