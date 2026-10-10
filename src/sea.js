import * as THREE from 'three';
import { RIVER, BANK, COLORS, createRandom, yawTowards } from './config.js';
import { TEXTURES, createSurface } from './materials.js';
import { createInstances } from './instancing.js';
import { waveHeight } from './water.js';
import { PRETIL } from './riverside.js';
import { createCrownGeometry } from './environment.js';

const BRICK = 0xa85a3a;
const PALE = 0xe9dcc0;
const DOME = 0x3f6f9f;
const THATCH = 0xc4a86a;

// Flat circles knocked out of the dunes so the church and the yards are not
// buried. Filled in createSea once the mouth frame is known.
let duneHoles = [];

// Hull stop copied from boat.js bankLimit. That function is the real limit
// and this file must not change it. 340 m at the mouth and 480 m offshore are
// those stops; the water mesh in water.js is wider (480 m, then 700 m).
function boatStop(path, s) {
  const base = RIVER.width / 2 - RIVER.margin;
  if (s <= path.mouth - 600) return base;
  if (s < path.mouth) {
    const t = THREE.MathUtils.smoothstep(s, path.mouth - 600, path.mouth);
    return base + (340 - base) * t;
  }
  const span = Math.max(path.step, path.seaEnd - path.mouth);
  const t = Math.min(1, (s - path.mouth) / span);
  return 340 + (480 - 340) * t;
}

// Dry sand begins 6 m inside this half. Cap the widening so that line stays
// about 22 m outside the hull stop (6 m drowned + 22 m of water). Without
// the cap the mouth is 480 m of water and the boat, held at 340 m, never
// reaches the beach. The cap never opens the channel past the water mesh.
function waterHalf(path, s) {
  const cityHalf = RIVER.width / 2 + BANK.slopeRun;
  let wide = cityHalf;
  if (s >= path.mouth - 600 && s < path.mouth) {
    const t = THREE.MathUtils.smoothstep(s, path.mouth - 600, path.mouth);
    wide = cityHalf + (480 - cityHalf) * t;
  } else if (s >= path.mouth) {
    const span = Math.max(path.step, path.seaEnd - path.mouth);
    const t = Math.min(1, (s - path.mouth) / span);
    wide = 480 + (700 - 480) * t;
  }
  return Math.max(cityHalf, Math.min(wide, boatStop(path, s) + 28));
}

