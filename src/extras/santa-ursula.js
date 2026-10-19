// Convent de Santa Úrsula, Augustinian nuns, against the inside of the Quart
// gate. Founded in 1605 under Juan de Ribera; the church was finished in 1645
// and in 1691 Francisco Martí rebuilt the vaults and the shell over the
// sanctuary (Teixidor, via the municipal guide and the CTAV guide). Tosca's
// plan of 1704 numbers it 45, "Conv. de S. Ursula, Agust. descalzas": church,
// cloister and an orchard hard by the towers. The church is the only part
// still original — one brick nave, chapels between the buttresses, a straight
// end, a stone door at the feet and a steep tile roof. A bell cast in 1665
// says a belfry already stood over that door. That espadaña came down with
// the convent in the 1950s; the two-opening one there now is the replacement
// of about 1960, so this one is a single opening and its height is a guess.
// The curved shoulders of the standing gable are drawn as a plain triangle.
// The cloister, the enclosure wall and the orchard are a sketch of the
// engraving: the ranges were rebuilt in 1960.
//
// Local +X runs north along the wall, so the door at −X faces the square
// inside the gate. The nave is about 30 × 12 m, from the standing footprint;
// the cloister and the orchard are sized off the plan by eye.

export const landmark = {
  id: 'santa-ursula',
  name: 'Convent de Santa Úrsula',
  kind: 'santa-ursula',
  x: -637.5,
  z: 333.1,
  axis: [0.107, -0.994],
  length: 58,
  width: 44,
};

