// Convent de Sant Josep i Santa Teresa, Discalced Carmelites, beside the
// Portal Nou. Founded in 1588 and moved here in 1609; the fabric was finished
// in 1628, so by 1700 the church and the enclosure stood. Cruïlles gives the
// church as 26.84 m long and 6.80 m wide, 6.80 m to the cornice: one nave,
// flat chevet, transept that barely projects, a square lantern (the dome has
// no drum) under a pyramidal tile roof, and a two-opening brick espadaña
// instead of a tower. The choir window over the niche is 1765, so it is left
// out. The cloister, the long range along the curtain and the cypresses are
// the block Tosca draws just inside the gate (Fortea's engraving, no. beside
// the Portal Nuevo); their sizes are read off that plate. The chapel dome and
// the rococo inside are later and not built. The lantern and the espadaña are
// tall enough to clear the 10 m curtain from the river: that height above the
// cornice is estimated.
// +X looks out at the curtain, so the door faces the gate.

export const landmark = {
  id: 'sant-josep',
  name: 'Convent de Sant Josep i Santa Teresa',
  kind: 'sant-josep',
  x: -341.3,
  z: -182.6,
  axis: [0.1588, -0.9873],
  length: 36,
  width: 56,
  // Four circles instead of one, so the clearing stays inside the wall and
  // off the gate. Centres are the church, the cloister, the east range and
  // the south garden, in scene metres.
  clearings: [
    { x: -345.3, z: -183.2, radius: 28 },
    { x: -327.3, z: -181.4, radius: 24 },
    { x: -308.1, z: -187.4, radius: 20 },
    { x: -331.7, z: -166.9, radius: 18 },
  ],
};

