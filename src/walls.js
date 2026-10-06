import * as THREE from 'three';
import { BANK, WALL, COLORS, yawTowards } from './config.js';
import { createInstances } from './instancing.js';
import { stoneSurface } from './materials.js';

// City wall along the perimeter in the layout: a curtain between vertices, a
// tower on every vertex and a gate where the layout says so. Every piece is
// described in a local frame whose +X points out of the city and whose origin
// sits at the foot of the wall.

const BASE_Y = BANK.height - 0.5;
const MERLON = { width: 1, height: 1.2, spacing: 2.4 };
const TOWER = { size: 8, height: WALL.height + 5, offset: 2.5 };

// Proportions only: the two surviving gates are far taller than the wall, and
// Quart is the one with round towers. The other two great gates are drawn
// larger than the minor ones, without evidence for their shape.
const GATE_STYLES = {
  minor: { radius: 5, height: 17, gap: 7, round: false },
  mar: { radius: 6, height: 22, gap: 8, round: false },
  'sant-vicent': { radius: 6, height: 22, gap: 8, round: false },
  serrans: { radius: 7.5, height: 30, gap: 9.5, round: false },
  quart: { radius: 7.5, height: 30, gap: 9.5, round: true },
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

export function createWalls(layout) {
  const stone = stoneSurface();
  const dark = new THREE.MeshBasicMaterial({ color: COLORS.stoneDark });

  const vertices = layout.wall.map(([x, z]) => ({ x, z }));
  const count = vertices.length;
  const centre = vertices.reduce((sum, v) => ({ x: sum.x + v.x / count, z: sum.z + v.z / count }), { x: 0, z: 0 });
  const gateByVertex = new Map(layout.gates.map((gate) => [gate.vertex, gate]));

  const lists = { curtains: [], merlons: [], towers: [], slits: [], polygonal: [], round: [], passages: [], arches: [] };
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
    place(lists.curtains, frame, 0, WALL.height / 2, 0, { scale: [1, 1, segment.length] });
    const face = WALL.thickness / 2 - MERLON.width / 2;
    const merlonCount = Math.floor(segment.length / MERLON.spacing);
    for (let i = 0; i < merlonCount; i++) {
      const along = (i + 0.5 - merlonCount / 2) * MERLON.spacing;
      place(lists.merlons, frame, face, WALL.height + MERLON.height / 2, along);
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

    if (!gate) {
      const rim = TOWER.size / 2 - MERLON.width / 2;
      const top = TOWER.height + MERLON.height / 2;
      place(lists.towers, frame, TOWER.offset, TOWER.height / 2, 0);
      place(lists.slits, frame, TOWER.offset + TOWER.size / 2 + 0.02, TOWER.height * 0.65, 0);
      for (let step = -1; step <= 1; step++) {
        const along = step * rim;
        place(lists.merlons, frame, TOWER.offset + rim, top, along);
        place(lists.merlons, frame, TOWER.offset - rim, top, along);
        place(lists.merlons, frame, TOWER.offset + along, top, rim);
        place(lists.merlons, frame, TOWER.offset + along, top, -rim);
      }
      return;
    }

    const style = GATE_STYLES[gate.id] ?? GATE_STYLES.minor;
    const towerX = style.radius * 0.6;
    for (const direction of [-1, 1]) {
      const towerZ = direction * style.gap;
      place(style.round ? lists.round : lists.polygonal, frame, towerX, style.height / 2, towerZ, {
        scale: [style.radius, style.height, style.radius],
      });
      const crown = style.radius - MERLON.width / 2;
      const crownCount = Math.round(style.radius * 2);
      for (let k = 0; k < crownCount; k++) {
        const angle = (k / crownCount) * Math.PI * 2;
        place(
          lists.merlons,
          frame,
          towerX + Math.cos(angle) * crown,
          style.height + MERLON.height / 2,
          towerZ + Math.sin(angle) * crown,
          { yaw: -angle },
        );
      }
    }
    const passageHeight = style.height * 0.75;
    const passageDepth = style.radius * 1.2;
    place(lists.passages, frame, 1, passageHeight / 2, 0, {
      scale: [passageDepth, passageHeight, style.gap * 2],
    });
    const archSize = style.radius * 0.9;
    place(lists.arches, frame, 1 + passageDepth / 2 + 0.05, 0.5, 0, { scale: [1, archSize, archSize] });
  });

  const group = new THREE.Group();
  group.add(
    createInstances(new THREE.BoxGeometry(WALL.thickness, WALL.height, 1), stone, lists.curtains),
    createInstances(new THREE.BoxGeometry(MERLON.width, MERLON.height, MERLON.width * 1.2), stone, lists.merlons),
    createInstances(new THREE.BoxGeometry(TOWER.size, TOWER.height, TOWER.size), stone, lists.towers),
    createInstances(new THREE.BoxGeometry(0.05, 1.6, 0.35), dark, lists.slits),
    createInstances(faceted(new THREE.CylinderGeometry(1, 1, 1, 6)), stone, lists.polygonal),
    createInstances(new THREE.CylinderGeometry(1, 1, 1, 28), stone, lists.round),
    createInstances(new THREE.BoxGeometry(1, 1, 1), stone, lists.passages),
    createInstances(createArchGeometry(), dark, lists.arches),
  );
  return group;
}
