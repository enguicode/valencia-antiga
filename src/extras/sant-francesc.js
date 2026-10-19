// Convent de Sant Francesc, intramuros in 1704, where the plaça de l'Ajuntament
// is now. Donation of 1239 outside the Boatella gate; the Gothic church is of
// 1351 (some accounts say 1366); two cloisters and the chapter house were
// asked for in 1376. The side portico, the Àngels chapel (Pérez Castiel) and
// the Bon Pastor chapel are late 17th century. Demolished in 1891.
//
// Plan read off the Fortea engraving of Tosca (1738) and the MuVIM model made
// from it, and set on the traced court just west of this spot: nave about
// 62 × 16 m with the door to the north, two cloisters west of it, the entry
// garden north, the orchard south-east. The written account has the church as
// the short side of one cloister rectangle; the court and the engraving put
// the nave beside the two courts, and that is what is built here. Tower about
// 49 m to the cross, court sizes, the forecourt wall and the blue glaze on
// the chapel domes are guessed. The tower cupola stays stone.

export const landmark = {
  id: 'sant-francesc',
  name: 'Convent de Sant Francesc',
  kind: 'sant-francesc',
  x: -42,
  z: 1068,
  axis: [0.12, 0.993], // +X to the south, about 7° east of south; +Z to the west
  length: 140, // garden to orchard, along the axis
  width: 90, // Àngels chapel to the chapter house
  clearings: [
    { x: -42.0, z: 1068.0, radius: 38 }, // church, portico, tower
    { x: -38.3, z: 1098.8, radius: 12 }, // apse
    { x: -23.7, z: 1027.5, radius: 12 }, // Àngels, local (−38, −23)
    { x: -18.2, z: 1098.4, radius: 12 }, // Conception, local (33, −20)
    { x: -76.0, z: 1053.0, radius: 26 }, // north cloister
    { x: -71.5, z: 1090.7, radius: 26 }, // south cloister
    { x: -95.9, z: 1055.4, radius: 12 }, // chapter house
    { x: -93.0, z: 1104.4, radius: 12 }, // Bon Pastor
    { x: -42.4, z: 1114.4, radius: 14 }, // Obra Nova
    { x: -49.1, z: 1017.5, radius: 25 }, // entry garden
    { x: -28.2, z: 1131.8, radius: 26 }, // orchard
  ],
};

