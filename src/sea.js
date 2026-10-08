import * as THREE from 'three';
import { RIVER, BANK, COLORS, createRandom, yawTowards } from './config.js';
import { TEXTURES, createSurface } from './materials.js';
import { createInstances } from './instancing.js';
import { waveHeight } from './water.js';
import { PRETIL } from './riverside.js';
import { createCrownGeometry } from './environment.js';

const SAND = 0xd2b48c;
const BRICK = 0xa85a3a;
const PALE = 0xe9dcc0;
const DOME = 0x3f6f9f;

// Same widening as the water mesh. The banks and the beach stay outside it,
// or the boat sails through the sand.
function waterHalf(path, s) {
  const cityHalf = RIVER.width / 2 + BANK.slopeRun;
  if (s < path.mouth - 600) return cityHalf;
  if (s < path.mouth) {
    const t = THREE.MathUtils.smoothstep(s, path.mouth - 600, path.mouth);
    return cityHalf + (480 - cityHalf) * t;
  }
  const span = Math.max(path.step, path.seaEnd - path.mouth);
  const t = Math.min(1, (s - path.mouth) / span);
  return 480 + (700 - 480) * t;
}

// Ground past the city banks: low fields, then the beach and the sea.
// The city parapet and its street stop at path.garden; this meets them there.
export function createSea(scene, path, layout, waterMaterial) {
  const group = new THREE.Group();
  // Fields stop as the beach takes over. Past here the channel is open water.
  const fieldEnd = path.mouth - 200;
  const stretch = path.samples.filter((sample) => sample.s >= path.garden - 0.01 && sample.s <= fieldEnd);
  const mouth = path.pointAt(path.mouth);
  const yaw = yawTowards(mouth.tx, mouth.tz);

  const drop = (s) => THREE.MathUtils.smoothstep(s, path.garden, path.garden + 80);
  const fieldHeight = (s) => THREE.MathUtils.lerp(BANK.height, 1.15, drop(s));
  // The inner edge follows the parapet, then the opening channel, so the
  // grass never lies over water the boat can reach.
  const shore = (s) => Math.max(PRETIL.offset + PRETIL.thickness, waterHalf(path, s) - 1);
  const fieldReach = (s) => {
    const t = THREE.MathUtils.smoothstep(s, path.mouth - 400, path.mouth);
    return Math.max(shore(s) + 36, THREE.MathUtils.lerp(620, 140, t));
  };

  const grass = createSurface('mottle', 9, { color: COLORS.grass, side: THREE.DoubleSide });
  const earth = createSurface('mottle', 6, { color: 0x8a7a48, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    group.add(new THREE.Mesh(ribbon(stretch, (sample) => [
      [side * shore(sample.s), fieldHeight(sample.s)],
      [side * fieldReach(sample.s), fieldHeight(sample.s)],
    ]), grass));
    group.add(new THREE.Mesh(ribbon(stretch, (sample) => [
      [side * (waterHalf(path, sample.s) - 8), -0.6],
      [side * shore(sample.s), fieldHeight(sample.s)],
    ]), earth));
  }

  // A ditch each side, sitting on the fields. Detail, not a surveyed channel.
  // It starts as the parapet sinks, so the bank does not go bare between the two.
  const ditchSamples = stretch.filter((sample) => sample.s >= path.garden + 70 && sample.s <= path.mouth - 620);
  let ditchMaterial = null;
  if (ditchSamples.length > 1) {
    ditchMaterial = new THREE.MeshStandardMaterial({ color: waterMaterial.color, roughness: 0.6 });
    for (const side of [-1, 1]) {
      // Wider lateral second, so the north ditch faces up like the south one.
      const mesh = new THREE.Mesh(ribbon(ditchSamples, (sample) => {
        const y = fieldHeight(sample.s) + 0.12;
        const inner = side * 96;
        const outer = side * 100;
        return side > 0 ? [[inner, y], [outer, y]] : [[outer, y], [inner, y]];
      }), ditchMaterial);
      group.add(mesh);
    }
  }

  const facades = new THREE.MeshStandardMaterial({
    map: TEXTURES.facade,
    emissive: 0xffffff,
    emissiveMap: TEXTURES.facadeGlow,
    emissiveIntensity: 0,
    roughness: 0.95,
  });
  group.add(
    createReeds(path, stretch, fieldHeight, shore),
    createOrchards(path, fieldHeight, shore),
    createFarms(path, fieldHeight, shore, facades),
    createParapetEnd(path, fieldHeight),
    createCamino(path, fieldHeight, shore),
    createPlots(path, fieldHeight, shore, fieldReach),
    createEdgeTrees(path, fieldHeight, shore),
    createBarracas(path, fieldHeight, shore),
    createMill(path, fieldHeight, shore),
  );

  const beach = createBeach(mouth, path);
  const sea = createSeaPlane(mouth, waterMaterial);
  group.add(beach.mesh, sea.mesh, createBars(path));
  if (layout.sea?.grau) group.add(createGrau(path, layout.sea.grau, mouth, yaw));

  scene.add(group);

  function update(time, centreRow) {
    if (ditchMaterial) ditchMaterial.color.copy(waterMaterial.color);
    const here = path.samples[Math.min(centreRow, path.samples.length - 1)];
    if (!here || here.s < path.mouth - 900) return;
    sea.animate(time);
  }

  return { update, facades };
}

function ribbon(samples, sectionAt) {
  const columns = sectionAt(samples[0]).length;
  const positions = new Float32Array(samples.length * columns * 3);
  const indices = [];
  samples.forEach((sample, row) => {
    sectionAt(sample).forEach(([lateral, height], column) => {
      const offset = (row * columns + column) * 3;
      positions[offset] = sample.x + sample.rx * lateral;
      positions[offset + 1] = height;
      positions[offset + 2] = sample.z + sample.rz * lateral;
    });
    if (row === samples.length - 1) return;
    for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createReeds(path, stretch, fieldHeight, shore) {
  const random = createRandom(1702);
  const items = [];
  const dummy = new THREE.Object3D();
  for (const sample of stretch) {
    if (sample.s < path.garden + 40 || sample.s > path.mouth - 80) continue;
    if (Math.round(sample.s / path.step) % 2 !== 0) continue;
    for (const side of [-1, 1]) {
      for (let n = 0; n < 3; n++) {
        const lateral = side * (shore(sample.s) + 1 + random() * 5);
        const height = 1.4 + random() * 1.1;
        dummy.position.set(
          sample.x + sample.rx * lateral,
          fieldHeight(sample.s) + height / 2,
          sample.z + sample.rz * lateral,
        );
        dummy.rotation.set(0, random() * 3, 0);
        dummy.scale.set(0.35 + random() * 0.3, height, 0.35 + random() * 0.3);
        dummy.updateMatrix();
        items.push({ matrix: dummy.matrix.clone() });
      }
    }
  }
  return createInstances(
    new THREE.ConeGeometry(0.35, 1, 5),
    new THREE.MeshStandardMaterial({ color: 0x6d7d42, roughness: 1 }),
    items,
  );
}

function createOrchards(path, fieldHeight, shore) {
  const random = createRandom(1710);
  const trunks = [];
  const crowns = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 160; i++) {
    const s = path.garden + 80 + random() * (path.mouth - path.garden - 430);
    const sample = path.pointAt(s);
    const side = random() < 0.5 ? -1 : 1;
    // Behind the track and the ditch, so the row along the bank stays readable.
    const lateral = side * (shore(s) + 40 + random() * 150);
    const x = sample.x + sample.rx * lateral;
    const z = sample.z + sample.rz * lateral;
    const scale = 0.7 + random() * 0.8;
    const ground = fieldHeight(s);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.position.set(x, ground + scale, z);
    dummy.updateMatrix();
    trunks.push({ matrix: dummy.matrix.clone() });
    dummy.position.set(x, ground + scale * 3.6, z);
    dummy.updateMatrix();
    crowns.push({ matrix: dummy.matrix.clone() });
  }
  const group = new THREE.Group();
  group.add(
    createInstances(
      new THREE.CylinderGeometry(0.25, 0.35, 2, 6),
      new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1 }),
      trunks,
    ),
    createInstances(
      new THREE.IcosahedronGeometry(2.2, 0),
      createSurface('mottle', 2.2, { color: COLORS.foliage }),
      crowns,
    ),
  );
  return group;
}

function createFarms(path, fieldHeight, shore, facades) {
  const random = createRandom(1708);
  const bodies = [];
  const roofs = [];
  const dummy = new THREE.Object3D();
  const roofGeometry = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  roofGeometry.rotateY(Math.PI / 4);
  for (let i = 0; i < 8; i++) {
    const s = path.garden + 200 + random() * Math.max(40, path.mouth - path.garden - 700);
    const sample = path.pointAt(s);
    const side = i < 4 ? 1 : -1;
    const lateral = side * (shore(s) + 120 + random() * 70);
    const width = 12 + random() * 4;
    const depth = 8 + random() * 4;
    const height = 7 + random() * 2;
    const roof = 2.2 + random();
    const y = fieldHeight(s);
    const x = sample.x + sample.rx * lateral;
    const z = sample.z + sample.rz * lateral;
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.position.set(x, y + height / 2, z);
    dummy.scale.set(width, height, depth);
    dummy.updateMatrix();
    bodies.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(COLORS.houseWalls[i % COLORS.houseWalls.length]) });
    dummy.position.set(x, y + height + roof / 2, z);
    dummy.scale.set(width * 1.08, roof, depth * 1.08);
    dummy.updateMatrix();
    roofs.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(COLORS.roofs[i % COLORS.roofs.length]) });
  }
  const group = new THREE.Group();
  group.add(
    createInstances(new THREE.BoxGeometry(1, 1, 1), facades, bodies),
    createInstances(roofGeometry, createSurface('tiles', 3), roofs),
  );
  return group;
}