export function build(add, landmark, kit) {
  const { STONE, ROOF, DARK, RENDER, BRICK, SOIL, CYPRESS } = kit.colors;
  const { windowRow, cloister, ringOfOpenings, RIDGE_ALONG_X, FACING_Z } = kit;

  // Nave. 27 m outside for Cruïlles's 26.84 inside; 8.2 m across for the
  // 6.80 m nave plus the walls. Cornice at 6.80 m.
  const nave = { x: 0.5, z: -4, length: 27, width: 8.2, eaves: 6.8 };
  const face = nave.x + nave.length / 2;
  const chevet = nave.x - nave.length / 2;
  const bay = nave.length / 4;
  const crossX = chevet + bay * 1.5;
  const chapelX = chevet + bay * 2.5;
  add('box', [nave.x, 0, nave.z], [nave.length, nave.eaves, nave.width], RENDER);
  add('box', [nave.x, nave.eaves - 0.15, nave.z], [nave.length + 0.3, 0.3, nave.width + 0.3], STONE);
  // Roofs stop at the crossing so the lantern can rise out of it.
  add('gable', [(face + crossX + bay / 2) / 2, nave.eaves, nave.z], [nave.width, 2.5, face - (crossX + bay / 2)], ROOF, RIDGE_ALONG_X);
  add('gable', [(chevet + crossX - bay / 2) / 2, nave.eaves, nave.z], [nave.width, 2.3, crossX - bay / 2 - chevet], ROOF, RIDGE_ALONG_X);

  // West transept arm and the west chapel. The east pair sits inside the
  // cloister range. No dome on the chapel: that cupola is probably 18th century.
  const armZ = nave.z - (nave.width / 2 + 2);
  add('box', [crossX, 0, armZ], [bay, 6.2, 4], RENDER);
  add('gable', [crossX, 6.2, armZ], [bay, 1.6, 4], ROOF);
  const chapelZ = nave.z - (nave.width / 2 + 1.9);
  add('box', [chapelX, 0, chapelZ], [bay - 0.6, 5.2, 3.8], RENDER);
  add('pyramid', [chapelX, 5.2, chapelZ], [bay - 0.4, 1.5, 3.8], ROOF);
  for (const x of [chevet + 2.2, chevet + 5]) {
    add('box', [x, 4.2, nave.z - nave.width / 2 - 0.06], [0.3, 1.5, 0.8], DARK, FACING_Z);
  }

  // Square lantern, pyramidal roof, a small opening on each face. Not a drum.
  add('box', [crossX, nave.eaves, nave.z], [7.4, 6.2, 7.4], RENDER);
  add('box', [crossX, nave.eaves + 6.2, nave.z], [8, 0.4, 8], STONE);
  add('pyramid', [crossX, nave.eaves + 6.6, nave.z], [8.2, 3.8, 8.2], ROOF);
  ringOfOpenings(add, { x: crossX, y: nave.eaves + 3.2, z: nave.z, sides: 4, apothem: 3.9, width: 0.85, height: 1.5 });

  // Espadaña, set back from the front, two openings, brick, about as tall as
  // the lantern. Openings face the gate.
  const bell = { x: face - 4.2, z: nave.z };
  add('box', [bell.x, 8.6, bell.z], [1.15, 7.4, 4.2], BRICK);
  // Proud of the brick face: buried, the arch z-fights and reads as stripes.
  for (const dz of [-0.95, 0.95]) add('arch', [bell.x + 0.85, 11.5, bell.z + dz], [0.4, 2.1, 1.25], DARK);
  add('box', [bell.x, 16.0, bell.z], [1.35, 0.4, 4.6], STONE);
  add('gable', [bell.x, 16.4, bell.z], [4.8, 1.7, 1.2], BRICK, RIDGE_ALONG_X);
  add('ball', [bell.x, 18.1, bell.z], [0.42, 0.42, 0.42], STONE);

  // Facade in three bands: lintelled door, niche, pediment with an oculus
  // and balls. The rectangular choir window above the niche is 1765.
  const front = face + 0.2;
  add('box', [front, 0, nave.z], [0.55, 9.0, 9.2], RENDER);
  add('box', [front + 0.06, 3.35, nave.z], [0.7, 0.22, 9.4], STONE);
  add('box', [front + 0.06, 6.45, nave.z], [0.7, 0.22, 9.4], STONE);
  add('gable', [front + 0.12, 6.55, nave.z], [9.4, 3.15, 0.7], RENDER, RIDGE_ALONG_X);
  add('disk', [front + 0.4, 7.45, nave.z], [0.25, 1.15, 1.15], DARK);
  for (const z of [-4.5, 4.5]) add('ball', [front + 0.2, 6.55, nave.z + z], [0.42, 0.42, 0.42], STONE);
  add('ball', [front + 0.2, 9.7, nave.z], [0.46, 0.46, 0.46], STONE);
  add('box', [front + 0.22, 0, nave.z], [0.4, 3.15, 2.2], DARK);
  add('box', [front + 0.32, 0, nave.z - 1.3], [0.32, 3.35, 0.38], STONE);
  add('box', [front + 0.32, 0, nave.z + 1.3], [0.32, 3.35, 0.38], STONE);
  add('box', [front + 0.32, 3.1, nave.z], [0.32, 0.28, 3.0], STONE);
  add('box', [front + 0.18, 4.2, nave.z], [0.32, 1.85, 1.1], DARK);
  add('box', [front + 0.42, 4.45, nave.z], [0.22, 1.35, 0.38], STONE);

  // West wing on the plaza, two low storeys, and the cypresses Tosca draws
  // between the church and the corner of the wall. The row stops short of the
  // gate, which is 12 m further west.
  add('box', [11, 0, -9.5], [6, 6.2, 2.8], RENDER);
  add('gable', [11, 6.2, -9.5], [2.8, 1.5, 6], ROOF, RIDGE_ALONG_X);
  windowRow(add, { from: 9, to: 13, step: 2.2, y: 1.3, z: -10.95, width: 0.75, height: 1.4 });
  windowRow(add, { from: 9, to: 13, step: 2.2, y: 4.0, z: -10.95, width: 0.7, height: 1.25 });
  for (const x of [8.2, 10.6, 13]) add('pyramid', [x, 0, -11.4], [1.05, 6.2, 1.05], CYPRESS);

  // Cloister on the gospel side, and the long range continuing east along
  // the curtain. Both are the engraving's, not a measured plan.
  cloister(add, { x: 0, z: 13, width: 28, depth: 26, height: 7.4, color: RENDER });
  add('box', [9, 0, 34], [10, 7.4, 16], RENDER);
  add('gable', [9, 7.4, 34], [10, 2.3, 16], ROOF);
  for (let z = 28; z <= 40.01; z += 4) {
    add('box', [14.15, 1.5, z], [0.32, 1.6, 1.0], DARK);
    add('box', [14.15, 4.6, z], [0.32, 1.45, 1.0], DARK);
  }

  // South garden, a fraction of the later orchard on Blanquerías. Beds and
  // the closing walls are a guess at the size on the plate.
  add('box', [-18.2, 0, 12], [0.55, 2.8, 20], RENDER);
  add('box', [-16.2, 0, 2], [4.2, 2.8, 0.55], RENDER);
  add('box', [-16.2, 0, 22], [4.2, 2.8, 0.55], RENDER);
  for (let z = 6; z <= 18.01; z += 6) {
    add('box', [-16.2, 0, z], [3.2, 0.22, 4.2], SOIL);
    add('pyramid', [-16.2, 0, z], [1.1, 5.2, 1.1], CYPRESS);
  }
}