// A pale line across the water where the walled tour ends. Crossing it is
// what swaps the map and the points over to the run down to the beach.
function createCityLimit(path) {
  const at = path.pointAt(path.end);
  const half = RIVER.width / 2 + BANK.slopeRun + 14;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const pen = canvas.getContext('2d');
  const fade = pen.createLinearGradient(0, 0, 0, 64);
  fade.addColorStop(0, 'rgba(244, 233, 210, 0)');
  fade.addColorStop(0.42, 'rgba(244, 233, 210, 0)');
  fade.addColorStop(0.5, 'rgba(244, 233, 210, 0.95)');
  fade.addColorStop(0.58, 'rgba(244, 233, 210, 0)');
  fade.addColorStop(1, 'rgba(244, 233, 210, 0)');
  pen.fillStyle = fade;
  pen.fillRect(0, 0, 128, 64);
  // The ends die out on the banks instead of stopping in a hard edge.
  const ends = pen.createLinearGradient(0, 0, 128, 0);
  ends.addColorStop(0, 'rgba(0, 0, 0, 1)');
  ends.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
  ends.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
  ends.addColorStop(1, 'rgba(0, 0, 0, 1)');
  pen.globalCompositeOperation = 'destination-out';
  pen.fillStyle = ends;
  pen.fillRect(0, 0, 128, 64);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2, 9),
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      fog: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  // PlaneGeometry faces +Z. Turn that normal downstream (tx, tz) so the
  // sheet lies across the channel: local +X then runs bank to bank.
  sheet.rotation.y = Math.atan2(at.tx, at.tz);
  sheet.position.set(at.x, 3.1, at.z);
  return sheet;
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

  duneHoles = [];
  const grau = layout.sea?.grau;
  if (grau) {
    // Wide enough to cover the five naves and the church plot. The radii are
    // in metres along the shore and inland from it.
    const yards = measure(mouth, grau.yards.x, grau.yards.z);
    const church = measure(mouth, grau.church.x, grau.church.z);
    duneHoles = [
      { ...yards, ra: 70, rs: 46 },
      { ...church, ra: 42, rs: 36 },
    ];
  }

  const beach = createBeach(mouth, path);
  group.add(createHinterland(mouth, path, fieldReach, grass));
  const sea = createSeaPlane(mouth, waterMaterial);
  let villageLights = [];
  if (grau) {
    const built = createGrau(path, grau, mouth, yaw);
    group.add(built.group);
    villageLights = built.lights;
  }
  const coast = createShore(mouth, path, grau, villageLights);
  group.add(beach.mesh, sea.mesh, coast.group, createBars(path), createCityLimit(path));

  scene.add(group);

  function update(time, centreRow) {
    if (ditchMaterial) ditchMaterial.color.copy(waterMaterial.color);
    // atmosphere.js writes this each frame. The night value is not passed in,
    // and lights.js is off limits for this shore.
    const raw = Number(document.documentElement.style.getPropertyValue('--night'));
    const night = Number.isFinite(raw) ? raw : 0;
    coast.setNight(night);
    const here = path.samples[Math.min(centreRow, path.samples.length - 1)];
    if (!here || here.s < path.mouth - 900) return;
    sea.animate(time);
    coast.animate(time);
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

function measure(mouth, x, z) {
  const dx = x - mouth.x;
  const dz = z - mouth.z;
  return {
    along: dx * mouth.rx + dz * mouth.rz,
    seaward: dx * mouth.tx + dz * mouth.tz,
  };
}

function beachHeight(seaward) {
  if (seaward <= 0) {
    const t = THREE.MathUtils.clamp((seaward + 160) / 160, 0, 1);
    return THREE.MathUtils.lerp(1.45, 0.25, t);
  }
  return THREE.MathUtils.lerp(0.25, -0.45, THREE.MathUtils.clamp(seaward / 30, 0, 1));
}

// Low ridges on the backshore. The forebeach, where the boats are hauled
// up, stays a smooth slope down to the wash.
function duneLift(along, seaward) {
  const inland = THREE.MathUtils.smoothstep(-seaward, 34, 82);
  const tail = 1 - THREE.MathUtils.smoothstep(-seaward, 118, 156);
  const ridge =
    0.4 + Math.sin(along * 0.017) * 0.3 + Math.sin(along * 0.046 + 1.2) * 0.15;
  let keep = 1;
  for (const hole of duneHoles) {
    const d = Math.hypot((along - hole.along) / hole.ra, (seaward - hole.seaward) / hole.rs);
    keep *= THREE.MathUtils.smoothstep(d, 0.55, 1.3);
  }
  return inland * tail * Math.max(0, ridge) * keep * 1.65;
}

function groundAt(along, seaward) {
  return beachHeight(seaward) + duneLift(along, seaward);
}

function isDry(path, x, z, margin = 6) {
  const onRiver = path.project(x, z);
  return Math.abs(onRiver.lateral) >= waterHalf(path, onRiver.s) + margin;
}

// A point on the sand, `inland` metres past the water half. Positive inland
// is up the beach; the dry lip itself is near inland 0 (the mesh is drowned
// inside waterHalf - 6). `side` is -1 on the north bank, +1 on the south.
function bankPoint(path, mouth, s, side, inland) {
  const sample = path.pointAt(s);
  const lateral = side * (waterHalf(path, s) + inland);
  const x = sample.x + sample.rx * lateral;
  const z = sample.z + sample.rz * lateral;
  return { ...measure(mouth, x, z), x, z, sample, lateral, side, inland };
}

// Matches the beach lip in createBeach, so props sit on the sand rather than
// in it. `inland` is the argument bankPoint was given.
function sandY(spot) {
  const fromLip = spot.inland + 6;
  const lip = fromLip < 22 ? (1 - Math.max(0, fromLip) / 22) * 0.42 : 0;
  return groundAt(spot.along, spot.seaward) + lip;
}

function createBeach(mouth, path) {
  const alongFrom = -1500;
  const alongTo = 900;
  const seaFrom = -160;
  const seaTo = 30;
  // Fine enough that the lip, seen from 20 m off, is not a 25 m staircase.
  const columns = 24;
  const rows = 220;
  const positions = new Float32Array(rows * columns * 3);
  const colors = new Float32Array(rows * columns * 3);
  const indices = [];
  const dry = new THREE.Color(0xdcc7a4);
  const wet = new THREE.Color(0xa89068);
  const pale = new THREE.Color(0xe7d6b4);
  const tint = new THREE.Color();
  for (let row = 0; row < rows; row++) {
    const along = alongFrom + ((alongTo - alongFrom) * row) / (rows - 1);
    for (let column = 0; column < columns; column++) {
      const seaward = seaFrom + ((seaTo - seaFrom) * column) / (columns - 1);
      const at = frame(mouth, along, seaward);
      const offset = (row * columns + column) * 3;
      const onRiver = path.project(at.x, at.z);
      const half = waterHalf(path, onRiver.s);
      // Sand under the channel would bury the boat. Deep water stays down;
      // the last 16 m slope up to the lip instead of a cliff.
      const inland = Math.abs(onRiver.lateral) - (half - 6);
      const drowned = inland < 0;
      const lip = !drowned && inland < 22 ? (1 - inland / 22) * 0.42 : 0;
      const lift = drowned ? 0 : duneLift(along, seaward);
      let height = -4;
      if (!drowned) height = beachHeight(seaward) + lift + lip;
      else if (inland > -16) height = -0.2 + ((16 + inland) / 16) * 0.35;
      positions[offset] = at.x;
      positions[offset + 1] = height;
      positions[offset + 2] = at.z;
      const wetness = drowned
        ? 1
        : Math.max(THREE.MathUtils.smoothstep(seaward, -16, 12), inland < 14 ? 0.85 * (1 - inland / 14) : 0);
      tint.copy(dry).lerp(wet, wetness);
      if (lift > 0.25) tint.lerp(pale, Math.min(0.55, lift));
      colors[offset] = tint.r;
      colors[offset + 1] = tint.g;
      colors[offset + 2] = tint.b;
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
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    createSurface('mottle', 8, { color: 0xffffff, vertexColors: true, roughness: 1 }),
  );
  mesh.frustumCulled = false;
  return { mesh };
}

// The land behind the fields and behind the beach. Without it the huerta
// was a ribbon beside the river and the sand a strip with nothing at its
// back: from the water the Grau stood on an island. Flat and unsurveyed.
function createHinterland(mouth, path, fieldReach, material) {
  const alongFrom = -1500; // the same reach as the beach it backs
  const alongTo = 900;
  const seaFrom = -1400;
  const seaTo = -150; // ten metres under the back of the sand
  const step = 20;
  const rows = Math.ceil((alongTo - alongFrom) / step) + 1;
  const columns = Math.ceil((seaTo - seaFrom) / step) + 1;
  const positions = new Float32Array(rows * columns * 3);
  const indices = [];
  for (let row = 0; row < rows; row++) {
    const along = alongFrom + ((alongTo - alongFrom) * row) / (rows - 1);
    for (let column = 0; column < columns; column++) {
      const seaward = seaFrom + ((seaTo - seaFrom) * column) / (columns - 1);
      const at = frame(mouth, along, seaward);
      const onRiver = path.project(at.x, at.z);
      const lateral = Math.abs(onRiver.lateral);
      // Sunk under the channel, with room for the fields' own bank; a
      // little under the fields, so they are what shows; and level with
      // the back of the beach everywhere else.
      const fields = onRiver.s < path.mouth - 150 && lateral < fieldReach(onRiver.s) + 12;
      let height = 1.42;
      if (lateral < waterHalf(path, onRiver.s) + 8) height = -3;
      else if (fields) height = 0.95;
      const offset = (row * columns + column) * 3;
      positions[offset] = at.x;
      positions[offset + 1] = height;
      positions[offset + 2] = at.z;
    }
    if (row === rows - 1) continue;
    for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column;
      const c = a + columns;
      indices.push(a, c, a + 1, c, c + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
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
  const material = createSurface('mottle', 6, { color: 0xc6b48a, roughness: 1 });
  const offsets = [-88, 72, -36, 40, -58];
  offsets.forEach((lateral, i) => {
    // Downstream of the mouth, so the shoals sit in the forward view and not
    // across the run north to the Grau.
    const sample = path.pointAt(path.mouth + 96 + i * 20);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), material);
    const outer = Math.abs(lateral) >= 50;
    mesh.scale.set(14 + (i % 3) * 4, outer ? 0.42 : 0.3, 5.5 + (i % 3) * 1.6);
    mesh.position.set(sample.x + sample.rx * lateral, outer ? 0.18 : 0.1, sample.z + sample.rz * lateral);
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
  // The floor sits on the sand rather than on a fixed plinth.
  const yards = grau.yards;
  const yardSpot = measure(mouth, yards.x, yards.z);
  const yardGround = groundAt(yardSpot.along, yardSpot.seaward);
  for (let i = -2; i <= 2; i++) {
    const x = yards.x + mouth.rx * i * 10.6;
    const z = yards.z + mouth.rz * i * 10.6;
    putBox(bodies, x, yardGround + 4, z, 48, 8, 9.4, yaw);
    putBox(roofItems, x, yardGround + 8 + 1.4, z, 50, 2.8, 11, yaw, COLORS.roofs[i < 0 ? 0 : 1]);
  }
  group.add(createInstances(new THREE.BoxGeometry(1, 1, 1), brick, bodies));

  const church = grau.church;
  const churchSpot = measure(mouth, church.x, church.z);
  const churchGround = groundAt(churchSpot.along, churchSpot.seaward);
  const nave = [];
  const churchRoofs = [];
  putBox(nave, church.x, churchGround + 7, church.z, 26, 14, 16, yaw, PALE);
  putBox(churchRoofs, church.x, churchGround + 14 + 2, church.z, 28, 4, 18, yaw, COLORS.roofs[1]);
  const towerX = church.x - mouth.tx * 10 + mouth.rx * 10;
  const towerZ = church.z - mouth.tz * 10 + mouth.rz * 10;
  putBox(nave, towerX, churchGround + 13, towerZ, 6.2, 26, 6.2, yaw, COLORS.stone);
  putBox(churchRoofs, towerX, churchGround + 26 + 2.2, towerZ, 7.4, 4.4, 7.4, yaw, COLORS.roofs[0]);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 12), domeMat);
  dome.scale.set(1, 0.7, 1);
  dome.position.set(church.x + mouth.tx * 2, churchGround + 14 + 3.2, church.z + mouth.tz * 2);
  group.add(dome);
  group.add(
    createInstances(new THREE.BoxGeometry(1, 1, 1), walls, nave),
    createInstances(roofGeometry, roofs, churchRoofs),
    createInstances(roofGeometry, roofs, roofItems),
  );

  // The hamlet sits on dry sand just inland of the yards. Most of the strip
  // between the yards and the mouth is still the channel, so an earlier
  // scatter landed in the water and was thrown away.
  const random = createRandom(1703);
  const houses = [];
  const houseRoofs = [];
  const lights = [];
  const clear = [
    { x: church.x, z: church.z, r: 32 },
    { x: yards.x, z: yards.z, r: 44 },
  ];
  const hamlet = [
    [yardSpot.along - 36, yardSpot.along - 210, yardSpot.seaward - 28, yardSpot.seaward - 95],
    [churchSpot.along - 36, churchSpot.along + 36, churchSpot.seaward - 18, churchSpot.seaward - 70],
  ];
  for (let placed = 0, tries = 0; placed < 18 && tries < 160; tries++) {
    const band = hamlet[tries % hamlet.length];
    const along = band[0] + random() * (band[1] - band[0]);
    const seaward = band[2] + random() * (band[3] - band[2]);
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 12)) continue;
    if (clear.some((spot) => Math.hypot(at.x - spot.x, at.z - spot.z) < spot.r)) continue;
    const width = 7 + random() * 5;
    const depth = 6 + random() * 3;
    const height = 5.5 + random() * 4;
    const roof = 1.8 + random() * 0.8;
    const ground = groundAt(along, seaward);
    const spin = yaw + (random() - 0.5) * 0.5;
    putBox(houses, at.x, ground + height / 2, at.z, width, height, depth, spin, COLORS.houseWalls[placed % 4]);
    putBox(houseRoofs, at.x, ground + height + roof / 2, at.z, width * 1.08, roof, depth * 1.08, spin, COLORS.roofs[placed % 3]);
    // A lamp at the eaves, not a window texture: these are not the city facades.
    if (placed % 2 === 0) {
      lights.push({
        x: at.x + mouth.tx * depth * 0.45,
        y: ground + height * 0.62,
        z: at.z + mouth.tz * depth * 0.45,
        size: 0.75,
      });
    }
    placed++;
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
    createInstances(new THREE.BoxGeometry(1, 1, 1), walls, huts),
    createInstances(roofGeometry, roofs, hutRoofs),
  );
  return { group, lights };
}

