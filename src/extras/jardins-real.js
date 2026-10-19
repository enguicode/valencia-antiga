// Jardins del Real, the walled huerta of the Palau del Real, about 1700.
// Not the municipal park (1903) and not Elío's rubble mounds (1814).
//
// Tosca (1704; Fortea's engraving of 1738, north downwards) draws the palace
// cut by the edge of the sheet. West of it, two bands of embroidered
// parterres and a round basin; east of it, a grid of tree plots; the north
// runs off the sheet. The gardens lay to the north and the west (Arciniega;
// see docs/sources.md on the palace), and Felipe II's order of 1560 makes
// the orange and lemon nursery a fact. «Horta del Viver» is the pool that
// watered it. The broderie itself is not modelled.
//
// The frame is the palace's: origin at its centre, +X downstream, +Z toward
// the river, so the beds meet the garden walls that model already draws
// (north at z = -100, west at x = -90, east at x = 50). Nothing is placed
// on the river side of the facade. That ground is the Llano del Real and
// the start of the Albereda. Lengths are read off the engraving by eye
// against the palace in the scene (about 110 m of facade). Estimated: every
// bed size, the northward limit, where the pool sat, the ditch, the gate,
// and drawing the edge trees as cypresses. Oranges and lemons are one tree.

import * as THREE from 'three';

// Water in the basin, the pool and the ditch: dark blue-green, not black.
const WATER = new THREE.Color(0x3f7487);

export const landmark = {
  id: 'jardins-real',
  name: 'Jardins del Real',
  kind: 'jardins-real',
  // Same point as palau-real, so alignToRiver uses the same tangent and the
  // two frames coincide. The planted ground is north, west and east of it.
  x: 725.9,
  z: 128.2,
  axis: [0.699, 0.715],
  alignToRiver: true,
  length: 366,
  width: 178,
  clearings: [
    { x: 686.3, z: -126.8, radius: 38 },
    { x: 653.4, z: -94.7, radius: 38 },
    { x: 620.5, z: -62.5, radius: 38 },
    { x: 587.6, z: -30.3, radius: 38 },
    { x: 722.6, z: -89.6, radius: 38 },
    { x: 689.8, z: -57.5, radius: 38 },
    { x: 656.9, z: -25.3, radius: 38 },
    { x: 624.0, z: 6.9, radius: 38 },
    { x: 759.0, z: -52.5, radius: 38 },
    { x: 726.1, z: -20.3, radius: 38 },
    { x: 693.2, z: 11.9, radius: 38 },
    { x: 660.4, z: 44.0, radius: 38 },
    { x: 795.4, z: -15.3, radius: 38 },
    { x: 762.5, z: 16.9, radius: 38 },
    { x: 729.6, z: 49.0, radius: 38 },
    { x: 831.7, z: 21.9, radius: 38 },
    { x: 798.9, z: 54.0, radius: 38 },
    { x: 766.0, z: 86.2, radius: 38 },
    { x: 868.1, z: 59.0, radius: 38 },
    { x: 835.2, z: 91.2, radius: 38 },
    { x: 802.3, z: 123.4, radius: 38 },
    { x: 904.5, z: 96.2, radius: 38 },
    { x: 871.6, z: 128.4, radius: 38 },
    { x: 838.7, z: 160.6, radius: 38 },
    // View from the river onto the west parterres. Filler trees stay in
    // front of the palace facade (the Llano) and along the Albereda.
    { x: 556.3, z: -13.7, radius: 36 },
    { x: 532.7, z: 9.4, radius: 36 },
    { x: 509.1, z: 32.5, radius: 36 },
    { x: 486.3, z: 54.8, radius: 36 },
    { x: 584.3, z: 14.9, radius: 36 },
    { x: 560.7, z: 38.0, radius: 36 },
    { x: 537.1, z: 61.1, radius: 36 },
    { x: 514.2, z: 83.4, radius: 36 },
    { x: 612.3, z: 43.5, radius: 36 },
    { x: 588.7, z: 66.6, radius: 36 },
    { x: 565.1, z: 89.7, radius: 36 },
    { x: 542.2, z: 112.0, radius: 36 },
    { x: 636.7, z: 68.5, radius: 36 },
    { x: 613.2, z: 91.6, radius: 36 },
    { x: 589.6, z: 114.7, radius: 36 },
    { x: 566.7, z: 137.1, radius: 36 },
  ],
};