export function build(add, landmark, kit) {
  const { STONE, PALE, ROOF, TILE_BLUE, DARK, RENDER, SOIL, LEAF, CYPRESS } = kit.colors;
  const { archRow, cloister, ringOfOpenings, RIDGE_ALONG_X, FACING_Z } = kit;

  const half = 31;
  const bay = 7.6;
  const flank = 11.6;

  // One nave, chapels between the buttresses, polygonal apse to the south.
  add('box', [0, 0, 0], [62, 17, 16], PALE);
  add('gable', [0, 17, 0], [16, 4.6, 62], ROOF, RIDGE_ALONG_X);
  add('oct', [half, 0, 0], [16, 17, 16], PALE);
  add('cone', [half, 17, 0], [16.6, 4.6, 16.6], ROOF);

  const front = -half - 0.15;
  add('pointed', [front, 0, 0], [0.5, 8, 4], DARK);
  add('disk', [front - 0.08, 10.6, 0], [0.3, 4.4, 4.4], DARK);
  add('wheel', [front - 0.22, 10.6, 0], [0.3, 4.4, 4.4], STONE);

  for (const side of [-1, 1]) {
    add('box', [0, 0, side * 9.8], [62, 9.5, 3.6], PALE);
    add('gable', [0, 9.5, side * 8], [7.8, 2.4, 62], ROOF, RIDGE_ALONG_X);
    // East door onto the portico (round); west door toward the cloisters (pointed).
    const doorX = side < 0 ? -3.2 : 12;
    add(side < 0 ? 'arch' : 'pointed', [doorX, 0, side * (flank + 0.3)], [0.42, 5.2, 2.8], DARK, FACING_Z);
    for (let x = -half + 1.2; x <= half - 0.8; x += bay) {
      const z = side * (flank - 0.3);
      add('box', [x, 0, z], [1.25, 14, 1.65], STONE);
      add('pyramid', [x, 14, z], [1.25, 1.9, 1.65], PALE);
      add('box', [x, 11.4, side * 9.4], [0.9, 2.4, 2.6], STONE);
      const win = x + bay / 2;
      if (win > half - 1.4 || Math.abs(win - doorX) < 2.6) continue;
      add('pointed', [win, 12.1, side * 8.15], [0.36, 4, 1.45], DARK, FACING_Z);
      add('box', [win, 3.4, side * (flank + 0.2)], [0.32, 2.3, 0.9], DARK, FACING_Z);
    }
  }

  // Belfry at the north-east corner: square shaft, a rectangular bell stage
  // with a pair of openings, a narrower lantern, a stone cupola and a cross.
  const tx = -27;
  const tz = -17;
  add('box', [tx, 0, tz], [7.2, 30, 7.2], STONE);
  add('box', [tx, 15, tz], [7.7, 0.4, 7.7], PALE);
  add('box', [tx, 30, tz], [7.9, 0.7, 7.9], PALE);
  add('box', [tx, 30.7, tz], [6.4, 8.3, 5.4], STONE);
  for (const s of [-1, 1]) {
    for (const o of [-1.15, 1.15]) add('box', [tx + s * 3.36, 32.8, tz + o], [0.4, 4.2, 1.4], DARK);
    add('box', [tx, 32.8, tz + s * 2.86], [1.5, 4.2, 0.4], DARK);
  }
  add('box', [tx, 39, tz], [4.6, 0.55, 4.6], PALE);
  add('box', [tx, 39.55, tz], [4, 4.4, 4], PALE);
  ringOfOpenings(add, { x: tx, y: 40.4, z: tz, sides: 4, apothem: 2.12, width: 1.15, height: 2.5 });
  add('box', [tx, 43.95, tz], [4.5, 0.45, 4.5], STONE);
  add('dome', [tx, 44.4, tz], [3.8, 3.6, 3.8], PALE);
  add('ball', [tx, 46.1, tz], [0.65, 0.7, 0.65], STONE);
  add('box', [tx, 46.7, tz], [0.16, 2.3, 0.16], STONE);
  add('box', [tx, 48.2, tz], [1.05, 0.16, 0.16], STONE);

  // Capella de la Mare de Déu dels Àngels, at the north end of the portico.
  // The dome is documented; the blue glaze is not.
  const ax = -38;
  const az = -23;
  add('box', [ax, 0, az], [11, 14, 11], PALE);
  add('pointed', [ax - 5.75, 1.2, az - 2.6], [0.4, 6.2, 1.8], DARK);
  add('pointed', [ax - 5.75, 1.2, az + 2.6], [0.4, 6.2, 1.8], DARK);
  add('disk', [ax - 5.7, 8.2, az], [0.28, 3.4, 3.4], DARK);
  add('wheel', [ax - 5.9, 8.2, az], [0.28, 3.4, 3.4], STONE);
  add('pointed', [ax, 1.4, az - 5.75], [0.4, 5.6, 1.7], DARK, FACING_Z);
  add('oct', [ax, 14, az], [9.2, 4.6, 9.2], PALE);
  ringOfOpenings(add, { x: ax, y: 15.2, z: az, sides: 8, apothem: 4.5, width: 1.15, height: 2.4 });
  add('dome', [ax, 18.6, az], [8.6, 8.6, 8.6], TILE_BLUE);
  add('ball', [ax, 22.7, az], [1.1, 1.7, 1.1], PALE);

  // Round-arched portico along the east flank, and the low wall with a round
  // door that the 1840 view puts in front of it. Where the wall stops is guessed.
  const porticoZ = -16.2;
  for (let x = -18; x <= 24.01; x += 4.2) add('box', [x, 0, porticoZ], [0.75, 5.5, 0.75], STONE);
  archRow(add, 'arch', { from: -15.9, to: 21.9, step: 4.2, y: 0, z: porticoZ, width: 3.0, height: 5.0, depth: 0.45 });
  add('box', [3, 5.45, porticoZ], [43, 0.4, 4.2], ROOF);
  add('box', [-11.15, 0, -20.6], [13.7, 3.3, 0.7], RENDER);
  add('box', [10.95, 0, -20.6], [26.1, 3.3, 0.7], RENDER);
  add('arch', [-3.2, 0, -20.6], [0.5, 3.3, 2.0], DARK, FACING_Z);

  // Conception, or communion, chapel: a dome is documented, the blue glaze is not.
  const hx = 33;
  const hz = -20;
  add('box', [hx, 0, hz], [10, 12, 10], PALE);
  add('oct', [hx, 12, hz], [8.2, 3.4, 8.2], PALE);
  add('dome', [hx, 15.4, hz], [7.6, 7.6, 7.6], TILE_BLUE);
  add('ball', [hx, 19, hz], [0.9, 1.4, 0.9], PALE);
  add('pointed', [hx, 1.2, hz - 5.2], [0.4, 5.4, 1.8], DARK, FACING_Z);

  // Two Gothic cloisters, two storeys, west of the nave. Four beds in each
  // court, as the plan draws them. Sizes are the traced court's, not a survey.
  cloister(add, { x: -19, z: 32, width: 34, depth: 30, height: 10, color: RENDER });
  cloister(add, { x: 19, z: 32, width: 34, depth: 30, height: 10, color: RENDER });
  for (const cx of [-19, 19]) {
    const from = cx - 14;
    const to = cx + 14;
    for (const z of [16.8, 47.2]) {
      for (let x = from; x <= to + 0.01; x += 4.6) {
        if (cx > 0 && z < 32 && x > 15 && x < 29) continue; // the sacristy sits here
        for (const y of [1.6, 6.2]) add('box', [x, y, z], [0.35, 1.85, 1.1], DARK, FACING_Z);
      }
    }
    for (const dx of [-4.2, 4.2]) {
      for (const dz of [-3.4, 3.4]) {
        add('box', [cx + dx, 0, 32 + dz], [5.6, 0.22, 4.6], SOIL);
        add('pyramid', [cx + dx, 0, 32 + dz], [1.3, 5.5, 1.3], CYPRESS);
      }
    }
  }

  // Sacristy between the nave and the south cloister, where the third door was.
  add('box', [22, 0, 14.4], [11, 8, 3.6], PALE);
  add('gable', [22, 8, 14.4], [3.6, 2.2, 11], ROOF, RIDGE_ALONG_X);
  add('pointed', [22, 0, 12.4], [0.4, 4.4, 1.8], DARK, FACING_Z);

  // Chapter house, Gothic, off the west side of the north cloister.
  add('box', [-19, 0, 52], [16, 10, 7], PALE);
  add('gable', [-19, 10, 52], [7, 3.2, 16], ROOF, RIDGE_ALONG_X);
  for (const x of [-24, -19, -14]) add('pointed', [x, 1.4, 55.7], [0.4, 5.4, 1.5], DARK, FACING_Z);

  // Bon Pastor, late 17th century, off the south-west corner. No dome: none is recorded.
  add('box', [30, 0, 55], [12, 9, 10], PALE);
  add('gable', [30, 9, 55], [10, 3, 12], ROOF, RIDGE_ALONG_X);
  add('pointed', [36.25, 0, 55], [0.42, 5, 2.1], DARK);
  add('pointed', [30, 1.5, 60.2], [0.4, 4.2, 1.5], DARK, FACING_Z);

  // Obra Nova, the cells between the cloisters and the orchard. A plain range.
  add('box', [46, 0, 6], [10, 9, 18], RENDER);
  add('gable', [46, 9, 6], [10, 3, 18], ROOF);
  for (let z = -1; z <= 13.01; z += 3.6) {
    for (const y of [1.5, 5.3]) add('box', [51.25, y, z], [0.35, 1.7, 1.1], DARK);
  }

  // Walled entry garden: cypresses and a stone cross, then the church door.
  // The precinct wall stood until 1806; only this garden and the orchard are walled here.
  add('box', [-51, 0, -16], [26, 3.4, 0.75], RENDER);
  add('box', [-51, 0, 18], [26, 3.4, 0.75], RENDER);
  add('box', [-64, 0, 1], [0.75, 3.4, 34], RENDER);
  add('box', [-38, 0, -8.65], [0.75, 3.4, 14.7], RENDER);
  add('box', [-38, 0, 9.65], [0.75, 3.4, 16.7], RENDER);
  add('arch', [-37.7, 0, 0], [0.55, 3.35, 2], DARK);
  for (const [x, z] of [[-60, -12], [-60, 14], [-42, -12], [-42, 14], [-56, 6], [-45, -6]]) {
    add('pyramid', [x, 0, z], [1.5, 7, 1.5], CYPRESS);
  }
  for (const [x, z] of [[-52, -7], [-48, 10]]) {
    add('box', [x, 0, z], [0.35, 1.7, 0.35], DARK);
    add('ball', [x, 1.7, z], [3.6, 3.2, 3.6], LEAF);
  }
  add('box', [-50, 0, 3], [0.5, 5.2, 0.5], STONE);
  add('box', [-50, 3.7, 3], [0.45, 0.45, 2.6], STONE);

  // Orchard south-east of the apse, in square beds. The great huerta ran on
  // behind the house; this is the part that still reads as the convent's own.
  add('box', [65, 0, -26], [22, 3.4, 0.75], RENDER);
  add('box', [65, 0, 14], [22, 3.4, 0.75], RENDER);
  add('box', [76, 0, -6], [0.75, 3.4, 40], RENDER);
  add('box', [54, 0, -12.825], [0.75, 3.4, 26.35], RENDER);
  add('box', [54, 0, 8.325], [0.75, 3.4, 11.35], RENDER);
  add('arch', [53.7, 0, 1.5], [0.55, 3.35, 2], DARK);
  for (const x of [61, 69]) {
    for (const z of [-16, -6, 4]) {
      add('box', [x, 0, z], [6.2, 0.22, 5.4], SOIL);
      add('ball', [x, 0.3, z], [2.8, 2.6, 2.8], LEAF);
    }
  }
  for (const [x, z] of [[57, -22], [72, -22], [57, 10], [72, 10]]) add('pyramid', [x, 0, z], [1.4, 6, 1.4], CYPRESS);

  // The two domed chapels joined to the church, not standing apart: a low
  // body from each to the nave's chapels. The links are guessed.
  add('box', [-33, 0, -14.5], [6, 10, 6.5], PALE);
  add('gable', [-33, 10, -14.5], [6.5, 2.2, 6], ROOF, RIDGE_ALONG_X);
  add('box', [hx, 0, -13.3], [10, 9, 4.2], PALE);
  add('gable', [hx, 9, -13.3], [4.2, 1.8, 10], ROOF, RIDGE_ALONG_X);

  // The precinct wall (it stood until 1806) closes the house from the entry
  // garden to the orchard, so the convent reads as one walled block. Its line
  // follows the gardens already walled above; the long sides are guessed.
  const PRECINCT = { from: -64, to: 76, east: -30, west: 62, height: 3.6 };
  const length = PRECINCT.to - PRECINCT.from;
  const middle = (PRECINCT.from + PRECINCT.to) / 2;
  add('box', [middle, 0, PRECINCT.east], [length, PRECINCT.height, 0.8], RENDER);
  add('box', [middle, 0, PRECINCT.west], [length, PRECINCT.height, 0.8], RENDER);
  add('box', [PRECINCT.from, 0, (PRECINCT.east - 16) / 2], [0.8, PRECINCT.height, PRECINCT.east + 16 > 0 ? 0.1 : -PRECINCT.east - 16], RENDER);
  add('box', [PRECINCT.from, 0, (18 + PRECINCT.west) / 2], [0.8, PRECINCT.height, PRECINCT.west - 18], RENDER);
  add('box', [PRECINCT.to, 0, (14 + PRECINCT.west) / 2], [0.8, PRECINCT.height, PRECINCT.west - 14], RENDER);
  add('box', [PRECINCT.to, 0, (PRECINCT.east - 26) / 2], [0.8, PRECINCT.height, Math.max(0.1, -26 - PRECINCT.east)], RENDER);
  // Kitchen garden and fruit trees in the walled ground the buildings leave free.
  for (const [x0, x1, z0, z1] of [[-60, -40, 22, 58], [42, 72, 20, 58], [-28, 26, -28, -22]]) {
    for (let x = x0 + 3; x <= x1 - 3; x += 7) {
      for (let z = z0 + 3; z <= z1 - 3; z += 7) {
        add('box', [x, 0, z], [5.6, 0.2, 5.6], SOIL);
        if ((x + z) % 2 === 0 || z1 - z0 > 10) add('ball', [x, 0.3, z], [2.4, 2.3, 2.4], LEAF);
      }
    }
  }
}
