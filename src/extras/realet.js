// El Realet: the small royal house Teresa Gil de Vidaure built in the later
// 13th century, north of the river, for her sons Jaume de Xèrica and Pere
// d'Ayerbe when they were in the city. It still stood in 1700, beside the
// Cistercian monastery of the Saïdia and facing the Pont de Sant Josep, and
// it came down in 1809 with the Palau del Real so it could not be used as a
// gun platform (es.wikipedia.org/wiki/El_Realet). No plan or view of it
// survives. Tosca's sheet of 1704 and the 1738 engraving only label this
// ground "Llano de la Zaidía" and draw a walled orchard west of the bridge
// road, with no palace. What follows is a guess at a Gothic alcázar smaller
// than the Palau: a river range, a court, four stone towers and a wall. The
// south-west tower is the tall one, the atalaya nearest the bridge. Lengths
// are estimates (about 50 × 40 m; the tall tower 21 m). +Z looks at the river.

export const landmark = {
  id: 'realet',
  name: 'El Realet',
  kind: 'realet',
  x: -332,
  z: -441,
  axis: [0.996, -0.09],
  length: 50,
  width: 42,
  // The default circle leaves a tree against the river door. A second one
  // clears the ground between the door and the parapet.
  clearings: [
    { x: -332, z: -441, radius: 36 },
    { x: -330.2, z: -421, radius: 18 },
  ],
};

export function build(add, landmark, kit) {
  const { STONE, PALE, ROOF, DARK, RENDER, SOIL, CYPRESS, LEAF } = kit.colors;
  const { archRow, ringOfOpenings, RIDGE_ALONG_X, FACING_Z } = kit;

  const merlons = (x, z, half, y) => {
    for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0]]) {
      add('box', [x + dx * (half - 0.45), y, z + dz * (half - 0.45)], [0.85, 1.1, 0.85], STONE);
    }
  };

  // River range: limewashed hall on a stone plinth, tiled roof, the door
  // towards the bridge road.
  const hallZ = 12.6;
  add('box', [0, 0, hallZ], [32, 11, 10.4], PALE);
  add('box', [0, 0, hallZ], [32.6, 1.5, 11], STONE);
  add('gable', [0, 11, hallZ], [11, 3.6, 32.6], ROOF, RIDGE_ALONG_X);
  add('box', [0, 10.7, hallZ + 5.25], [32.2, 0.45, 0.7], STONE);
  add('box', [0, 5.15, hallZ + 5.28], [32.2, 0.32, 0.55], STONE);
  const front = hallZ + 5.35;
  add('pointed', [0, 0, front], [0.45, 6.4, 3.3], STONE, FACING_Z);
  add('pointed', [0, 0, front + 0.15], [0.4, 5.5, 2.5], DARK, FACING_Z);
  for (const x of [-11.5, -7, -2.6, 2.6, 7, 11.5]) {
    add('pointed', [x, 6.15, front], [0.38, 3.5, 1.45], DARK, FACING_Z);
  }
  for (const x of [-10, -5.2, 5.2, 10]) add('box', [x, 1.5, front], [0.32, 2.5, 1.15], DARK, FACING_Z);

  // Court side of the hall: a ground arcade and a row of windows over it.
  const courtFace = hallZ - 5.3;
  archRow(add, 'pointed', { from: -12, to: 12, step: 4, y: 0.2, z: courtFace, width: 2.3, height: 4.6, depth: 0.4 });
  for (let x = -12; x <= 12.01; x += 4) add('box', [x, 6.3, courtFace], [0.32, 2.3, 1.15], DARK, -FACING_Z);

  // The atalaya nearest the bridge, and three lower corner towers, all in
  // stone and finished with merlons. No spires: those of the Palau are later.
  const towers = [[-19.2, 14.6, 7.4, 21], [19.2, 14.6, 7.4, 15], [-19.2, -11.5, 6.6, 13], [19.2, -11.5, 6.6, 13]];
  for (const [x, z, size, tall] of towers) {
    add('box', [x, 0, z], [size, tall, size], STONE);
    add('box', [x, tall, z], [size + 0.7, 0.55, size + 0.7], STONE);
    merlons(x, z, size / 2 + 0.35, tall + 0.55);
    ringOfOpenings(add, { x, y: tall - 4.2, z, sides: 4, apothem: size / 2 + 0.05, width: 1.15, height: 2.5 });
  }
  // A second, lower slit on each face of the atalaya.
  ringOfOpenings(add, { x: -19.2, y: 8.5, z: 14.6, sides: 4, apothem: 3.75, width: 0.7, height: 1.8 });

  // Side wings and the north range, round the court. One storey, pointed
  // arches towards the court.
  for (const side of [-1, 1]) {
    add('box', [side * 19.2, 0, 0.3], [7, 7.4, 21.6], RENDER);
    add('gable', [side * 19.2, 7.4, 0.3], [7.4, 2.3, 22], ROOF);
    for (let z = -6; z <= 7.5; z += 3.4) {
      add('pointed', [side * 15.6, 0.3, z], [0.38, 4.2, 2], DARK);
      add('box', [side * 22.75, 4.2, z], [0.32, 1.7, 1], DARK);
    }
  }
  add('box', [0, 0, -11.5], [32.6, 7.2, 7], RENDER);
  add('gable', [0, 7.2, -11.5], [7.4, 2.2, 33], ROOF, RIDGE_ALONG_X);
  archRow(add, 'pointed', { from: -10, to: 10, step: 4, y: 0.3, z: -7.9, width: 2.1, height: 4.2 });
  for (let x = -10; x <= 10.01; x += 5) add('box', [x, 3.5, -15.05], [0.32, 1.8, 1.05], DARK, FACING_Z);

  // Enclosure wall on the three sides that are not the river range, with the
  // gate away from the river, towards the plain. A short garden inside it:
  // the great orchard Tosca draws lies west of the road and is not this yard.
  add('box', [0, 0, -19.2], [46.6, 3.3, 0.8], RENDER);
  add('box', [0, 3.3, -19.2], [47, 0.35, 1.05], STONE);
  for (const side of [-1, 1]) {
    add('box', [side * 22.9, 0, -4], [0.8, 3.3, 30.4], RENDER);
    add('box', [side * 22.9, 3.3, -4], [1.05, 0.35, 30.8], STONE);
  }
  add('pointed', [0, 0, -19.55], [0.4, 2.9, 2.4], DARK, -FACING_Z);
  for (const x of [-8, 0, 8]) {
    add('box', [x, 0, -17.3], [6.5, 0.2, 2.4], SOIL);
    add('pyramid', [x + 2.2, 0, -17.3], [1.3, 5.5, 1.3], CYPRESS);
  }
  add('box', [-8, 0, -17.3], [0.28, 1.3, 0.28], DARK);
  add('ball', [-8, 2.2, -17.3], [2.4, 2.1, 2.4], LEAF);
}