// The stone parapet used to stop in a cut. For a short run it sinks into the bank.
function createParapetEnd(path, fieldHeight) {
  const run = 80;
  const samples = path.samples.filter((sample) => sample.s >= path.garden - 0.01 && sample.s <= path.garden + run);
  if (samples.length < 2) return new THREE.Group();
  const stone = createSurface('masonry', 3, { color: COLORS.stone, side: THREE.DoubleSide });
  const top = BANK.height + PRETIL.parapet;
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    group.add(new THREE.Mesh(ribbon(samples, (sample) => {
      const t = THREE.MathUtils.smoothstep(sample.s, path.garden, path.garden + run);
      const ground = fieldHeight(sample.s);
      const crest = THREE.MathUtils.lerp(top, ground + 0.2, t);
      const foot = THREE.MathUtils.lerp(PRETIL.foot, ground + 0.08, t);
      const street = THREE.MathUtils.lerp(BANK.height, ground + 0.08, t);
      const inner = side * PRETIL.offset;
      const outer = side * (PRETIL.offset + PRETIL.thickness);
      return [
        [inner, foot],
        [inner, crest],
        [outer, crest],
        [outer, street],
      ];
    }), stone));
  }
  return group;
}

// Dirt track on the north bank, from the end of the street toward the Grau.
// The line is not a survey of the camí del Grau; it is the way a boat would
// keep seeing that road once the parapet has stopped.
function createCamino(path, fieldHeight, shore) {
  const samples = path.samples.filter((sample) => sample.s >= path.garden + 36 && sample.s <= path.mouth - 280);
  if (samples.length < 2) return new THREE.Group();
  const material = createSurface('mottle', 4, { color: 0x9a7d52, side: THREE.DoubleSide });
  return new THREE.Mesh(ribbon(samples, (sample) => {
    const y = fieldHeight(sample.s) + 0.14;
    const inner = -(shore(sample.s) + 17);
    const outer = -(shore(sample.s) + 23);
    return [[outer, y], [inner, y]];
  }), material);
}