// A box glued into a hand-built geometry. Winding is approximate; callers use
// DoubleSide. `sy`/`sx`/`sz` are full sizes, and y is centred.
function appendBox(positions, indices, cx, cy, cz, sx, sy, sz) {
  const x0 = cx - sx / 2;
  const x1 = cx + sx / 2;
  const y0 = cy - sy / 2;
  const y1 = cy + sy / 2;
  const z0 = cz - sz / 2;
  const z1 = cz + sz / 2;
  const base = positions.length / 3;
  positions.push(
    x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0,
    x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
  );
  const faces = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 4, 7, 0, 7, 3,
    1, 2, 6, 1, 6, 5,
    3, 7, 6, 3, 6, 2,
    0, 1, 5, 0, 5, 4,
  ];
  for (const index of faces) indices.push(base + index);
}

function geometryFrom(positions, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Open hull, bow at local +X, keel at y = 0. yawTowards then points the bow.
function openHullGeometry(length, beam, depth) {
  const stations = 9;
  const positions = [];
  const indices = [];
  const rings = [];
  for (let i = 0; i < stations; i++) {
    const t = i / (stations - 1);
    const body = Math.sin(t * Math.PI) ** 0.62;
    const half = (beam / 2) * body;
    const x = (t - 0.5) * length;
    const rocker = (1 - body) * depth * 0.42;
    const chine = rocker + depth * 0.3;
    const gunwale = rocker + depth * (0.76 + 0.24 * (1 - body));
    rings.push(positions.length / 3);
    positions.push(
      x, rocker, 0,
      x, chine, -half * 0.76,
      x, chine, half * 0.76,
      x, gunwale, -half,
      x, gunwale, half,
    );
  }
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let i = 0; i < stations - 1; i++) {
    const a = rings[i];
    const b = rings[i + 1];
    quad(a, b, b + 1, a + 1);
    quad(a, a + 2, b + 2, b);
    quad(a + 1, b + 1, b + 3, a + 3);
    quad(a + 2, a + 4, b + 4, b + 2);
  }
  return geometryFrom(positions, indices);
}

function oxGeometry() {
  const positions = [];
  const indices = [];
  appendBox(positions, indices, 0, 0.92, 0, 1.7, 0.72, 0.58);
  appendBox(positions, indices, 0.98, 1.02, 0, 0.5, 0.38, 0.36);
  appendBox(positions, indices, 1.28, 0.96, 0, 0.24, 0.2, 0.24);
  appendBox(positions, indices, 0.86, 1.28, -0.12, 0.28, 0.08, 0.08);
  appendBox(positions, indices, 0.86, 1.28, 0.12, 0.28, 0.08, 0.08);
  for (const [x, z] of [[-0.48, -0.2], [-0.48, 0.2], [0.42, -0.2], [0.42, 0.2]]) {
    appendBox(positions, indices, x, 0.32, z, 0.16, 0.64, 0.16);
  }
  return geometryFrom(positions, indices);
}

function rackGeometry() {
  const positions = [];
  const indices = [];
  appendBox(positions, indices, 0, 0.95, -3.05, 0.14, 1.9, 0.14);
  appendBox(positions, indices, 0, 0.95, 3.05, 0.14, 1.9, 0.14);
  appendBox(positions, indices, 0, 1.85, 0, 0.1, 0.1, 6.3);
  return geometryFrom(positions, indices);
}

function gullGeometry() {
  // Beak at +X, so yawTowards points the bird the way it is flying.
  return geometryFrom(
    [
      0.7, 0.02, 0, -0.35, 0, 0.95, -0.05, 0, 0,
      0.7, 0.02, 0, -0.05, 0, 0, -0.35, 0, -0.95,
    ],
    [0, 1, 2, 3, 4, 5],
  );
}

