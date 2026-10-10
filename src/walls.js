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
  };
  const plates = [];
  // A dark wall set back inside an open hall, so a rear arch reads as an
  // opening with depth. Same material the arrow slits and the arches use.
  const halls = [];
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
    const block = style.batter ? lists.renderedBlocks : lists.passages;
    // Machicolations under the parapet. The lip is a cylinder of 1.1 radii
    // from y = height-1 to height; a corbel centred on the vertex radius
    // sits inside it and never shows. These stand on the face — the flat of
    // a polygon, the shaft of a round tower — and stop inside the lip's
    // outer circle, with the arches just below the overhang. `sides` is 6
    // for a hexagon and 0 for a round tower. CylinderGeometry puts a vertex
    // at theta 0 on +Z, so a face normal is (sin theta, cos theta).
    const corbelCourse = (x, z, wallR, lipBottom, sides) => {
      const corbelH = 0.64;
      const y = lipBottom - corbelH / 2 - 0.38;
      const archH = 0.62;
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
      const corbel = (theta, along, reach, radial, width) => {
        const { nx, nz, tx, tz, yaw } = basis(theta);
        place(block, frame, x + nx * radial + tx * along, y, z + nz * radial + tz * along, {
          yaw,
          scale: [reach, corbelH, width],
        });
      };
      const arch = (theta, along, surfaceR, archWidth) => {
        const { nx, nz, tx, tz, yaw } = basis(theta);
        place(lists.arches, frame, x + nx * surfaceR + tx * along, lipBottom - archH - 0.22, z + nz * surfaceR + tz * along, {
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
      const reach = Math.max(0.6, wallR * 1.06 - faceR + embed);
      const radial = faceR - embed + reach / 2;
      const faceW = 2 * wallR * Math.sin(Math.PI / sides) * 0.88;
      for (let f = 0; f < sides; f++) {
        const theta = (f + 0.5) * ((2 * Math.PI) / sides);
        for (let i = 0; i < perFace; i++) {
          const along = ((i + 0.5) / perFace - 0.5) * faceW;
          corbel(theta, along, reach, radial, Math.min(0.52, (faceW / perFace) * 0.36));
          if (i < perFace - 1) {
            arch(theta, along + faceW / perFace / 2, faceR + 0.06, Math.min(0.85, (faceW / perFace) * 0.5));
          }
        }
      }
    };
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
      place(solid, frame, towerX, height / 2, towerZ, { scale: [radius, height, radius] });
      merlonRing(towerX, towerZ, radius * 1.1 - MERLON.width / 2, height + MERLON.height / 2, Math.round(radius * 2.2));
      // Parapet lip. The corbels sit just under it; the shaft below stays plain.
      place(solid, frame, towerX, height - 0.5, towerZ, { scale: [radius * 1.1, 1, radius * 1.1] });
      corbelCourse(towerX, towerZ, radius, height - 1, style.kind === 'polygonal' ? 6 : 0);
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
        place(block, frame, towerX - radius * 0.8, height / 2, towerZ, {
          scale: [radius * 1.6, height, radius * 2],
        });
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
      for (const level of [0.2, 0.45, 0.62]) {
        place(lists.slits, frame, face, height * level, towerZ, { scale: [1, height / 17, 1.4] });
      }
    }

    const centreH = style.centre;
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
        place(lists.passages, frame, cityX + jambDepth / 2, centreH / 2, dir * jambZ, {
          scale: [jambDepth, centreH, jambW],
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
      place(lists.passages, frame, cityX + backLeaf + hallDepth / 2, backH, 0, {
        scale: [hallDepth, 0.35, passage - 0.15],
      });
      const pierW = 0.62;
      const logTop = centreH - 1.35;
      place(lists.passages, frame, cityX - 0.15, (backH + logTop) / 2, 0, {
        scale: [0.7, logTop - backH, pierW],
      });
      const bay = (passage - pierW) / 2;
      const levels = 3;
      const lintel = 0.5;
      const band = (logTop - backH - lintel * (levels - 1)) / levels;
      for (let level = 0; level < levels; level++) {
        const y0 = backH + level * (band + lintel);
        for (const dir of [-1, 1]) {
          place(lists.arches, frame, cityX - 0.08, y0, dir * (pierW / 2 + bay / 2), {
            yaw: Math.PI,
            scale: [1, (band * 0.92) / 1.4, bay * 0.86],
          });
        }
        if (level < levels - 1) {
          place(lists.passages, frame, cityX - 0.18, y0 + band * 0.92 + lintel / 2, 0, {
            scale: [0.5, lintel, passage + 0.3],
          });
        }
      }
      halls.push({
        frame,
        w: passage - 0.25,
        h: logTop - backH,
        x: innerFront - 0.2,
        y: (backH + logTop) / 2,
        z: 0,
      });
      place(lists.passages, frame, cityX + jambDepth / 2, centreH - 0.4, 0, {
        scale: [jambDepth, 0.8, passage + 0.2],
      });
    } else {
      place(block, frame, 1, centreH / 2, 0, { scale: [depth, centreH, gap * 2] });
      arch(front + 0.05, archWidth, archHeight);
    }
    place(lists.accents, frame, front + 0.16, archHeight + 1.85, 0, { scale: [0.28, 1.7, 1.5] }); // royal arms
    if (style.tracery) {
      for (const dir of [-1, 1]) {
        place(lists.accents, frame, front + 0.12, archHeight + 1.45, dir * 2.3, { scale: [0.2, 1.05, 0.95] });
      }
    }
    const courseY = Math.max(centreH / 3, archHeight + 0.85);
    place(block, frame, front + 0.18, courseY, 0, { scale: [0.5, 0.4, open * 0.96] });
    const corbelY = centreH - 1.28;
    const nCorb = Math.max(6, Math.round(open / 1.45));
    const corbelSpan = open * 0.92;
    for (let i = 0; i < nCorb; i++) {
      const z = -corbelSpan / 2 + ((i + 0.5) / nCorb) * corbelSpan;
      place(block, frame, front + 0.62, corbelY, z, { scale: [0.9, 0.58, 0.42] });
      if (i < nCorb - 1) {
        const z2 = -corbelSpan / 2 + ((i + 1.5) / nCorb) * corbelSpan;
        place(lists.arches, frame, front + 0.22, corbelY - 0.18, (z + z2) / 2, {
          scale: [1, 0.46 / 1.4, Math.max(0.4, (corbelSpan / nCorb) * 0.55)],
        });
      }
    }
    place(block, frame, front - 0.1, centreH - 0.55, 0, { scale: [1.2, 0.55, open] });
    for (let along = -open / 2 + 0.8; along <= open / 2 - 0.8; along += MERLON.spacing) {
      place(lists.merlons, frame, front + 0.2, centreH + MERLON.height / 2, along);
    }
    if (style.tracery) {
      // Blind tracery between the string course and the gallery. The real
      // field is cusped ogees over tall shallow bays; a pale panel, stone
      // mullions and one short row of lancets stand in for it. The lancets
      // stay small so they read as carving and not as windows.
      const panelW = Math.min(open * 0.62, 8.8);
      const panelBottom = courseY + 0.65;
      const galH = 4.3;
      const galBottom = corbelY - 0.4 - galH;
      const friezeH = 1.7;
      const panelTop = galBottom - 0.4;
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
      for (const dir of [-1, 1]) {
        place(lists.arches, frame, front + 0.2, galBottom, dir * panelW * 0.23, {
          scale: [1, galH / 1.4, panelW * 0.36],
        });
      }
      place(lists.passages, frame, front + 0.24, galBottom + galH * 0.42, 0, { scale: [0.32, galH * 0.7, 0.55] });
    }
    if (style.stair) {
      // The great stair up the back of the western tower, inside the old run.
      const steps = 16;
      const xTop = towerX - radius * 1.6 - 1;
      const run = 6 * 1.6;
      const topRise = 11.9;
      const tread = radius * 1.5;
      for (let step = 0; step < steps; step++) {
        const t = step / (steps - 1);
        const rise = topRise + (1.7 - topRise) * t;
        place(lists.passages, frame, xTop - t * run, rise / 2, -gap, {
          scale: [(run / (steps - 1)) * 1.08, rise, tread],
        });
      }
      for (let step = 0; step < steps; step += 2) {
        const t = step / (steps - 1);
        const rise = topRise + (1.7 - topRise) * t;
        place(lists.passages, frame, xTop - t * run, rise + 0.4, -gap - tread / 2 + 0.18, {
          scale: [0.65, 0.8, 0.32],
        });
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
  // Stone, not the opening colour: the frieze is blind carving on the pale field.
  if (lists.lancets.length) group.add(createInstances(createLancetGeometry(), stone, lists.lancets));
  if (lists.pointed.length) group.add(createInstances(createPointedArchGeometry(), dark, lists.pointed));
  for (const plate of plates) {
    const mesh = new THREE.Mesh(plate.geometry, stone);
    mesh.matrix.copy(plate.frame);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  for (const hall of halls) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(hall.w, hall.h), dark);
    // Plane faces +Z. rotation.y of -π/2 sends that normal to -X, the city.
    const localM = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    localM.setPosition(hall.x, hall.y, hall.z);
    mesh.matrix.copy(hall.frame).multiply(localM);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}