export function build(add, landmark, kit) {
  const { BRICK, STONE, ROOF, DARK, RENDER, SOIL, LEAF, CYPRESS } = kit.colors;
  const { cloister, RIDGE_ALONG_X, FACING_Z } = kit;

  const nave = { x: -11, z: -12, length: 30, width: 12, height: 13 };
  const south = nave.x - nave.length / 2;
  const west = nave.z - nave.width / 2;

  add('box', [nave.x, 0, nave.z], [nave.length, nave.height, nave.width], BRICK);
  // Steep pitch, the thing the guides single out. The ridge stops short of
  // the front wall, which rises in front of it as a screen.
  add('gable', [nave.x + 1, nave.height, nave.z], [nave.width, 6.2, nave.length - 2], ROOF, RIDGE_ALONG_X);

  // Chapels and buttresses on the flank that faces the wall (Guillem de Castro).
  add('box', [nave.x + 1, 0, west - 1.5], [nave.length - 4, 8, 3], BRICK);
  add('gable', [nave.x + 1, 8, west], [6.4, 2.3, nave.length - 4], ROOF, RIDGE_ALONG_X);
  for (let i = 0; i < 4; i++) {
    const x = south + 7.2 + i * 6.6;
    add('box', [x, 0, west - 1.6], [1.35, 11, 3.3], BRICK);
    add('pyramid', [x, 11, west - 1.6], [1.25, 1.7, 1.5], STONE);
    if (i < 3) add('arch', [x + 3.3, 7.4, west + 0.15], [0.36, 3.4, 1.6], DARK, FACING_Z);
  }
  // Clearstorey on the cloister side, above the alley between nave and ranges.
  for (let i = 0; i < 4; i++) {
    add('arch', [south + 6 + i * 6.4, 9.6, nave.z + nave.width / 2 + 0.12], [0.34, 3.2, 1.5], DARK, FACING_Z);
  }
  // Straight end, one window. The shell vault is inside and does not show.
  add('arch', [nave.x + nave.length / 2 + 0.15, 5.4, nave.z], [0.38, 4.6, 2.2], DARK);

  // South front: brick screen, stone door, niche, window, gable with finials.
  const face = south - 0.35;
  add('box', [face, 0, nave.z], [0.7, 14.4, nave.width + 0.8], BRICK);
  add('box', [face - 0.15, 14.1, nave.z], [0.9, 0.45, nave.width + 1.6], STONE);
  add('gable', [face - 0.2, 14.55, nave.z], [nave.width + 1.4, 5.6, 0.75], BRICK, RIDGE_ALONG_X);
  add('arch', [face - 0.45, 16.5, nave.z], [0.34, 2.3, 1.35], DARK);
  for (const z of [nave.z - 6.2, nave.z + 6.2]) {
    add('ball', [face - 0.2, 14.7, z], [0.55, 0.55, 0.55], STONE);
  }
  // One bell over the door. The piers start down inside the gable so the
  // cote sits on it; the opening itself clears the apex. Tall enough to
  // read beside the Quart towers from the river. The height is a guess.
  const bell = 18.7;
  add('box', [face - 0.25, bell, nave.z - 1.05], [0.75, 4.7, 0.55], BRICK);
  add('box', [face - 0.25, bell, nave.z + 1.05], [0.75, 4.7, 0.55], BRICK);
  add('arch', [face - 0.5, 20.5, nave.z], [0.4, 2.45, 1.7], DARK);
  add('gable', [face - 0.25, bell + 4.7, nave.z], [3.2, 1.45, 0.75], BRICK, RIDGE_ALONG_X);
  add('ball', [face - 0.25, bell + 6.15, nave.z], [0.42, 0.42, 0.42], STONE);
  add('arch', [face - 0.4, 0, nave.z], [0.42, 6.0, 3.5], STONE);
  add('arch', [face - 0.62, 0.05, nave.z], [0.36, 5.1, 2.6], DARK);
  for (const z of [-2.35, 2.35]) add('box', [face - 0.35, 0, nave.z + z], [0.55, 7.1, 0.55], STONE);
  add('box', [face - 0.4, 6.5, nave.z], [0.5, 0.4, 5.4], STONE);
  add('arch', [face - 0.45, 7.05, nave.z], [0.4, 2.5, 1.45], STONE);
  add('arch', [face - 0.65, 7.2, nave.z], [0.32, 2.05, 1.05], DARK);
  add('ball', [face - 0.7, 7.55, nave.z], [0.55, 0.85, 0.55], STONE); // the figure in the niche, a guess
  add('box', [face - 0.5, 10.3, nave.z], [0.32, 1.7, 1.25], DARK);

  // Cloister to the east of the nave (the epistle side), two storeys.
  // The door sits on the south face, to the right of the church door.
  cloister(add, { x: -11, z: 7, width: 26, depth: 22, height: 8, color: RENDER });
  add('arch', [-24.45, 0, 7], [0.4, 3.7, 2.2], STONE);
  add('arch', [-24.7, 0.05, 7], [0.34, 3.15, 1.65], DARK);

  // Walled orchard north of the ranges, as the plan draws beds and trees
  // beyond the cloister. The grid and the cypresses are a sketch.
  const yard = { x0: 6.5, x1: 28, z0: -20, z1: 18, h: 3.3 };
  add('box', [(yard.x0 + yard.x1) / 2, 0, yard.z0], [yard.x1 - yard.x0, yard.h, 0.7], RENDER);
  add('box', [(yard.x0 + yard.x1) / 2, 0, yard.z1], [yard.x1 - yard.x0, yard.h, 0.7], RENDER);
  add('box', [yard.x1, 0, (yard.z0 + yard.z1) / 2], [0.7, yard.h, yard.z1 - yard.z0], RENDER);
  add('box', [yard.x0, 0, (yard.z0 + -2) / 2], [0.7, yard.h, -2 - yard.z0], RENDER);
  add('box', [yard.x0, 0, (4 + yard.z1) / 2], [0.7, yard.h, yard.z1 - 4], RENDER);
  add('arch', [yard.x0 - 0.1, 0, 1], [0.45, 2.8, 2.1], DARK);
  for (const x of [10, 17, 24]) {
    for (const z of [-13, -5, 8]) {
      add('box', [x, 0, z], [5.5, 0.22, 5], SOIL);
      add('box', [x, 0, z], [0.28, 1.3, 0.28], DARK);
      add('ball', [x, 1.4, z], [2.4, 2.1, 2.4], LEAF);
    }
  }
  for (const x of [8, 16, 24]) add('pyramid', [x, 0, 15], [1.3, 6.2, 1.3], CYPRESS);
}