// Strips of crop and stubble, so the bank reads as worked ground, not one lawn.
function createPlots(path, fieldHeight, shore, fieldReach) {
  const crop = createSurface('mottle', 8, { color: 0xffffff });
  const items = [];
  const dummy = new THREE.Object3D();
  const colors = [0x4c7a34, 0x6e8f3e, 0xc4a15a, 0x3f6a30];
  const band = 34;
  let index = 0;
  for (let s = path.garden + 100; s < path.mouth - 260; s += band) {
    const sample = path.pointAt(s + 11);
    const yaw = yawTowards(sample.tx, sample.tz);
    const near = shore(s) + 32;
    const far = Math.min(shore(s) + 210, fieldReach(s) - 16);
    const spans = [];
    if (s >= path.mouth - 620) {
      if (far - near > 12) spans.push([near, far]);
    } else {
      if (near < 88) spans.push([near, Math.min(far, 88)]);
      if (far > 108) spans.push([Math.max(near, 108), far]);
    }
    for (const side of [-1, 1]) {
      for (const [inner, outer] of spans) {
        if (outer - inner < 10) continue;
        const lateral = side * ((inner + outer) / 2);
        dummy.rotation.set(0, yaw, 0);
        dummy.position.set(
          sample.x + sample.rx * lateral,
          fieldHeight(s) + 0.06,
          sample.z + sample.rz * lateral,
        );
        dummy.scale.set(22, 0.08, outer - inner);
        dummy.updateMatrix();
        items.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(colors[index % colors.length]) });
        index += 1;
      }
    }
  }
  return createInstances(new THREE.BoxGeometry(1, 1, 1), crop, items);
}