// One instanced mesh whose items may bob. Each item is mutated with its index.
function buildPosed(geometry, material, items) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const dummy = new THREE.Object3D();
  items.forEach((item, index) => {
    item.index = index;
    item.mesh = mesh;
    pose(dummy, item, 0);
    mesh.setMatrixAt(index, dummy.matrix);
    if (item.color) mesh.setColorAt(index, item.color);
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function pose(dummy, item, time) {
  const wave = item.bob ? Math.sin(time * 0.55 + item.phase) : 0;
  dummy.rotation.set(item.pitch || 0, item.yaw, (item.heel || 0) + wave * 0.05);
  dummy.position.set(item.x, item.y + wave * (item.bob || 0), item.z);
  dummy.scale.set(item.sx, item.sy, item.sz);
  dummy.updateMatrix();
}

function createSurf(mouth, path) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const flush = (rows) => {
    if (rows.length < 2) return;
    const columns = rows[0].length;
    const base = positions.length / 3;
    rows.forEach((row) => {
      for (const point of row) {
        positions.push(point.x, 0.34, point.z);
        uvs.push(point.u, point.v);
      }
    });
    for (let row = 0; row < rows.length - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        const a = base + row * columns + column;
        const b = a + 1;
        const c = a + columns;
        const d = c + 1;
        indices.push(a, c, b, c, d, b);
      }
    }
  };

  // The lip where the channel meets the sand, on both banks, for the first
  // 200 m of coast either side of the mouth and a short way upstream.
  for (const side of [-1, 1]) {
    const rows = [];
    for (let s = path.mouth - 200; s <= path.mouth + 200; s += 8) {
      const sample = path.pointAt(s);
      const half = waterHalf(path, s);
      const row = [];
      let onBeach = true;
      for (let column = 0; column < 3; column++) {
        // On the water side of the sand lip, so the wash is not buried in it.
        const lateral = side * (half - 14 + column * 5);
        const x = sample.x + sample.rx * lateral;
        const z = sample.z + sample.rz * lateral;
        const seaward = (x - mouth.x) * mouth.tx + (z - mouth.z) * mouth.tz;
        if (seaward < -150 || seaward > 40) onBeach = false;
        row.push({ x, z, u: column / 2, v: s / 18 });
      }
      if (!onBeach) {
        flush(rows);
        rows.length = 0;
        continue;
      }
      rows.push(row);
    }
    flush(rows);
  }

  // Break over the bar, just downstream of the mouth. The centre 30 m of
  // the fairway stays clear; this sheet is foam, not a solid shoal.
  for (const side of [-1, 1]) {
    const rows = [];
    for (let s = path.mouth + 48; s <= path.mouth + 150; s += 8) {
      const sample = path.pointAt(s);
      const row = [];
      for (let column = 0; column < 3; column++) {
        const lateral = side * (34 + column * 18);
        row.push({
          x: sample.x + sample.rx * lateral,
          z: sample.z + sample.rz * lateral,
          u: column / 2,
          v: s / 18,
        });
      }
      rows.push(row);
    }
    flush(rows);
  }

  // The open-sea wash, north of the Grau and on the far side of the mouth.
  for (const [from, to] of [[-1480, -600], [540, 880]]) {
    const rows = [];
    for (let along = from; along <= to; along += 12) {
      const at = frame(mouth, along, -4);
      if (!isDry(path, at.x, at.z, 0)) {
        flush(rows);
        rows.length = 0;
        continue;
      }
      const row = [];
      for (let column = 0; column < 3; column++) {
        const seaward = 2 + column * 4;
        const point = frame(mouth, along, seaward);
        row.push({ x: point.x, z: point.z, u: column / 2, v: along / 18 });
      }
      rows.push(row);
    }
    flush(rows);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 } }]),
    vertexShader: `
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        float across = vUv.x;
        float streak = 0.5 + 0.5 * sin(vUv.y * 18.0 - time * 1.3 + across * 4.0);
        float wash = smoothstep(0.42, 0.92, streak);
        float band = smoothstep(0.0, 0.35, across) * (1.0 - smoothstep(0.55, 1.0, across));
        float alpha = band * (0.08 + 0.28 * wash);
        vec3 color = mix(vec3(0.82, 0.9, 0.88), vec3(0.97, 0.98, 0.96), wash);
        gl_FragColor = vec4(color, alpha);
        #include <fog_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  const position = geometry.attributes.position;

  function animate(time) {
    material.uniforms.time.value = time;
    for (let i = 0; i < position.count; i++) {
      const crest = waveHeight(position.getX(i), position.getZ(i), time);
      position.setY(i, Math.max(0.28, crest + 0.16));
    }
    position.needsUpdate = true;
  }

  return { mesh, animate };
}

function createLampPoints(spots) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const phases = [];
  const lamp = new THREE.Color(0xffb45a);
  spots.forEach((spot, index) => {
    positions.push(spot.x, spot.y, spot.z);
    colors.push(lamp.r, lamp.g, lamp.b);
    sizes.push(spot.size ?? 1);
    phases.push((index * 0.37) % 1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, night: { value: 0 } }]),
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      attribute float phase;
      uniform float time;
      uniform float night;
      varying vec3 vColor;
      varying float vStrength;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float flame = 0.82 + 0.18 * sin(time * 8.0 + phase * 40.0);
        vStrength = night * flame;
        vColor = color;
        gl_PointSize = clamp(size * (1600.0 / -mvPosition.z), 2.0, 64.0);
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vStrength;
      #include <fog_pars_fragment>
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float glow = 0.65 * pow(max(0.0, 1.0 - d), 2.0) + 1.3 * smoothstep(0.28, 0.0, d);
        float haze = 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
        gl_FragColor = vec4(vColor * glow * vStrength * haze, 1.0);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  return points;
}

// Square fort with two round towers on the seaward corners. The real
// Baluarte del Grau was that shape; the measures here are a sketch.
function createFort(mouth, along, seaward, lights) {
  const at = frame(mouth, along, seaward);
  const ground = groundAt(along, seaward);
  const pivot = new THREE.Group();
  pivot.position.set(at.x, ground, at.z);
  pivot.rotation.y = yawTowards(mouth.tx, mouth.tz);
  const stone = createSurface('masonry', 3.2, { color: COLORS.stone });
  const box = (x, y, z, sx, sy, sz) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), stone);
    mesh.position.set(x, y, z);
    pivot.add(mesh);
  };
  const height = 6.2;
  const halfX = 12;
  const halfZ = 10.5;
  const thick = 1.65;
  box(halfX, height / 2, 0, thick, height, halfZ * 2 + thick);
  box(-halfX, height / 2, -6.4, thick, height, 8.4);
  box(-halfX, height / 2, 6.4, thick, height, 8.4);
  box(0, height / 2, halfZ, halfX * 2, height, thick);
  box(0, height / 2, -halfZ, halfX * 2, height, thick);
  const towerGeo = new THREE.CylinderGeometry(3.05, 3.35, 11, 8);
  const capGeo = new THREE.CylinderGeometry(3.45, 3.45, 0.4, 8);
  for (const z of [halfZ, -halfZ]) {
    const tower = new THREE.Mesh(towerGeo, stone);
    tower.position.set(halfX, 5.5, z);
    const cap = new THREE.Mesh(capGeo, stone);
    cap.position.set(halfX, 11.15, z);
    pivot.add(tower, cap);
    lights.push({
      x: at.x + mouth.tx * halfX + mouth.rx * z,
      y: ground + 11.5,
      z: at.z + mouth.tz * halfX + mouth.rz * z,
      size: 1.3,
    });
  }
  const merlons = [];
  const dummy = new THREE.Object3D();
  const addMerlon = (x, z) => {
    dummy.position.set(x, height + 0.42, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    merlons.push(dummy.matrix.clone());
  };
  for (let z = -halfZ + 1.2; z <= halfZ - 1.2; z += 2.5) {
    addMerlon(halfX, z);
    if (Math.abs(z) > 2.2) addMerlon(-halfX, z);
  }
  for (let x = -halfX + 2.4; x <= halfX - 2.4; x += 2.5) {
    addMerlon(x, halfZ);
    addMerlon(x, -halfZ);
  }
  const merlonMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.85, 0.72), stone, merlons.length);
  merlons.forEach((matrix, index) => merlonMesh.setMatrixAt(index, matrix));
  pivot.add(merlonMesh);
  lights.push({
    x: at.x - mouth.tx * halfX,
    y: ground + 4.4,
    z: at.z - mouth.tz * halfX,
    size: 0.95,
  });
  return pivot;
}

function createJetty(mouth, along, seaward, lights) {
  const at = frame(mouth, along, seaward);
  const pivot = new THREE.Group();
  pivot.position.set(at.x, 0, at.z);
  pivot.rotation.y = yawTowards(mouth.tx, mouth.tz);
  const wood = createSurface('planks', 2, { color: COLORS.wood });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(76, 0.32, 7), wood);
  deck.position.set(0, 0.92, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.32, 15.5), wood);
  head.position.set(38, 0.92, 0);
  pivot.add(deck, head);
  const posts = [];
  const dummy = new THREE.Object3D();
  const put = (x, z, height) => {
    dummy.position.set(x, height / 2 - 0.4, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0.36, height, 0.36);
    dummy.updateMatrix();
    posts.push(dummy.matrix.clone());
  };
  for (let x = -34; x <= 34; x += 6) {
    put(x, -3, 1.75);
    put(x, 3, 1.75);
  }
  for (let z = -6.5; z <= 6.5; z += 3.2) put(38, z, 1.9);
  put(40.2, -6.2, 1.2);
  put(40.2, 6.2, 1.2);
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wood, posts.length);
  posts.forEach((matrix, index) => postMesh.setMatrixAt(index, matrix));
  pivot.add(postMesh);
  lights.push({
    x: at.x + mouth.tx * 40,
    y: 2.7,
    z: at.z + mouth.tz * 40,
    size: 1.4,
  });
  return pivot;
}

// Beach, fishing ground, roadstead and the Grau's timber landing.
// Repeated pieces are instanced. Gulls, the wash and the anchored hulls
// move only while the boat is near the mouth.
function createShore(mouth, path, grau, villageLights) {
  const group = new THREE.Group();
  group.name = 'shore';
  const random = createRandom(1721);
  const lights = [...villageLights];
  const anchor = grau ? measure(mouth, grau.yards.x, grau.yards.z) : { along: -530, seaward: -35 };
  const alongShore = yawTowards(mouth.rx, mouth.rz);
  const outToSea = yawTowards(mouth.tx, mouth.tz);
  const inland = yawTowards(-mouth.tx, -mouth.tz);

  const hullMat = createSurface('planks', 1.35, {
    color: 0xffffff,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const sailMat = createSurface('cloth', 2.4, {
    color: 0xffffff,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const wood = createSurface('planks', 1.6, { color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  const cloth = createSurface('cloth', 1.8, {
    color: 0xffffff,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const thatch = createSurface('mottle', 2.2, { color: 0xffffff, roughness: 1 });
  const lime = createSurface('mottle', 3, { color: 0xffffff, roughness: 0.95 });
  const tiles = createSurface('tiles', 3);
  const oxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide });
  const scrubMat = createSurface('mottle', 2, { color: 0xffffff, roughness: 1 });

  const hullGeo = openHullGeometry(8.4, 2.4, 0.8);
  const mastGeo = new THREE.CylinderGeometry(0.1, 0.14, 1, 5);
  const sailGeo = geometryFrom([0, 0.4, 0, 0.35, 7.6, 0, 6.4, 1.15, 0], [0, 1, 2]);
  const hulls = [];
  const masts = [];
  const sails = [];
  const bobbing = [];

  const addHull = (along, seaward, yaw, scale, color, bob = 0) => {
    const at = frame(mouth, along, seaward);
    const y = bob ? -0.12 : groundAt(along, seaward) + 0.06;
    const item = {
      x: at.x,
      y,
      z: at.z,
      yaw,
      sx: scale,
      sy: bob ? scale * 0.85 : scale,
      sz: scale,
      phase: random() * Math.PI * 2,
      bob,
      heel: bob ? 0 : (random() - 0.5) * 0.1,
      color: new THREE.Color(color),
    };
    hulls.push(item);
    bobbing.push(item);
    return item;
  };

  const shoreYaw = () => alongShore + (random() - 0.5) * 0.35;
  const boatColors = [0x4a3c32, 0xc2a67a, 0x8d4d38, 0x5c4636, 0xd4c4a4];
  // Lighters by the landing, and the trajo of hauled boats further north,
  // clear of the fort. A few on the south sand, so that bank is not bare.
  const hauled = [
    [anchor.along + 38, -2],
    [anchor.along + 46, -14],
    [anchor.along - 78, -4],
  ];
  for (let i = 0; i < 9; i++) hauled.push([anchor.along - 390 - i * 24, -6 - (i % 3) * 4]);
  // Sand between the landing and the fort. Without these the wedge reads bare.
  for (let i = 0; i < 3; i++) hauled.push([anchor.along - 96 - i * 16, -2 - (i % 2) * 5]);
  for (const along of [620, 710, 800, 880]) hauled.push([along, -8 - (along % 3) * 3]);
  const oxPairs = [];
  hauled.forEach(([along, seaward], index) => {
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 4)) return;
    const scale = 0.9 + random() * 0.28;
    addHull(along, seaward, shoreYaw(), scale, boatColors[index % boatColors.length]);
    if (index >= 3 && index < 12 && (index - 3) % 3 === 1) oxPairs.push([along, seaward - 7]);
    if (index % 4 === 0) {
      const stump = {
        x: at.x,
        y: groundAt(along, seaward) + 1.5,
        z: at.z,
        yaw: 0,
        sx: 1,
        sy: 3,
        sz: 1,
        phase: 0,
        bob: 0,
        heel: 0,
        color: new THREE.Color(COLORS.wood),
      };
      masts.push(stump);
    }
  });

  // Coasters in the roadstead, close enough to read from the mouth. They sit
  // off the fairway (the outbound line is along ≈ 0). No enclosed harbour.
  const cabins = [];
  // Along is metres off the outbound line (positive = south). The two
  // nearest sit inside the forward view from the mouth; the rest recede.
  const roadstead = [
    [-46, 86, 0.35, true],
    [42, 102, -0.25, false],
    [-130, 128, 0.5, false],
    [118, 138, -0.4, false],
    [24, 170, 0.12, false],
  ];
  for (const [along, seaward, turn, detailed] of roadstead) {
    let sea = seaward;
    let at = frame(mouth, along, sea);
    for (let step = 0; step < 6 && isDry(path, at.x, at.z, 0); step++) {
      sea += 24;
      at = frame(mouth, along, sea);
    }
    const scale = detailed ? 3.35 : 2.55 + random() * 0.45;
    const hull = addHull(along, sea, outToSea + turn, scale, detailed ? 0x3a3028 : indexColor(random), 0.22);
    const mastHeight = detailed ? 16 : 9 + scale * 1.6;
    const mast = {
      x: hull.x,
      y: hull.y + mastHeight * 0.55,
      z: hull.z,
      yaw: hull.yaw,
      sx: detailed ? 1.15 : 1,
      sy: mastHeight,
      sz: detailed ? 1.15 : 1,
      phase: hull.phase,
      bob: hull.bob,
      heel: 0,
      color: new THREE.Color(0x6b5344),
    };
    const sailScale = detailed ? 1.85 : 1.05 + scale * 0.12;
    const sail = {
      x: hull.x,
      y: hull.y + 1.2,
      z: hull.z,
      yaw: hull.yaw + 0.4,
      sx: sailScale,
      sy: sailScale,
      sz: 1,
      phase: hull.phase,
      bob: hull.bob,
      heel: 0,
      pitch: 0.15,
      color: new THREE.Color(COLORS.sail),
    };
    masts.push(mast);
    sails.push(sail);
    bobbing.push(mast, sail);
    if (detailed) {
      // A second mast and a cabin, so one hull is more than a scaled box.
      const bowX = Math.cos(hull.yaw);
      const bowZ = -Math.sin(hull.yaw);
      const aft = {
        x: hull.x - bowX * 4.4,
        y: hull.y + 6.4,
        z: hull.z - bowZ * 4.4,
        yaw: hull.yaw,
        sx: 0.85,
        sy: 11,
        sz: 0.85,
        phase: hull.phase,
        bob: hull.bob,
        heel: 0,
        color: new THREE.Color(0x5c4636),
      };
      masts.push(aft);
      bobbing.push(aft);
      const cabin = {
        x: hull.x - bowX * 1.6,
        y: hull.y + 2.4,
        z: hull.z - bowZ * 1.6,
        yaw: hull.yaw,
        sx: 5.4,
        sy: 2.5,
        sz: 3.6,
        phase: hull.phase,
        bob: hull.bob,
        heel: 0,
        color: new THREE.Color(0xc4b49a),
      };
      cabins.push(cabin);
      bobbing.push(cabin);
    }
    lights.push({ x: hull.x, y: hull.y + mastHeight + 0.6, z: hull.z, size: detailed ? 1.45 : 1.15 });
  }

  const oxen = [];
  const yokes = [];
  for (const [along, seaward] of oxPairs) {
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 4)) continue;
    const ground = groundAt(along, seaward);
    const side = mouth.rx * 1.15;
    const sideZ = mouth.rz * 1.15;
    for (const sign of [-1, 1]) {
      oxen.push({
        matrix: posedMatrix(at.x + side * sign, ground, at.z + sideZ * sign, inland, 1, 1, 1),
        color: new THREE.Color(sign < 0 ? 0x6a4a32 : 0x8a6244),
      });
    }
    yokes.push({
      matrix: posedMatrix(
        at.x + mouth.tx * 0.9,
        ground + 1.22,
        at.z + mouth.tz * 0.9,
        alongShore,
        0.12,
        0.12,
        2.5,
      ),
    });
  }

  const fortAlong = anchor.along - 155;
  const fortSea = anchor.seaward + 24;
  if (grau && isDry(path, frame(mouth, fortAlong, fortSea).x, frame(mouth, fortAlong, fortSea).z, 4)) {
    group.add(createFort(mouth, fortAlong, fortSea, lights));
  }
  // The timber landing, on the foreshore in front of the yards. The head
  // stays up the beach from the hull stop, so the boat cannot sail through it.
  const barracaWalls = [];
  const barracaRoofs = [];
  const doors = [];
  if (grau) {
    const yardS = path.project(grau.yards.x, grau.yards.z).s;
    const landing = bankPoint(path, mouth, Math.min(path.mouth + 10, Math.max(path.mouth - 70, yardS)), -1, 18);
    group.add(createJetty(mouth, landing.along, landing.seaward, lights));
  }

  const sheds = [];
  const shedRoofs = [];
  if (grau) {
    // Inland of the naves. The row itself runs seaward from the yards.
    const shedSpots = [
      [anchor.along - 78, anchor.seaward - 58, 16, 4.2, 7],
      [anchor.along - 102, anchor.seaward - 72, 12, 3.6, 6],
      [anchor.along + 40, anchor.seaward - 56, 14, 4.2, 6.5],
    ];
    shedSpots.forEach(([along, seaward, length, height, depth], index) => {
      const at = frame(mouth, along, seaward);
      if (!isDry(path, at.x, at.z, 8)) return;
      const ground = groundAt(along, seaward);
      sheds.push({
        matrix: posedMatrix(at.x, ground + height / 2, at.z, outToSea, length, height, depth),
        color: new THREE.Color(COLORS.houseWalls[index]),
      });
      shedRoofs.push({
        matrix: posedMatrix(at.x, ground + height + 0.9, at.z, outToSea, length * 1.06, 1.8, depth * 1.08),
        color: new THREE.Color(COLORS.roofs[index % 3]),
      });
    });
  }

  const racks = [];
  const nets = [];
  const flatNets = [];
  const netSpots = [];
  // A few racks still beside the yards. The mouth banks are filled below.
  for (let i = 0; i < 4; i++) netSpots.push([anchor.along - 90 - i * 16, anchor.seaward + 8]);
  for (const along of [650, 760]) netSpots.push([along, -2]);
  const netYaw = yawTowards(mouth.rx, mouth.rz);
  for (const [along, seaward] of netSpots) {
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 2)) continue;
    const ground = groundAt(along, seaward);
    racks.push({
      matrix: posedMatrix(at.x, ground, at.z, netYaw, 1, 1, 1),
      color: new THREE.Color(0x6e5340),
    });
    nets.push({
      matrix: posedMatrix(at.x, ground + 1.05, at.z, netYaw, 0.05, 1.65, 5.8),
      color: new THREE.Color(iTone(random)),
    });
  }
  for (let i = 0; i < 6; i++) {
    const along = anchor.along - 410 - i * 28;
    const seaward = anchor.seaward + 16;
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 0)) continue;
    flatNets.push({
      matrix: flatMatrix(at.x, groundAt(along, seaward) + 0.08, at.z, netYaw + (random() - 0.5) * 0.4, 5.2, 2.6),
      color: new THREE.Color(iTone(random)),
    });
  }

  const rushes = [];
  const canes = [];
  const scrub = [];
  // Roofs and hulls occupy these bands. A cone through a barraca reads as a mistake.
  const crowded = (along, seaward) => {
    for (const hole of duneHoles) {
      const d = Math.hypot((along - hole.along) / hole.ra, (seaward - hole.seaward) / hole.rs);
      if (d < 1.05) return true;
    }
    const inAlong = along > anchor.along - 240 && along < anchor.along + 70;
    if (inAlong && seaward < anchor.seaward - 14 && seaward > anchor.seaward - 115) return true;
    const inRow = along < anchor.along - 350 && along > anchor.along - 780;
    return inRow && seaward < anchor.seaward + 6 && seaward > anchor.seaward - 30;
  };
  for (let i = 0; i < 100; i++) {
    const north = random() < 0.68;
    const along = north ? anchor.along - random() * 780 : 560 + random() * 320;
    const seaward = -40 - random() * 90;
    if (duneLift(along, seaward) < 0.22 || crowded(along, seaward)) continue;
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 10)) continue;
    const height = 0.7 + random() * 0.9;
    const ground = groundAt(along, seaward);
    rushes.push({
      matrix: posedMatrix(at.x, ground + height / 2, at.z, random() * 3, 0.7 + random() * 0.5, height, 0.7 + random() * 0.5),
      color: new THREE.Color(random() < 0.5 ? 0xa39a62 : 0x7d8a48),
    });
  }
  for (let i = 0; i < 36; i++) {
    const along = anchor.along - 20 - random() * 500;
    const seaward = anchor.seaward - 8 - random() * 28;
    if (crowded(along, seaward)) continue;
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 6)) continue;
    const height = 2.2 + random() * 1.3;
    const ground = groundAt(along, seaward);
    canes.push({
      matrix: posedMatrix(at.x, ground + height / 2, at.z, random() * 3, 0.55, height, 0.55),
      color: new THREE.Color(0x8b9350),
    });
  }
  // A reedbed just inland of the barracas: the gear stores had rushes behind them.
  for (let i = 0; i < 14; i++) {
    const along = anchor.along - 386 - i * 26;
    const seaward = anchor.seaward - 36;
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 8)) continue;
    const ground = groundAt(along, seaward);
    for (const side of [-4.5, 4.5]) {
      const height = 2.6 + (i % 3) * 0.45;
      canes.push({
        matrix: posedMatrix(
          at.x + mouth.rx * side,
          ground + height / 2,
          at.z + mouth.rz * side,
          i * 0.7,
          0.7,
          height,
          0.7,
        ),
        color: new THREE.Color(i % 2 ? 0x7f8b46 : 0x9aa15c),
      });
    }
  }
  for (let i = 0; i < 22; i++) {
    const along = (random() < 0.7 ? anchor.along - 80 : 600) - random() * 600;
    const seaward = -55 - random() * 70;
    const at = frame(mouth, along, seaward);
    if (!isDry(path, at.x, at.z, 12) || duneLift(along, seaward) < 0.2 || crowded(along, seaward)) continue;
    const ground = groundAt(along, seaward);
    const scale = 0.8 + random() * 0.9;
    scrub.push({
      matrix: posedMatrix(at.x, ground + scale * 0.45, at.z, random() * 3, scale, scale * 0.45, scale),
      color: new THREE.Color(random() < 0.5 ? 0x5f6b38 : 0x7a7048),
    });
  }

  // Mouth banks, just uphill of the hull stop: 200 m of coast upstream and
  // downstream, both sides. Solids stay outside boatStop. The run north to
  // the Grau crosses every lateral short of that stop, and boat.js does not
  // collide with these meshes.
  const folk = [];
  const heads = [];
  const dunes = [];
  const shirts = [0xe7e1d4, 0x6d7f8c, 0x8a5a44, 0x4f5d48, 0xd9c7a2];
  // The beach grid covers seaward -160..30. Keep props on that sand, which
  // is about 200 m of bank upstream of the mouth and a short way past it.
  const onLip = (spot, margin = 2) =>
    spot.seaward >= -150 && spot.seaward <= 26 && isDry(path, spot.x, spot.z, margin);
  const placeBarraca = (spot, yaw) => {
    // A house wants dry sand all round it: clear of the channel and above the wash.
    if (!onLip(spot, 14) || spot.seaward > -14) return;
    const ground = sandY(spot);
    const length = 8.6 + random() * 1.8;
    const width = 4.3 + random() * 0.4;
    const wall = 2.15;
    const roof = 3.6 + random() * 0.6;
    barracaWalls.push({
      matrix: posedMatrix(spot.x, ground + wall / 2, spot.z, yaw, length, wall, width),
      color: new THREE.Color(0xf3efe4),
    });
    barracaRoofs.push({
      matrix: posedMatrix(spot.x, ground + wall + roof / 2, spot.z, yaw, length * 1.08, roof, width * 1.22),
      color: new THREE.Color(random() < 0.3 ? 0xa68448 : THATCH),
    });
    doors.push({
      matrix: posedMatrix(
        spot.x - spot.side * spot.sample.rx * (width / 2 + 0.06),
        ground + 0.85,
        spot.z - spot.side * spot.sample.rz * (width / 2 + 0.06),
        yaw,
        0.9,
        1.6,
        0.08,
      ),
      color: new THREE.Color(0x3a2e24),
    });
  };
  const placeFigure = (spot) => {
    if (!onLip(spot, 2)) return;
    const ground = sandY(spot);
    const yaw = yawTowards(-spot.side * spot.sample.rx, -spot.side * spot.sample.rz);
    folk.push({
      matrix: posedMatrix(spot.x, ground + 0.72, spot.z, yaw, 0.46, 1.15, 0.28),
      color: new THREE.Color(shirts[folk.length % shirts.length]),
    });
    heads.push({
      matrix: posedMatrix(spot.x, ground + 1.48, spot.z, yaw, 0.22, 0.22, 0.22),
      color: new THREE.Color(0xd9a98a),
    });
  };
  for (const side of [-1, 1]) {
    let index = 0;
    for (let s = path.mouth - 190; s <= path.mouth + 80; s += 26) {
      const alongYaw = (spot) => yawTowards(spot.sample.tx, spot.sample.tz) + (random() - 0.5) * 0.35;
      const boat = bankPoint(path, mouth, s, side, 5 + (index % 2) * 3);
      if (onLip(boat, 2)) {
        addHull(boat.along, boat.seaward, alongYaw(boat), 0.88 + random() * 0.22, boatColors[index % boatColors.length]);
        hulls[hulls.length - 1].y += sandY(boat) - groundAt(boat.along, boat.seaward);
        if (index % 2 === 0) {
          masts.push({
            x: boat.x,
            y: sandY(boat) + 1.7,
            z: boat.z,
            yaw: 0,
            sx: 1,
            sy: 3.4,
            sz: 1,
            phase: 0,
            bob: 0,
            heel: 0,
            color: new THREE.Color(COLORS.wood),
          });
        }
      }
      if (index % 2 === 0) {
        const net = bankPoint(path, mouth, s + 8, side, 16);
        if (onLip(net, 2)) {
          const ground = sandY(net);
          const yaw = yawTowards(net.sample.tx, net.sample.tz);
          racks.push({ matrix: posedMatrix(net.x, ground, net.z, yaw, 1, 1, 1), color: new THREE.Color(0x6e5340) });
          nets.push({
            matrix: posedMatrix(net.x, ground + 1.05, net.z, yaw, 0.05, 1.65, 5.8),
            color: new THREE.Color(iTone(random)),
          });
          flatNets.push({
            matrix: flatMatrix(net.x + net.sample.rx * side * 3, ground + 0.08, net.z + net.sample.rz * side * 3, yaw, 4.6, 2.4),
            color: new THREE.Color(iTone(random)),
          });
        }
      }
      const hutHere = side < 0 || index % 2 === 0;
      if (hutHere) {
        const hut = bankPoint(path, mouth, s + 4, side, 30);
        placeBarraca(hut, alongYaw(hut));
        const cane = bankPoint(path, mouth, s + 4, side, 42);
        if (onLip(cane, 4)) {
          const ground = sandY(cane);
          const height = 2.7 + random() * 0.9;
          canes.push({
            matrix: posedMatrix(cane.x, ground + height / 2, cane.z, random() * 3, 0.75, height, 0.75),
            color: new THREE.Color(0x8b9350),
          });
        }
        placeFigure(bankPoint(path, mouth, s + 2, side, 12));
      }
      if (index % 3 === 0) {
        const dune = bankPoint(path, mouth, s + 12, side, 38);
        if (onLip(dune, 4)) {
          const ground = sandY(dune);
          dunes.push({
            matrix: posedMatrix(dune.x, ground + 0.4, dune.z, random() * 2, 8 + random() * 3, 0.85, 4.5 + random() * 2),
            color: new THREE.Color(0xe6d4b2),
          });
        }
      }
      index += 1;
    }
  }
  // One yoke on the north foreshore, hauling a boat up off the fairway.
  {
    const spot = bankPoint(path, mouth, path.mouth - 48, -1, 11);
    if (onLip(spot, 2)) {
      const ground = sandY(spot);
      const facing = yawTowards(-spot.sample.rx, -spot.sample.rz);
      for (const sign of [-1, 1]) {
        oxen.push({
          matrix: posedMatrix(
            spot.x + spot.sample.tx * 1.15 * sign,
            ground,
            spot.z + spot.sample.tz * 1.15 * sign,
            facing,
            1,
            1,
            1,
          ),
          color: new THREE.Color(sign < 0 ? 0x6a4a32 : 0x8a6244),
        });
      }
      yokes.push({
        matrix: posedMatrix(spot.x, ground + 1.22, spot.z, yawTowards(spot.sample.tx, spot.sample.tz), 0.12, 0.12, 2.5),
      });
    }
  }
  // Skiff on the south side of the mouth, 60 m off the centre and clear of
  // the run north to the Grau. boat.js will not stop the hull for it.
  {
    const skiffS = path.mouth + 52;
    const skiff = bankPoint(path, mouth, skiffS, 1, 62 - waterHalf(path, skiffS));
    const hull = addHull(skiff.along, skiff.seaward, outToSea + 0.65, 1.08, 0x4a3c32, 0.18);
    const mast = {
      x: hull.x,
      y: hull.y + 2.3,
      z: hull.z,
      yaw: hull.yaw,
      sx: 0.7,
      sy: 4.4,
      sz: 0.7,
      phase: hull.phase,
      bob: hull.bob,
      heel: 0,
      color: new THREE.Color(COLORS.wood),
    };
    masts.push(mast);
    bobbing.push(mast);
    lights.push({ x: hull.x, y: hull.y + 3.8, z: hull.z, size: 0.7 });
  }

  const surf = createSurf(mouth, path);
  group.add(surf.mesh);

  const hullMesh = buildPosed(hullGeo, hullMat, hulls);
  const mastMesh = buildPosed(mastGeo, wood, masts);
  const sailMesh = buildPosed(sailGeo, sailMat, sails);
  const cabinMesh = buildPosed(new THREE.BoxGeometry(1, 1, 1), lime, cabins);
  for (const mesh of [hullMesh, mastMesh, sailMesh, cabinMesh]) if (mesh) group.add(mesh);

  const roofGeometry = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  roofGeometry.rotateY(Math.PI / 4);
  const tuft = new THREE.ConeGeometry(0.4, 1, 4);
  group.add(
    createInstances(oxGeometry(), oxMat, oxen),
    createInstances(new THREE.BoxGeometry(1, 1, 1), wood, yokes),
    createInstances(new THREE.BoxGeometry(1, 1, 1), lime, barracaWalls),
    createInstances(roofGeometry, thatch, barracaRoofs),
    createInstances(new THREE.BoxGeometry(1, 1, 1), wood, doors),
    createInstances(new THREE.BoxGeometry(1, 1, 1), lime, sheds),
    createInstances(roofGeometry, tiles, shedRoofs),
    createInstances(rackGeometry(), wood, racks),
    createInstances(new THREE.BoxGeometry(1, 1, 1), cloth, nets),
    createInstances(flatNetGeometry(), cloth, flatNets),
    createInstances(tuft, scrubMat, rushes),
    createInstances(tuft, scrubMat, canes),
    createInstances(new THREE.IcosahedronGeometry(1, 0), scrubMat, scrub),
    createInstances(new THREE.SphereGeometry(1, 8, 5), scrubMat, dunes),
    createInstances(new THREE.BoxGeometry(1, 1, 1), lime, folk),
    createInstances(new THREE.BoxGeometry(1, 1, 1), lime, heads),
  );

  const gullHomes = [];
  for (let i = 0; i < 14; i++) {
    const flock = i < 8 ? 0 : 1;
    const along = flock === 0 ? anchor.along - 420 - (i % 8) * 16 : -180 + (i % 6) * 20;
    const seaward = flock === 0 ? 12 : 90 + (i % 4) * 16;
    const home = frame(mouth, along, seaward);
    const roostAlong = flock === 0 ? along : anchor.along - 220;
    const roostSea = flock === 0 ? -4 : -8;
    const roostAt = frame(mouth, roostAlong, roostSea);
    gullHomes.push({
      phase: random() * Math.PI * 2,
      radius: (flock === 0 ? 26 : 42) + random() * 20,
      height: (flock === 0 ? 6.5 : 14) + random() * 5,
      beat: 4.2 + random() * 2.4,
      speed: flock === 0 ? 0.32 : -0.2,
      cx: home.x,
      cz: home.z,
      roostX: roostAt.x,
      roostZ: roostAt.z,
      roostY: groundAt(roostAlong, roostSea) + 0.35,
    });
  }
  const gullMesh = new THREE.InstancedMesh(
    gullGeometry(),
    new THREE.MeshBasicMaterial({ color: 0xc5bfb2, side: THREE.DoubleSide }),
    gullHomes.length,
  );
  gullMesh.frustumCulled = false;
  group.add(gullMesh);
  const gullDummy = new THREE.Object3D();

  const lamps = lights.length ? createLampPoints(lights) : null;
  if (lamps) group.add(lamps);

  let night = 0;
  const poseDummy = new THREE.Object3D();

  function animate(time) {
    surf.animate(time);
    for (const item of bobbing) {
      if (!item.bob || !item.mesh) continue;
      pose(poseDummy, item, time);
      item.mesh.setMatrixAt(item.index, poseDummy.matrix);
    }
    if (hullMesh) hullMesh.instanceMatrix.needsUpdate = true;
    if (mastMesh) mastMesh.instanceMatrix.needsUpdate = true;
    if (sailMesh) sailMesh.instanceMatrix.needsUpdate = true;
    if (cabinMesh) cabinMesh.instanceMatrix.needsUpdate = true;
    if (lamps) lamps.material.uniforms.time.value = time;
    const roost = night > 0.55;
    gullHomes.forEach((gull, index) => {
      const angle = time * gull.speed + gull.phase;
      const x = roost ? gull.roostX : gull.cx + Math.cos(angle) * gull.radius;
      const z = roost ? gull.roostZ : gull.cz + Math.sin(angle) * gull.radius;
      const y = roost ? gull.roostY : gull.height + Math.sin(time * 0.4 + gull.phase) * 2.2;
      const dirX = -Math.sin(angle) * gull.speed;
      const dirZ = Math.cos(angle) * gull.speed;
      gullDummy.position.set(x, y, z);
      const pitch = roost ? 0 : Math.sin(time * gull.beat + gull.phase) * 0.35;
      gullDummy.rotation.set(pitch, roost ? gull.phase : yawTowards(dirX, dirZ), 0);
      const flap = roost ? 0.18 : 0.28 + Math.abs(Math.sin(time * gull.beat + gull.phase)) * 0.85;
      gullDummy.scale.set(1.8, flap, 1.8);
      gullDummy.updateMatrix();
      gullMesh.setMatrixAt(index, gullDummy.matrix);
    });
    gullMesh.instanceMatrix.needsUpdate = true;
  }

  function setNight(value) {
    night = value;
    if (!lamps) return;
    lamps.visible = value > 0.04;
    lamps.material.uniforms.night.value = value;
  }

  return { group, animate, setNight };
}

function posedMatrix(x, y, z, yaw, sx, sy, sz) {
  const dummy = new THREE.Object3D();
  dummy.rotation.set(0, yaw, 0);
  dummy.position.set(x, y, z);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  return dummy.matrix.clone();
}

function flatMatrix(x, y, z, yaw, width, depth) {
  const dummy = new THREE.Object3D();
  dummy.rotation.set(0, yaw, 0);
  dummy.rotateX(-Math.PI / 2);
  dummy.position.set(x, y, z);
  dummy.scale.set(width, depth, 1);
  dummy.updateMatrix();
  return dummy.matrix.clone();
}

let flatNetGeo = null;
function flatNetGeometry() {
  if (!flatNetGeo) flatNetGeo = new THREE.PlaneGeometry(1, 1);
  return flatNetGeo;
}

function indexColor(random) {
  return [0x5c4638, 0x3e342c, 0x6e5844, 0x4a4038][Math.floor(random() * 4)];
}

function iTone(random) {
  return [0xc2ad88, 0xb7a078, 0xd2c2a4, 0xa89070][Math.floor(random() * 4)];
}