export function build(add, landmark, kit) {
  const { STONE, PALE, DARK, RENDER, SOIL, LEAF, CYPRESS } = kit.colors;

  // Enclosure. The south side stops at the facade line: past it is the Llano.
  // The west end stays inland of Sant Pius V (closer to the river) and well
  // short of the Trinitat.
  const WEST = -228;
  const EAST = 138;
  const NORTH = -168;
  const SOUTH_W = 10;
  const SOUTH_E = -30;
  const WALL = 2.35;
  const wall = (x, z, sx, sz, height = WALL) => add('box', [x, 0, z], [sx, height, sz], RENDER);

  wall(WEST, (NORTH + SOUTH_W) / 2, 0.7, SOUTH_W - NORTH);
  wall((WEST + EAST) / 2, NORTH, EAST - WEST, 0.7);
  wall(EAST, (NORTH + SOUTH_E) / 2, 0.7, SOUTH_E - NORTH);
  wall((54 + EAST) / 2, SOUTH_E, EAST - 54, 0.7);
  // Gate on the walk, toward the palace approach, not out on the Llano.
  wall((WEST + -164) / 2, SOUTH_W, -164 - WEST, 0.7);
  // Meets the palace's west wall (x = -90) so the corner closes.
  wall((-156 + -90.4) / 2, SOUTH_W, -90.4 - -156, 0.7);
  for (const x of [-164.8, -155.2]) add('box', [x, 0, SOUTH_W], [1.35, 4.1, 1.35], STONE);
  // Low wall between the parterres and the nursery, where the engraving
  // changes from broderie to planted plots.
  wall(-160, -74, 118, 0.55, 1.2);

  const hedge = (x, z, sx, sz) => add('box', [x, 0, z], [sx, 0.6, sz], LEAF);
  const parterre = (x, z, sx, sz) => {
    const t = 0.5;
    add('box', [x, 0, z], [sx - 1.3, 0.14, sz - 1.3], SOIL);
    hedge(x, z + sz / 2 - t / 2, sx, t);
    hedge(x, z - sz / 2 + t / 2, sx, t);
    hedge(x + sx / 2 - t / 2, z, t, sz - t);
    hedge(x - sx / 2 + t / 2, z, t, sz - t);
    // A cross of low box hedge inside, so each bed reads as a parterre.
    hedge(x, z, sx - 3, t);
    hedge(x, z, t, sz - 3);
  };
  // Two bands of four, west of the palace. Walks are the grass left between.
  for (const x of [-207, -177, -145, -115]) {
    parterre(x, -53, 26, 26);
    parterre(x, -15, 26, 26);
  }
  // The cross walks, and the round basin Tosca draws in the west parterre.
  // Squared up only in the coping: the water is an octagon, the kit has no
  // flat disc. The little tazza in the middle is a guess.
  add('box', [-161, 0, -36], [3.2, 0.08, 78], PALE);
  add('box', [-160, 0, -34], [120, 0.08, 3.2], PALE);
  const basin = { x: -161, z: -34, r: 4.1 };
  add('oct', [basin.x, 0, basin.z], [7.2, 0.14, 7.2], WATER);
  kit.around(add, {
    x: basin.x, z: basin.z, sides: 8, radius: basin.r, y: 0,
    solid: 'box', height: 0.5, width: 3.4, depth: 0.55, color: STONE,
  });
  add('oct', [basin.x, 0.14, basin.z], [1.15, 0.55, 1.15], STONE);

  const cypress = (x, z, height) => add('pyramid', [x, 0, z], [1.35, height, 1.35], CYPRESS);
  // A row above the south wall, so the garden reads from the river, and four
  // more around the basin. Tosca plants the edges; the species is a guess.
  // Tall on purpose: from the boat the parapet hides anything under about
  // 6 m at this distance, and a garden wall does not clear it.
  for (const x of [-214, -196, -178, -144, -126, -108]) cypress(x, 3.4, 12.5);
  cypress(-168.5, 5.2, 11);
  cypress(-153.5, 5.2, 11);
  for (const [x, z] of [[-167, -40], [-155, -40], [-167, -28], [-155, -28]]) cypress(x, z, 6.4);
  for (const [x, z] of [[-222, -162], [132, -162], [132, -38], [-84, -70], [-84, -46], [-84, -22]]) cypress(x, z, 6.8);

  // Nursery rows: small oranges (and the lemons, which look the same here).
  // The pool of the Viver sits in the north orchard, off the edge of Tosca's
  // sheet, where a reservoir can feed the beds without crossing the Llano.
  const POND = { x: -28, z: -132, sx: 32, sz: 18 };
  const blocked = (x, z) => {
    if (Math.abs(x - POND.x) < POND.sx / 2 + 0.8 && Math.abs(z - POND.z) < POND.sz / 2 + 0.8) return true;
    if (Math.abs(x + 90) < 3.2 && z > -104 && z < 22) return true; // palace west wall
    if (Math.abs(x - 50) < 3.2 && z > -104 && z < -20) return true; // palace east wall
    if (Math.abs(z + 100) < 3 && x > -94 && x < 54) return true; // palace north wall
    if (x > -66 && x < 52 && z > -28) return true; // the palace itself
    return false;
  };
  const orange = (x, z) => {
    add('box', [x, 0, z], [0.35, 1.4, 0.35], DARK);
    add('ball', [x, 1.2, z], [3.4, 3, 3.4], LEAF);
  };
  const row = (z, x0, x1, step) => {
    let run = null;
    let prev = null;
    const flush = (a, b) => {
      if (a == null) return;
      add('box', [(a + b) / 2, 0, z], [b - a + 3.2, 0.13, 3.3], SOIL);
    };
    for (let x = x0; x <= x1 + 0.01; x += step) {
      if (blocked(x, z)) {
        flush(run, prev);
        run = null;
        prev = null;
        continue;
      }
      if (run == null) run = x;
      prev = x;
      orange(x, z);
    }
    flush(run, prev);
  };
  // Across the north, one spacing, broken where a palace wall or the pool is.
  for (let z = -160; z <= -88; z += 8) row(z, -214, 124, 8);
  // The court immediately behind the palace, inside its own north wall.
  for (const z of [-84, -74, -64, -54, -44, -34]) row(z, -78, 40, 8);
  // East huerto, the grid of plots beside the Real Vell.
  for (const z of [-88, -78, -68, -58, -48, -38]) row(z, 64, 124, 8);

  add('box', [POND.x, 0, POND.z], [POND.sx, 0.16, POND.sz], WATER);
  add('box', [POND.x, 0, POND.z + POND.sz / 2], [POND.sx + 1.4, 0.42, 0.7], STONE);
  add('box', [POND.x, 0, POND.z - POND.sz / 2], [POND.sx + 1.4, 0.42, 0.7], STONE);
  add('box', [POND.x + POND.sx / 2, 0, POND.z], [0.7, 0.42, POND.sz], STONE);
  add('box', [POND.x - POND.sx / 2, 0, POND.z], [0.7, 0.42, POND.sz], STONE);
  cypress(POND.x - 20, POND.z, 7.4);
  cypress(POND.x + 20, POND.z, 7.4);

  // The ditch that feeds the beds. The historical channel also reached the
  // river along the Albereda; that length is not drawn here.
  const ditch = (x0, x1, z) => {
    const x = (x0 + x1) / 2;
    const len = Math.abs(x1 - x0);
    add('box', [x, 0, z], [len, 0.1, 1.45], WATER);
    add('box', [x, 0, z + 0.85], [len, 0.22, 0.28], STONE);
    add('box', [x, 0, z - 0.85], [len, 0.22, 0.28], STONE);
  };
  ditch(-210, POND.x - POND.sx / 2 - 0.6, POND.z);
  ditch(POND.x + POND.sx / 2 + 0.6, 120, POND.z);
}