// The city orchard stops with the parapet. The same trees carry on along the
// north bank, one row, not a second forest.
function createEdgeTrees(path, fieldHeight, shore) {
  const trunks = [];
  const crowns = [];
  const dummy = new THREE.Object3D();
  const random = createRandom(1716);
  const end = path.mouth - 240;
  for (let s = path.garden + 8; s < end; s += 22) {
    const sample = path.pointAt(s);
    const lateral = -(shore(s) + 10 + random() * 3);
    const x = sample.x + sample.rx * lateral;
    const z = sample.z + sample.rz * lateral;
    const scale = 0.75 + random() * 0.7;
    const ground = fieldHeight(s);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.position.set(x, ground + scale, z);
    dummy.updateMatrix();
    trunks.push({ matrix: dummy.matrix.clone() });
    dummy.position.set(x, ground + scale * 3.8, z);
    dummy.updateMatrix();
    crowns.push({ matrix: dummy.matrix.clone() });
    dummy.scale.setScalar(scale * 0.7);
    dummy.position.set(
      x + sample.tx * scale * 1.5,
      ground + scale * 4.9,
      z + sample.tz * scale * 1.5,
    );
    dummy.updateMatrix();
    crowns.push({ matrix: dummy.matrix.clone() });
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
      crowns,
    ),
  );
  return group;
}

// Low thatched huts. The shape is the barraca of the huerta, not a named house.
function createBarracas(path, fieldHeight, shore) {
  const random = createRandom(1714);
  const walls = [];
  const roofs = [];
  const dummy = new THREE.Object3D();
  const roofGeometry = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  roofGeometry.rotateY(Math.PI / 4);
  const thatch = new THREE.Color(0xc4a86a);
  for (let s = path.garden + 160; s < path.mouth - 700; s += 190) {
    for (const side of [-1, 1]) {
      if (random() < 0.22) continue;
      const at = s + (random() - 0.5) * 36;
      const sample = path.pointAt(at);
      const lateral = side * (shore(at) + 52 + random() * 18);
      if (Math.abs(lateral) < waterHalf(path, at) + 14) continue;
      const x = sample.x + sample.rx * lateral;
      const z = sample.z + sample.rz * lateral;
      const ground = fieldHeight(at);
      const length = 8 + random() * 2;
      const width = 4.2 + random() * 0.6;
      const height = 2.3 + random() * 0.4;
      const roof = 3.2 + random() * 0.6;
      const yaw = yawTowards(sample.tx, sample.tz) + (random() - 0.5) * 0.4;
      dummy.rotation.set(0, yaw, 0);
      dummy.position.set(x, ground + height / 2, z);
      dummy.scale.set(length, height, width);
      dummy.updateMatrix();
      walls.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(0xf4efe4) });
      dummy.position.set(x, ground + height + roof / 2, z);
      dummy.scale.set(length * 1.05, roof, width * 1.15);
      dummy.updateMatrix();
      roofs.push({ matrix: dummy.matrix.clone(), color: thatch });
    }
  }
  const group = new THREE.Group();
  group.add(
    createInstances(new THREE.BoxGeometry(1, 1, 1), createSurface('mottle', 3, { color: 0xffffff }), walls),
    createInstances(roofGeometry, createSurface('mottle', 2, { color: 0xffffff }), roofs),
  );
  return group;
}

