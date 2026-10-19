// El Temple around 1700: the Valencia house of the Order of Montesa, on the
// ground Jaume I gave the Templars on 19 November 1238, inside the Christian
// wall between the Trinitat and Real gates. In 1761 the solar still held
// houses, a church of the order and the remains of the tower of Alí Bufat;
// the neoclassical palace begun that year is not here. Tower and gate of
// Bāb Ibn Saḫar came down in 1865.
//
// Nothing gives the plan. The tower is a guess at those remains: 16 m square
// and 24 m to the walk, so the shaft clears the Christian curtain from the
// river. Rammed earth (the brick tint stands in for tapial) on a stone base,
// with the city-side merlons already gone. The curtain is a surviving stretch
// of the Islamic wall, about 2.3 m thick and only 7 m tall, with a pointed
// gate beside the tower. The church is one nave and an espadaña, not the
// two-towered church of 1770. The ranges are the encomienda's houses around a
// yard. Measures are estimated.

import * as THREE from 'three';

// Rammed earth, the colour of the Islamic wall: an earthy ochre, not brick.
const TAPIAL = new THREE.Color(0xbf9f72);

export const landmark = {
  id: 'temple',
  name: 'el Temple de Montesa',
  kind: 'temple',
  x: 410.6,
  z: 283.7,
  // Along the curtain from the Trinitat gate towards the Real, so +X runs
  // south-east and +Z points into the city.
  axis: [0.774, 0.634],
  length: 70,
  width: 46,
};

