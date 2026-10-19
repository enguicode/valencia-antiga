// Casa de les Armes and the old customs house, in front of the Portal de la Mar,
// as Tosca drew them in 1704. The Bourbon bastion of 1707 is not here.
//
// Entering from the river, the arms house is on the right and the customs
// house on the left, with a closed square between them and a second portal,
// the one with the image of the Virgin of the Bona Guia, before the city gate
// (Wikipedia, Ciudadela de Valencia). The arms house had stood there long
// before the 1574 rebuilding; the Fàbrica de Murs i Valls restored it in 1643.
// Des Essarts (17th c.) gives two halls of 80 by 20 paces: taken as a French
// pace of 0.65 m that is about 52 by 13 m. The hall here is 40 by 11.5 m so it
// stays on the straight curtain north of the gate (the wall bends at the next
// vertex) and off the wall. The round tower at the north end is the one on the
// 1738 engraving of Tosca's plan: 13 m across and 14 m to the parapet, the size
// already read off that plate. The customs house, the square and the outer
// portal are documented; their measurements and the plain fronts are estimated.
// The arrow-headed outwork is left out: it would run into the river, and the
// brief keeps the 1707 bastions out.
//
// Gate-local metres below: +X runs north along the curtain from the gate
// vertex, +Z points out of the city. The landmark origin is the court.

export const landmark = {
  id: 'casa-armes',
  name: 'Casa de les Armes i duana vella',
  kind: 'casa-armes',
  x: 785.9,
  z: 779.8,
  axis: [-0.2015, -0.9795],
  length: 46,
  width: 38,
  clearings: [
    { x: 785.9, z: 779.8, radius: 32 }, // court, halls and the round tower
    { x: 824.7, z: 817.3, radius: 16 }, // the closed square
    { x: 817.5, z: 825.9, radius: 14 }, // customs house
    { x: 826.0, z: 808.4, radius: 12 }, // outer ward of the arms house
    { x: 832.4, z: 821.0, radius: 14 }, // portal of the Bona Guia, on the track
  ],
};