// One mill beside the north ditch. A type, not a mill we can place by name.
function createMill(path, fieldHeight, shore) {
  const s = path.garden + 480;
  const sample = path.pointAt(s);
  const ground = fieldHeight(s);
  const yaw = yawTowards(sample.tx, sample.tz);
  const houseLateral = -(Math.max(shore(s) + 48, 114));
  const x = sample.x + sample.rx * houseLateral;
  const z = sample.z + sample.rz * houseLateral;
  const group = new THREE.Group();
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5.2, 6),
    createSurface('mottle', 3, { color: 0xe7d7b4 }),
  );
  walls.position.set(x, ground + 2.6, z);
  walls.rotation.y = yaw;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.SQRT1_2, 1, 4),
    createSurface('tiles', 3, { color: COLORS.roofs[1] }),
  );
  roof.geometry.rotateY(Math.PI / 4);
  roof.scale.set(8.6, 2.4, 6.6);
  roof.position.set(x, ground + 5.2 + 1.2, z);
  roof.rotation.y = yaw;
  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.12, 8, 18),
    createSurface('planks', 1.2, { color: COLORS.wood }),
  );
  wheel.geometry.rotateY(Math.PI / 2);
  const wheelLateral = -(Math.max(shore(s) + 36, 100));
  wheel.position.set(
    sample.x + sample.rx * wheelLateral,
    ground + 1.7,
    sample.z + sample.rz * wheelLateral,
  );
  wheel.rotation.y = yaw;
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.16, 16),
    createSurface('planks', 2, { color: COLORS.wood }),
  );
  const bridgeLateral = -(Math.max(shore(s) + 30, 98));
  bridge.position.set(
    sample.x + sample.rx * bridgeLateral + sample.tx * 7,
    ground + 0.45,
    sample.z + sample.rz * bridgeLateral + sample.tz * 7,
  );
  bridge.rotation.y = yaw;
  group.add(walls, roof, wheel, bridge);
  return group;
}

// along > 0 is the right bank (south). seaward > 0 is downstream, into the sea.
function frame(mouth, along, seaward) {
  return {
    x: mouth.x + mouth.rx * along + mouth.tx * seaward,
    z: mouth.z + mouth.rz * along + mouth.tz * seaward,
  };
}

function createBeach(mouth, path) {
  const alongFrom = -1500;
  const alongTo = 900;
  const seaFrom = -160;
  const seaTo = 30;
  const columns = 14;
  const rows = 70;
  const positions = new Float32Array(rows * columns * 3);
  const indices = [];
  for (let row = 0; row < rows; row++) {
    const along = alongFrom + ((alongTo - alongFrom) * row) / (rows - 1);
    for (let column = 0; column < columns; column++) {
      const seaward = seaFrom + ((seaTo - seaFrom) * column) / (columns - 1);
      const at = frame(mouth, along, seaward);
      const offset = (row * columns + column) * 3;
      const onRiver = path.project(at.x, at.z);
      // Sand under the channel would bury the boat. That part stays underwater.
      const drowned = Math.abs(onRiver.lateral) < waterHalf(path, onRiver.s) - 6;
      positions[offset] = at.x;
      positions[offset + 1] = drowned ? -4 : beachHeight(seaward);
      positions[offset + 2] = at.z;
    }
    if (row === rows - 1) continue;
    for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      // Opposite of the river ribbon: here the next column is seaward, not
      // toward the right bank, and that order would face the sand downward.
      indices.push(a, c, b, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: SAND, roughness: 1 }),
  );
  mesh.frustumCulled = false;
  return { mesh };
}

function beachHeight(seaward) {
  if (seaward <= 0) return THREE.MathUtils.lerp(1.45, 0.25, (seaward + 160) / 160);
  return THREE.MathUtils.lerp(0.25, -0.4, seaward / 30);
}

