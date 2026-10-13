import * as THREE from 'three';
import { RIVER, BANK, COLORS, yawTowards } from './config.js';
import { buildRibbon } from './path.js';
import { createInstances } from './instancing.js';
import { createSurface } from './materials.js';

// Stonework along the river: the parapet walls (pretiles) with their stone
// balls, the stairs down to the water and a weir.

export const PRETIL = {
  offset: RIVER.width / 2 + BANK.slopeRun, // from the centreline
  foot: 1, // height of the shore where the wall starts
  parapet: 1.1, // above street level
  thickness: 0.8,
};

const BALL_SPACING = 12;
const STAIRS = { steps: 18, tread: 0.5, rise: 0.45, width: 6, downstreamOfBridge: 30 };

export function createRiverside(layout, path) {
  const stone = createSurface('masonry', 3, { color: COLORS.stone, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const top = BANK.height + PRETIL.parapet;
  // Parapets end with the tour. Further down the banks are earth and reeds.
  const walled = path.citySamples.filter((sample) => sample.s <= path.garden);

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      buildRibbon(walled, [
        [side * PRETIL.offset, PRETIL.foot],
        [side * PRETIL.offset, top],
        [side * (PRETIL.offset + PRETIL.thickness), top],
        [side * (PRETIL.offset + PRETIL.thickness), BANK.height],
      ]),
      stone,
    );
    wall.frustumCulled = false;
    group.add(wall);
  }

  // Stone balls on the parapet, only along the navigable stretch
  const balls = [];
  const dummy = new THREE.Object3D();
  const every = Math.round(BALL_SPACING / path.step);
  path.samples.forEach((sample, i) => {
    if (i % every !== 0 || sample.s < path.start - 150 || sample.s > path.garden) return;
    for (const side of [-1, 1]) {
      const lateral = side * (PRETIL.offset + PRETIL.thickness / 2);
      dummy.position.set(sample.x + sample.rx * lateral, top + 0.35, sample.z + sample.rz * lateral);
      dummy.updateMatrix();
      balls.push({ matrix: dummy.matrix.clone() });
    }
  });
  group.add(createInstances(new THREE.SphereGeometry(0.45, 12, 9), stone, balls));

  // Stairs from the street down to the water, just downstream of each bridge
  // on the city side. Local +X points towards the river.
  const steps = [];
  for (const bridge of layout.bridges) {
    const station = path.project(bridge.x, bridge.z).s + STAIRS.downstreamOfBridge;
    const sample = path.sampleAt(station);
    const frame = new THREE.Matrix4()
      .makeRotationY(yawTowards(-sample.rx, -sample.rz))
      .setPosition(sample.x + sample.rx * PRETIL.offset, 0, sample.z + sample.rz * PRETIL.offset);
    for (let i = 0; i < STAIRS.steps; i++) {
      const stepTop = BANK.height - (i + 1) * STAIRS.rise;
      dummy.position.set((i + 0.5) * STAIRS.tread, (stepTop - 2) / 2, 0);
      dummy.scale.set(STAIRS.tread, stepTop + 2, STAIRS.width);
      dummy.updateMatrix();
      steps.push({ matrix: frame.clone().multiply(dummy.matrix) });
    }
    dummy.scale.set(1, 1, 1);
  }
  group.add(createInstances(new THREE.BoxGeometry(1, 1, 1), stone, steps));

  // A weir closes the upstream end of the navigable water. Its position is
  // made up: it is there to give the limit a reason.
  const head = path.sampleAt(path.start - 12);
  const weir = new THREE.Group();
  weir.position.set(head.x, 0, head.z);
  weir.rotation.y = yawTowards(head.rx, head.rz);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(PRETIL.offset * 2, 2.7, 3), stone);
  sill.position.y = -0.75;
  const foam = new THREE.Mesh(
    new THREE.BoxGeometry(PRETIL.offset * 2, 0.1, 5),
    new THREE.MeshBasicMaterial({ color: 0xf4f7f2, transparent: true, opacity: 0.75 }),
  );
  foam.position.set(0, 0.32, -4); // local -Z is downstream
  weir.add(sill, foam);
  group.add(weir);

  return group;
}