export function build(add, _landmark, kit) {
  const { STONE, PALE, ROOF, DARK, ALABASTER, RENDER } = kit.colors;
  const { windowRow, archRow, ringOfOpenings, around, RIDGE_ALONG_X } = kit;

  // Shift from the gate vertex to the court centre, where the landmark sits.
  const OX = 33;
  const OZ = -16.7;
  const addG = (solid, [x, y, z], scale, color, yaw = 0) => add(solid, [x - OX, y, z - OZ], scale, color, yaw);

  // The gate looks out along the bisector of the corner, not square to this curtain.
  const OUT = [-0.6311, 0.7758];
  const LEFT = [-0.7758, -0.6311]; // left of someone walking in
  const RIGHT = [0.7758, 0.6311];
  const fore = (t, s) => [OUT[0] * t + RIGHT[0] * s, OUT[1] * t + RIGHT[1] * s];
  const yawOut = Math.atan2(-OUT[1], OUT[0]); // box +X out along the approach
  const yawAcross = Math.atan2(-RIGHT[1], RIGHT[0]); // box +X across the approach
  const yawRidge = Math.atan2(OUT[0], OUT[1]); // gable ridge along the approach

  // A dark opening on a long wall of the forecourt. `s` is metres to the right
  // of the approach; the slab stands just proud of that line.
  const opening = (t, s, y, width, height, solid = 'box') => {
    const [x, z] = fore(t, s);
    if (solid === 'arch') addG('arch', [x, y, z], [0.42, height, width], DARK, yawAcross);
    else addG('box', [x, y, z], [0.32, height, width], DARK, yawAcross);
  };

  // --- Court, inside the wall and north of the gate (right as you enter) ---
  // West hall, the sala de armas. 40 m by 11.5 m, wall 10.5 m, ridge at 13.7.
  addG('box', [33, 0, -29.75], [40, 10.5, 11.5], STONE);
  addG('box', [33, 10.5, -29.75], [40.8, 0.4, 12.1], PALE);
  addG('gable', [33, 10.9, -29.75], [12.2, 3.2, 41], ROOF, RIDGE_ALONG_X);
  archRow(addG, 'arch', { from: 18, to: 48, step: 5, y: 0.1, z: -23.85, width: 2.2, height: 3.7 });
  windowRow(addG, { from: 17, to: 49, step: 4.6, y: 6.2, z: -23.85, width: 1.3, height: 2.5 });
  windowRow(addG, { from: 17, to: 49, step: 4.6, y: 2.2, z: -35.7, width: 1.15, height: 2.2 });
  windowRow(addG, { from: 17, to: 49, step: 4.6, y: 6.3, z: -35.7, width: 1.15, height: 2.3 });

  // East range, against the curtain but 2 m clear of its inner face. The upper
  // windows sit above the 10 m wall, which is what shows from the river.
  addG('box', [28, 0, -7.15], [32, 11.5, 6.7], STONE);
  addG('box', [28, 11.5, -7.15], [32.6, 0.35, 7.2], PALE);
  addG('gable', [28, 11.85, -7.15], [7.4, 2.5, 33], ROOF, RIDGE_ALONG_X);
  archRow(addG, 'arch', { from: 16, to: 40, step: 4.8, y: 0.1, z: -10.65, width: 2.1, height: 3.5 });
  windowRow(addG, { from: 16, to: 40, step: 4.8, y: 6.4, z: -10.65, width: 1.2, height: 2.3 });
  windowRow(addG, { from: 16, to: 40, step: 4, y: 10.2, z: -3.65, width: 1.15, height: 1.9 });

  // Closes the court. The south wall stops short of the gate tower.
  addG('box', [12, 0, -17.1], [5.2, 9.2, 13.2], STONE);
  addG('box', [46, 0, -17.4], [6, 9.2, 13], STONE);
  addG('arch', [14.75, 0.1, -17.1], [0.45, 4.2, 2.4], DARK);
  addG('arch', [9.25, 0.1, -17.1], [0.45, 4.2, 2.4], DARK, Math.PI);
  addG('box', [30, 0, -17.1], [28, 0.14, 12], PALE);

  // Round tower at the north end, octagonal because that is the round prism
  // the kit has. 13 m across, 14 m to the walk, merlons above. Clear of the wall.
  const TX = 49;
  const TZ = -8.6;
  addG('oct', [TX, 0, TZ], [13, 14, 13], STONE);
  addG('oct', [TX, 13.5, TZ], [14, 0.5, 14], PALE);
  around(addG, { x: TX, z: TZ, sides: 8, radius: 5.7, y: 14, solid: 'box', height: 1.15, width: 0.85, depth: 1.15, color: STONE });
  ringOfOpenings(addG, { x: TX, y: 8.4, z: TZ, sides: 8, apothem: 6.15, width: 1.15, height: 2.5 });
  ringOfOpenings(addG, { x: TX, y: 3.2, z: TZ, sides: 8, apothem: 6.15, width: 0.7, height: 1.6 });
  addG('arch', [TX, 0.1, TZ - 6.35], [0.45, 4, 2.2], DARK, kit.FACING_Z);

  // --- Forecourt, outside the gate. t is metres out along the approach,
  // s is metres to the right (the arms-house side). ---

  // Outer ward of the arms house: the right-hand wall of the square. A flat
  // terrace, not a bastion. 12 by 6.5 m, 9 m to the parapet.
  {
    const [x, z] = fore(15, 8.25);
    addG('box', [x, 0, z], [12, 9, 6.5], STONE, yawOut);
    addG('box', [x, 9, z], [12.6, 0.7, 7.1], PALE, yawOut);
    for (const t of [11, 14, 17, 19.2]) opening(t, 4.85, 0.15, 2.1, 3.6, 'arch');
    for (const t of [11.2, 15, 18.6]) opening(t, 4.85, 5.6, 1.2, 2.1);
    for (const t of [11.2, 15, 18.6]) opening(t, 11.65, 5.4, 1.15, 2);
    // Four guns on the terrace, a stand-in for the battery Gauna counted in 1599.
    for (const t of [11.5, 14, 16.5, 19]) {
      const [bx, bz] = fore(t, 9.4);
      addG('box', [bx, 9.7, bz], [2.3, 0.38, 0.38], DARK, yawAcross);
      addG('box', [bx, 9.35, bz], [0.9, 0.45, 0.7], PALE, yawAcross);
    }
  }

  // Old customs house, left as you enter. Limewashed over a stone ground
  // floor. 13 by 10.5 m. The size is estimated: no plan gives it.
  {
    const [x, z] = fore(15.5, -11.25);
    addG('box', [x, 0, z], [13, 4, 10.5], STONE, yawOut);
    addG('box', [x, 4, z], [13, 4.4, 10.5], RENDER, yawOut);
    addG('box', [x, 8.4, z], [13.6, 0.35, 11], PALE, yawOut);
    addG('gable', [x, 8.75, z], [11.2, 2.7, 13.8], ROOF, yawRidge);
    for (const t of [11.5, 15.5, 19.5]) opening(t, -5.85, 0.1, 2.3, 3.6, 'arch');
    for (const t of [12, 15.5, 19]) opening(t, -5.85, 5.1, 1.25, 2.2);
    for (const t of [12, 15.5, 19]) opening(t, -16.65, 5, 1.15, 2.1);
  }

  // Paved square between the two houses. The portal, further out, closes it.
  {
    const [x, z] = fore(18.2, -0.4);
    addG('box', [x, 0, z], [16, 0.14, 10.4], PALE, yawOut);
  }

  // Low wings from each house to the portal, just outside the 8.35 m track,
  // so the square reads as closed and the road has one way through.
  for (const s of [7.4, -7.4]) {
    const [x, z] = fore(23.6, s);
    addG('box', [x, 0, z], [6.4, 7.2, 1.4], STONE, yawOut);
  }

  // Outer portal on the beaten track from the Pont de la Mar, 26.5 m out
  // from the gate along that approach. 18 m across, 12.6 m to the parapet,
  // arch 5.4 m wide (height 1.67 times the width, so the head is a semicircle).
  // The image over it is a pale block: the kit has no statue.
  {
    const t = 26.5;
    const [x, z] = fore(t, 0);
    addG('box', [x, 0, z], [18, 12.6, 2.8], STONE, yawAcross);
    const proud = (amount, y) => [x + OUT[0] * amount, y, z + OUT[1] * amount];
    addG('arch', proud(1.55, 0.1), [0.55, 9, 5.4], DARK, yawOut);
    addG('arch', proud(-1.55, 0.1), [0.55, 9, 5.4], DARK, yawOut + Math.PI);
    addG('box', proud(1.6, 9.35), [2.2, 2.7, 0.45], STONE, yawOut);
    addG('box', proud(1.95, 9.6), [1.05, 2.15, 0.4], ALABASTER, yawOut);
    for (const side of [-3.6, 3.6]) {
      const [wx, wz] = fore(t, side);
      addG('box', [wx + OUT[0] * 1.55, 9.5, wz + OUT[1] * 1.55], [0.35, 2.1, 1.15], DARK, yawOut);
    }
    for (let s = -8; s <= 8.01; s += 2.3) {
      const [mx, mz] = fore(t, s);
      addG('box', [mx + OUT[0] * 1.2, 12.6, mz + OUT[1] * 1.2], [0.75, 1.1, 0.95], STONE, yawAcross);
    }
  }
}