function createSeaPlane(mouth, waterMaterial) {
  const alongFrom = -1800;
  const alongTo = 1200;
  const seaFrom = -8;
  const seaTo = 1500;
  const columns = 28;
  const rows = 48;
  const positions = new Float32Array(rows * columns * 3);
  const indices = [];
  for (let row = 0; row < rows; row++) {
    const along = alongFrom + ((alongTo - alongFrom) * row) / (rows - 1);
    for (let column = 0; column < columns; column++) {
      const seaward = seaFrom + ((seaTo - seaFrom) * column) / (columns - 1);
      const at = frame(mouth, along, seaward);
      const offset = (row * columns + column) * 3;
      positions[offset] = at.x;
      positions[offset + 1] = -0.08;
      positions[offset + 2] = at.z;
    }
    if (row === rows - 1) continue;
    for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, waterMaterial);
  mesh.frustumCulled = false;
  const position = geometry.attributes.position;

  function animate(time) {
    for (let i = 0; i < position.count; i++) {
      position.setY(i, waveHeight(position.getX(i), position.getZ(i), time) - 0.08);
    }
    position.needsUpdate = true;
  }

  return { mesh, animate };
}

function createBars(path) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xc6b48a, roughness: 1 });
  const offsets = [-30, 40, -15];
  offsets.forEach((lateral, i) => {
    const sample = path.pointAt(path.mouth - 140 + i * 70);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), material);
    mesh.scale.set(18 + i * 6, 0.22, 7);
    mesh.position.set(sample.x + sample.rx * lateral, 0.12, sample.z + sample.rz * lateral);
    mesh.rotation.y = yawTowards(sample.tx, sample.tz);
    group.add(mesh);
  });
  return group;
}