export function build(add, landmark, kit) {
  const { STONE, ROOF, DARK, RENDER, BRICK, SOIL, CYPRESS } = kit.colors;
  const { RIDGE_ALONG_X, FACING_Z } = kit;

  // Square tower, river side of the house. The north face is the one towards
  // the Christian curtain, set back so the two walls do not cut each other.
  const TX = -20;
  const TZ = -6;
  const HALF = 8;
  const WALK = 24;
  add('box', [TX, 0, TZ], [HALF * 2 + 0.7, 2.4, HALF * 2 + 0.7], STONE);
  add('box', [TX, 2.4, TZ], [HALF * 2 + 0.15, 4.2, HALF * 2 + 0.15], TAPIAL);
  add('box', [TX, 6.6, TZ], [HALF * 2 - 0.7, WALK - 7.2, HALF * 2 - 0.7], TAPIAL);
  add('box', [TX, WALK - 0.7, TZ], [HALF * 2 + 0.2, 0.7, HALF * 2 + 0.2], STONE);
  // Machicolation on the river face, and the pointed door on the city face.
  add('box', [TX, WALK - 1.5, TZ - HALF - 0.35], [5.2, 0.7, 1.15], STONE);
  for (const dx of [-1.6, 0, 1.6]) add('box', [TX + dx, WALK - 2.5, TZ - HALF - 0.15], [0.55, 1.1, 0.7], STONE);
  add('pointed', [TX, 0, TZ + HALF + 0.08], [0.45, 5.4, 2.6], STONE, FACING_Z);
  add('pointed', [TX, 0.05, TZ + HALF + 0.28], [0.4, 4.6, 1.9], DARK, FACING_Z);
  for (const y of [9.2, 15.2, 20.4]) {
    add('box', [TX, y, TZ - HALF + 0.15], [0.28, 1.7, 0.45], DARK, FACING_Z);
    add('box', [TX, y, TZ + HALF - 0.15], [0.28, 1.7, 0.45], DARK, FACING_Z);
    add('box', [TX - HALF + 0.15, y, TZ], [0.28, 1.7, 0.45], DARK);
    add('box', [TX + HALF - 0.15, y, TZ], [0.28, 1.7, 0.45], DARK);
  }
  // Merlons. The city side keeps two stumps: the 1761 account calls it remains.
  const rim = HALF - 0.45;
  const merlon = (x, z, h) => add('box', [x, WALK, z], [0.95, h, 0.85], STONE);
  for (let i = -2; i <= 2; i++) {
    const along = (i / 2) * (rim - 0.6);
    merlon(TX + along, TZ - rim, 1.35);
    merlon(TX + rim, TZ + along, 1.35);
    merlon(TX - rim, TZ + along, i === 0 ? 0.55 : 1.35);
    if (Math.abs(i) === 2) merlon(TX + along, TZ + rim, 0.7);
  }

  // Piece of the old wall running on from the tower towards the Real gate,
  // with the pointed entrance in the gap between them.
  const WALL_Z = -13;
  add('box', [13, 0, WALL_Z], [36, 1.3, 2.7], STONE);
  add('box', [13, 1.3, WALL_Z], [36, 5.9, 2.35], TAPIAL);
  add('box', [-8.6, 5.4, WALL_Z], [6.8, 1.9, 2.5], TAPIAL);
  add('pointed', [-8.6, 0, WALL_Z], [2.7, 5.6, 3.5], STONE, FACING_Z);
  add('pointed', [-8.6, 0.08, WALL_Z], [2.2, 4.8, 2.5], DARK, FACING_Z);
  for (let x = -3; x <= 29.5; x += 2.7) {
    const broken = x > 6 && x < 12;
    const h = broken ? 0.45 : 1.15;
    if (x > 16 && x < 19) continue;
    add('box', [x, 7.2, WALL_Z - 0.85], [0.85, h, 0.6], STONE);
    add('box', [x, 7.2, WALL_Z + 0.85], [0.85, h, 0.6], STONE);
  }
  for (const x of [2, 20]) add('box', [x, 3.2, WALL_Z - 1.25], [0.25, 1.3, 0.35], DARK, FACING_Z);

  // Church of the order: one nave, a polygonal apse, door and espadaña at the
  // west end, towards the tower. No dome and no second tower.
  const NX = 8;
  const NZ = 1;
  const NAVEL = 26;
  const NAVEW = 12;
  const NAVEH = 12;
  add('box', [NX, 0, NZ], [NAVEL, NAVEH, NAVEW], RENDER);
  add('box', [NX, 0, NZ], [NAVEL + 0.3, 1.1, NAVEW + 0.35], STONE);
  add('gable', [NX, NAVEH, NZ], [NAVEW + 0.5, 3.4, NAVEL + 0.4], ROOF, RIDGE_ALONG_X);
  add('oct', [NX + NAVEL / 2 - 1, 0, NZ], [NAVEW - 1, NAVEH, NAVEW - 1], RENDER);
  add('cone', [NX + NAVEL / 2 - 1, NAVEH, NZ], [NAVEW - 0.4, 3.6, NAVEW - 0.4], ROOF);
  const west = NX - NAVEL / 2;
  add('pointed', [west - 0.08, 0, NZ], [0.5, 6.2, 3.2], STONE);
  add('pointed', [west - 0.28, 0.1, NZ], [0.4, 5.2, 2.3], DARK);
  add('wheel', [west - 0.2, 8.3, NZ], [0.28, 2.8, 2.8], STONE);
  add('disk', [west - 0.08, 8.3, NZ], [0.22, 2.2, 2.2], DARK);
  add('box', [west - 0.15, NAVEH + 1.6, NZ], [0.55, 4.2, 3.6], RENDER);
  add('arch', [west - 0.4, NAVEH + 2.3, NZ], [0.35, 2.2, 1.35], DARK);
  add('gable', [west - 0.15, NAVEH + 5.8, NZ], [4, 1.3, 0.6], RENDER, RIDGE_ALONG_X);
  add('ball', [west - 0.15, NAVEH + 7.1, NZ], [0.4, 0.4, 0.4], STONE);
  for (const side of [-1, 1]) {
    const z = NZ + side * (NAVEW / 2 - 0.15);
    for (let x = NX - 8; x <= NX + 6.1; x += 6.5) {
      add('box', [x, 0, z + side * 0.7], [1.15, 10.2, 1.35], STONE);
      add('pyramid', [x, 10.2, z + side * 0.7], [1.05, 1.5, 1.2], RENDER);
      if (x > NX + 4) continue;
      add('pointed', [x + 3.25, 5.6, z + side * 0.15], [0.36, 4.4, 1.35], DARK, FACING_Z);
    }
  }

  // Houses of the encomienda: a street range to the south, a taller wing to
  // the east, and the yard between them and the church. The range starts at
  // the church front, so it leaves the door between the tower and the nave open.
  const SX = 11;
  const SZ = 18;
  const SL = 26;
  const SD = 8;
  add('box', [SX, 0, SZ], [SL + 0.4, 1, SD + 0.4], STONE);
  add('box', [SX, 1, SZ], [SL, 6.6, SD], RENDER);
  add('gable', [SX, 7.6, SZ], [SD + 0.5, 2.3, SL + 0.4], ROOF, RIDGE_ALONG_X);
  add('arch', [SX, 0.2, SZ + SD / 2 + 0.15], [0.4, 3.3, 2.1], DARK, FACING_Z);
  add('arch', [SX - 6, 0.2, SZ - SD / 2 - 0.15], [0.4, 3.1, 1.8], DARK, FACING_Z);
  for (const y of [2.5, 5.3]) {
    for (let x = SX - 10; x <= SX + 10.1; x += 4) {
      if (y < 3 && Math.abs(x - SX) < 2.2) {
        add('box', [x, y, SZ - SD / 2 - 0.15], [0.3, 1.55, 0.95], DARK, FACING_Z);
        continue;
      }
      if (y < 3 && Math.abs(x - (SX - 6)) < 1.8) {
        add('box', [x, y, SZ + SD / 2 + 0.15], [0.3, 1.7, 1.05], DARK, FACING_Z);
        continue;
      }
      add('box', [x, y, SZ + SD / 2 + 0.15], [0.3, 1.7, 1.05], DARK, FACING_Z);
      add('box', [x, y, SZ - SD / 2 - 0.15], [0.3, 1.55, 0.95], DARK, FACING_Z);
    }
  }
  add('box', [31, 0, 11], [8.4, 1, 15.2], STONE);
  add('box', [31, 1, 11], [8, 8.4, 14.8], RENDER);
  add('gable', [31, 9.4, 11], [8.5, 2.5, 15.2], ROOF);
  add('arch', [35.15, 0.2, 8], [0.4, 3.2, 1.9], DARK);
  for (const y of [2.4, 5.4, 7.8]) {
    for (let z = 6; z <= 16.1; z += 3.3) {
      if (y < 3 && Math.abs(z - 8) < 1.8) continue;
      add('box', [35.15, y, z], [0.3, 1.55, 1], DARK);
      add('box', [26.85, y, z], [0.3, 1.45, 0.9], DARK);
    }
  }
  for (const [x, z] of [[2, 18], [20, 18], [31, 16]]) add('box', [x, 9.2, z], [0.7, 1.5, 0.7], BRICK);

  // Yard: a bed, a well and one cypress. The planting is invented.
  add('box', [4, 0, 11], [14, 0.18, 4.2], SOIL);
  add('oct', [10, 0, 11], [1.7, 0.85, 1.7], STONE);
  add('oct', [10, 0.85, 11], [0.7, 0.35, 0.7], DARK);
  add('pyramid', [-4, 0, 11.2], [1.5, 6.5, 1.5], CYPRESS);
}
