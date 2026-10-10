import * as THREE from 'three';
import { BANK, WALL, COLORS, yawTowards } from './config.js';
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
const SANTA_CATERINA = { radius: 5.6, height: WALL.height + 7 };

// Gates as they stood around 1700, as far as the sources go (docs/sources.md).
// Serrans and Quart survive and are measured; the rest are known only from
// descriptions, and their sizes here are estimates.
const GATE_STYLES = {
  // two towers flanking a lower central body with the arch
  serrans: { kind: 'polygonal', radius: 6, height: 33, gap: 11, centre: 28, squareBack: true, tracery: true, stair: true },
  quart: { kind: 'round', radius: 5.3, height: 34, gap: 8.8, centre: 27, batter: true, squareBack: true },
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
  // Away from the river the curtain was rammed earth. Four lifts cover 3.4 m,
  // so each pour is about 85 cm. The river front stays dressed stone.
  const earth = createSurface('tapial', 3.4, { color: COLORS.tapial, roughness: 0.98 });
  // Quart and the Portal Nou were rough rendered masonry, not dressed stone.
  const render = createSurface('plaster', 3.5, { color: 0xe4c898, roughness: 0.96 });
  const pale = createSurface('masonry', 2.5, { color: COLORS.stonePale, roughness: 0.88 });

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
  };
  const local = new THREE.Object3D();

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
    const outX = before.outX + after.outX;
    const outZ = before.outZ + after.outZ;
    const frame = makeFrame(vertex.x, vertex.z, outX, outZ);
    const gate = gateByVertex.get(i);
    const merlonRing = (x, z, radius, y, count) => {
      for (let k = 0; k < count; k++) {
        const angle = (k / count) * Math.PI * 2;
        place(lists.merlons, frame, x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius, { yaw: -angle });
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
      arch(0.4 + (WALL.thickness + 1.4) / 2 + 0.05, 4.2, 6);
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
      if (style.blocked) {
        // Walled up: the arch shows as a paler patch in the tower
        place(lists.accents, frame, x + style.size / 2 + 0.03, 3.2, 0, { scale: [0.2, 6.4, 4.4] });
      } else {
        arch(x + style.size / 2 + 0.05, 4.4, 6.4);
      }
      place(lists.slits, frame, x + style.size / 2 + 0.03, style.height * 0.72, 0);
      if (style.niches) {
        // The two statues of the Vicents, put up in 1677 and 1681
        for (const side of [-1, 1]) {
          place(lists.accents, frame, x + style.size / 2 + 0.15, 8.4, side * 2.7, { scale: [0.4, 2.4, 1.1] });
        }
      }
      if (style.annex) {
        // The Casa de les Armes stood against the wall beside the gate
        place(lists.passages, frame, -9, 4.5, 26, { scale: [16, 9, 34] });
        place(lists.accents, frame, -9, 9.2, 26, { scale: [16.6, 0.5, 34.6] });
      }
      return;
    }

    // Two towers and a central body
    const { radius, height, gap } = style;
    const towerX = radius * 0.6;
    const solid = style.kind === 'polygonal' ? lists.polygonal : style.batter ? lists.rendered : lists.round;
    for (const direction of [-1, 1]) {
      const towerZ = direction * gap;
      if (style.kind === 'square') {
        place(lists.passages, frame, towerX, height / 2, towerZ, { scale: [radius * 2, height, radius * 2] });
        merlonSquare(towerX, towerZ, radius, height + MERLON.height / 2);
        place(lists.slits, frame, towerX + radius + 0.03, height * 0.6, towerZ);
        continue;
      }
      place(solid, frame, towerX, height / 2, towerZ, { scale: [radius, height, radius] });
      merlonRing(towerX, towerZ, radius * 1.1 - MERLON.width / 2, height + MERLON.height / 2, Math.round(radius * 2.2));
      // The gallery that juts out on corbels over the top third, and a
      // moulding a third of the way up
      place(solid, frame, towerX, height * 0.8, towerZ, { scale: [radius * 1.13, height * 0.07, radius * 1.13] });
      place(solid, frame, towerX, height - 0.5, towerZ, { scale: [radius * 1.1, 1, radius * 1.1] });
      merlonRing(towerX, towerZ, radius * 1.03, height * 0.745, Math.round(radius * 2.4));
      place(solid, frame, towerX, height / 3, towerZ, { scale: [radius * 1.04, 0.5, radius * 1.04] });
      if (style.batter) {
        // A sloping foot, drawn as a broader band
        place(solid, frame, towerX, 2.5, towerZ, { scale: [radius * 1.15, 5, radius * 1.15] });
        place(solid, frame, towerX, 5.2, towerZ, { scale: [radius * 1.07, 0.6, radius * 1.07] });
      }
      if (style.squareBack) {
        // Towards the city the towers are flat-backed
        place(style.batter ? lists.renderedBlocks : lists.passages, frame, towerX - radius * 0.8, height / 2, towerZ, {
          scale: [radius * 1.6, height, radius * 2],
        });
      }
      const face = towerX + radius * (style.kind === 'round' ? 1 : 0.866) + 0.04;
      for (const level of [0.2, 0.45, 0.62]) {
        place(lists.slits, frame, face, height * level, towerZ, { scale: [1, height / 17, 1.4] });
      }
    }

    const centre = style.centre;
    const depth = radius * 1.4;
    const front = 1 + depth / 2;
    const open = gap * 2 - radius * 1.2; // the stretch of front between the towers
    place(style.batter ? lists.renderedBlocks : lists.passages, frame, 1, centre / 2, 0, { scale: [depth, centre, gap * 2] });
    const archWidth = Math.min(5, open * 0.5);
    arch(front + 0.05, archWidth, archWidth * 1.3);
    place(lists.accents, frame, front + 0.15, archWidth * 1.3 + 2.2, 0, { scale: [0.3, 2.2, 1.8] }); // royal arms
    place(lists.passages, frame, front + 0.25, centre / 3, 0, { scale: [0.6, 0.5, open] });
    // Gallery and battlements over the central body
    place(lists.passages, frame, front, centre * 0.84, 0, { scale: [1.6, centre * 0.07, open] });
    for (let along = -open / 2 + 0.8; along <= open / 2 - 0.8; along += MERLON.spacing) {
      place(lists.merlons, frame, front + 0.4, centre + MERLON.height / 2, along);
      place(lists.merlons, frame, front - 0.2, centre * 0.79, along);
    }
    if (style.tracery) {
      // Blind Gothic arcading between the moulding and the gallery
      const from = centre * 0.44;
      const tall = centre * 0.34;
      place(lists.accents, frame, front + 0.1, from + tall / 2, 0, { scale: [0.25, tall, open * 0.92] });
      for (let along = -open * 0.44; along <= open * 0.44 + 0.01; along += open * 0.11) {
        place(lists.passages, frame, front + 0.22, from + tall / 2, along, { scale: [0.3, tall, 0.24] });
      }
    }
    if (style.stair) {
      // The great stair up the back of one tower
      for (let step = 0; step < 7; step++) {
        const rise = (7 - step) * 1.7;
        place(lists.passages, frame, towerX - radius * 1.6 - 1 - step * 1.6, rise / 2, -gap, { scale: [1.6, rise, radius * 1.5] });
      }
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
  return group;
}