function createGrau(path, grau, mouth, yaw) {
  const group = new THREE.Group();
  const walls = createSurface('mottle', 4, { color: 0xffffff });
  const roofs = createSurface('tiles', 3);
  const brick = createSurface('masonry', 3, { color: BRICK });
  const stone = createSurface('masonry', 3, { color: COLORS.stone });
  const wood = createSurface('planks', 2, { color: COLORS.wood });
  const domeMat = createSurface('tiles', 3, { color: DOME });
  const bodies = [];
  const roofItems = [];
  const dummy = new THREE.Object3D();
  const roofGeometry = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  roofGeometry.rotateY(Math.PI / 4);

  const putBox = (list, x, y, z, sx, sy, sz, spin, color) => {
    dummy.rotation.set(0, spin, 0);
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    list.push({ matrix: dummy.matrix.clone(), color: color ? new THREE.Color(color) : undefined });
  };

  // Five naves, long axis toward the sea, centred on the present building.
  const yards = grau.yards;
  for (let i = -2; i <= 2; i++) {
    const x = yards.x + mouth.rx * i * 10.6;
    const z = yards.z + mouth.rz * i * 10.6;
    const ground = 1.05;
    putBox(bodies, x, ground + 4, z, 48, 8, 9.4, yaw);
    putBox(roofItems, x, ground + 8 + 1.4, z, 50, 2.8, 11, yaw, COLORS.roofs[0]);
  }
  group.add(createInstances(new THREE.BoxGeometry(1, 1, 1), brick, bodies));

  const church = grau.church;
  const nave = [];
  const churchRoofs = [];
  putBox(nave, church.x, 1.2 + 7, church.z, 26, 14, 16, yaw, PALE);
  putBox(churchRoofs, church.x, 1.2 + 14 + 2, church.z, 28, 4, 18, yaw, COLORS.roofs[1]);
  const towerX = church.x - mouth.tx * 10 + mouth.rx * 10;
  const towerZ = church.z - mouth.tz * 10 + mouth.rz * 10;
  putBox(nave, towerX, 1.2 + 13, towerZ, 6.2, 26, 6.2, yaw, COLORS.stone);
  putBox(churchRoofs, towerX, 1.2 + 26 + 2.2, towerZ, 7.4, 4.4, 7.4, yaw, COLORS.roofs[0]);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 12), domeMat);
  dome.scale.set(1, 0.7, 1);
  dome.position.set(church.x + mouth.tx * 2, 1.2 + 14 + 3.2, church.z + mouth.tz * 2);
  group.add(dome);
  group.add(
    createInstances(new THREE.BoxGeometry(1, 1, 1), walls, nave),
    createInstances(roofGeometry, roofs, churchRoofs),
    createInstances(roofGeometry, roofs, roofItems),
  );

  // Houses on the sand between the yards and the mouth, off the two monuments.
  const random = createRandom(1703);
  const houses = [];
  const houseRoofs = [];
  const clear = [
    { x: church.x, z: church.z, r: 28 },
    { x: yards.x, z: yards.z, r: 36 },
  ];
  for (let placed = 0, tries = 0; placed < 14 && tries < 80; tries++) {
    const along = -80 - random() * 420;
    const seaward = -25 - random() * 100;
    const at = frame(mouth, along, seaward);
    const onRiver = path.project(at.x, at.z);
    if (Math.abs(onRiver.lateral) < waterHalf(path, onRiver.s) + 10) continue;
    if (clear.some((spot) => Math.hypot(at.x - spot.x, at.z - spot.z) < spot.r)) continue;
    const width = 6 + random() * 4;
    const depth = 6 + random() * 3;
    const height = 6 + random() * 2.5;
    const roof = 1.8 + random();
    const ground = beachHeight(seaward);
    const spin = yaw + (random() - 0.5) * 0.6;
    putBox(houses, at.x, ground + height / 2, at.z, width, height, depth, spin, COLORS.houseWalls[placed % 4]);
    putBox(houseRoofs, at.x, ground + height + roof / 2, at.z, width * 1.08, roof, depth * 1.08, spin, COLORS.roofs[placed % 3]);
    placed++;
  }

  // A low bastion on the shore, seaward of the yards. A sketch, not a plan.
  const bastion = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ox = Math.cos(angle);
    const oz = Math.sin(angle);
    const x = yards.x + mouth.tx * 30 + ox * 11;
    const z = yards.z + mouth.tz * 30 + oz * 11;
    putBox(bastion, x, 2.2, z, 8, 4.2, 2.2, yawTowards(-oz, ox));
  }

  // Timber jetty, north of the mouth, and boats pulled up beside it.
  const jetty = [];
  const deck = frame(mouth, -180, 18);
  putBox(jetty, deck.x, 0.7, deck.z, 55, 0.28, 6, yaw);
  for (let step = -24; step <= 24; step += 6) {
    const post = frame(mouth, -180, 18 + step);
    putBox(jetty, post.x, 0.1, post.z, 0.35, 1.6, 0.35, yaw);
  }
  const boats = [];
  for (let i = 0; i < 5; i++) {
    const at = frame(mouth, -150 - i * 16, -8 - (i % 2) * 6);
    putBox(boats, at.x, beachHeight(-12) + 0.5, at.z, 2.1, 0.7, 6.5, yaw + 0.15 * i);
  }

  // The south bank is only a hint that Nazaret was there.
  const huts = [];
  const hutRoofs = [];
  for (let i = 0; i < 3; i++) {
    const sample = path.pointAt(path.mouth - 200);
    const lateral = waterHalf(path, path.mouth - 200) + 22 + i * 16;
    const x = sample.x + sample.rx * lateral;
    const z = sample.z + sample.rz * lateral;
    putBox(huts, x, 1.15 + 2.2, z, 5, 4.4, 4, yaw, COLORS.houseWalls[i]);
    putBox(hutRoofs, x, 1.15 + 4.4 + 0.8, z, 5.4, 1.6, 4.4, yaw, COLORS.roofs[0]);
  }

  group.add(
    createInstances(new THREE.BoxGeometry(1, 1, 1), walls, houses),
    createInstances(roofGeometry, roofs, houseRoofs),
    createInstances(new THREE.BoxGeometry(1, 1, 1), stone, bastion),
    createInstances(new THREE.BoxGeometry(1, 1, 1), wood, [...jetty, ...boats]),
    createInstances(new THREE.BoxGeometry(1, 1, 1), walls, huts),
    createInstances(roofGeometry, roofs, hutRoofs),
  );
  return group;
}
