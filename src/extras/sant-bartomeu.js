// Església de Sant Bartomeu, a parish of 1239, one of the ten founded after
// the conquest. The church that stood around 1700 is the rebuild of
// 1666-1683: one nave, three chapels a side between the buttresses, a
// crossing under a tiled dome with a lantern, and a wider sanctuary. The
// plan on record is trapezoidal and irregular; the extra width of the head
// stands in for that and is not a measured bay. Three doors: the main one
// at the feet, to the north, and one on each flank. The square tower is at
// the north-east corner, on the street.
//
// The shaft is the medieval ashlar one, set plumb again by Joan Baptista
// Pérez Castiel from 1684. The brick bell stage — one round arch a side
// between paired pilasters, a balustrade and a pinnacle on each corner —
// is the late-17th-century Valencian type (Sant Joan del Mercat, the
// Carme). The two-storey cupulín was contracted in 1703 and paid for in
// 1704, so it is left off. The cement panels on the upper third of the
// shaft today are early 20th century and are not drawn: the shaft reads
// as stone all the way up.
//
// 42 m long and 20 m across the chapels. The tower is 7.2 m square and
// 32 m to the pinnacle tips. Those metres are estimated: no measured plan
// has been found, only the published scheme of the lost church (three
// chapels, the tower in one corner of the feet) and the massing of
// photographs taken before 1936. The blue glaze of the dome is the same
// convention as the other domes in the scene, not a colour on record for
// 1700.

export const landmark = {
  id: 'sant-bartomeu',
  name: 'Església de Sant Bartomeu',
  kind: 'sant-bartomeu',
  // North-east corner of the Tosca block west of the street that leaves
  // Serrans. The OSM point of the surviving tower falls in that street:
  // the scene sits tens of metres off the modern map. +X runs from the
  // door (north) to the sanctuary (south), along the street front.
  x: -120.5,
  z: 236,
  axis: [-0.23, 0.973],
  length: 42,
  width: 20,
};

export function build(add, _landmark, kit) {
  const { STONE, PALE, ROOF, TILE_BLUE, DARK, BRICK } = kit.colors;
  const { RIDGE_ALONG_X, FACING_Z } = kit;

  const LEN = 42;
  const NAVE_W = 12;
  const CHAPEL = { depth: 4, height: 9.2, from: -16, to: 6 };
  const NAVE_H = 15;
  const feet = -LEN / 2;
  const chapelLen = CHAPEL.to - CHAPEL.from;
  const chapelMid = (CHAPEL.from + CHAPEL.to) / 2;
  const flank = NAVE_W / 2 + CHAPEL.depth;

  // Nave, from the feet back to where the sanctuary widens.
  const naveLen = 30;
  const naveMid = feet + naveLen / 2;
  add('box', [naveMid, 0, 0], [naveLen, NAVE_H, NAVE_W], PALE);
  add('gable', [naveMid, NAVE_H, 0], [NAVE_W + 0.4, 4.4, naveLen + 0.4], ROOF, RIDGE_ALONG_X);

  // Sanctuary, wider than the nave. The published plan is trapezoidal;
  // this extra width stands in for that, and is not a measured bay.
  // A hip roof, lower than the nave.
  const headLen = 15;
  const headMid = LEN / 2 - headLen / 2;
  const headW = 18;
  add('box', [headMid, 0, 0], [headLen, 12.5, headW], PALE);
  add('pyramid', [headMid, 12.5, 0], [headLen + 0.5, 3.4, headW + 0.5], ROOF);

  for (const side of [-1, 1]) {
    const z = side * (NAVE_W / 2 + CHAPEL.depth / 2);
    add('box', [chapelMid, 0, z], [chapelLen, CHAPEL.height, CHAPEL.depth], PALE);
    // Half of the gable is buried in the nave; the half that shows is the lean-to.
    add('gable', [chapelMid, CHAPEL.height, side * NAVE_W / 2], [CHAPEL.depth * 2 + 0.5, 2.5, chapelLen + 0.3], ROOF, RIDGE_ALONG_X);
    // Three chapels: a buttress on each pier, a low window between them,
    // and a lunette in the clerestory.
    for (let i = 0; i <= 3; i++) {
      const x = CHAPEL.from + (i * chapelLen) / 3;
      add('box', [x, 0, side * (flank - 0.35)], [1.15, 12.2, 1.35], STONE);
    }
    for (let i = 0; i < 3; i++) {
      const x = CHAPEL.from + ((i + 0.5) * chapelLen) / 3;
      add('arch', [x, 1.4, side * (flank + 0.06)], [0.35, 3.6, 1.7], DARK, FACING_Z);
      add('arch', [x, 10.6, side * (NAVE_W / 2 + 0.08)], [0.36, 3.5, 1.8], DARK, FACING_Z);
    }
  }

  // Crossing, where the nave meets the sanctuary. Drum, tiled dome, lantern.
  const cross = 7;
  const drum = 8.4;
  add('oct', [cross, NAVE_H + 0.4, 0], [drum, 4.2, drum], PALE);
  add('oct', [cross, NAVE_H + 4.6, 0], [drum + 0.7, 0.45, drum + 0.7], STONE);
  add('dome', [cross, NAVE_H + 5, 0], [drum, drum, drum], TILE_BLUE);
  add('oct', [cross, NAVE_H + 9.1, 0], [2.1, 2.4, 2.1], PALE);
  add('cone', [cross, NAVE_H + 11.5, 0], [2.3, 1.5, 2.3], TILE_BLUE);
  add('ball', [cross, NAVE_H + 13, 0], [0.7, 0.7, 0.7], STONE);
  // Apothem of the octagon, so the arches sit in the faces and not on the corners.
  kit.around(add, { x: cross, sides: 8, radius: (drum / 2) * Math.cos(Math.PI / 8) - 0.05, y: NAVE_H + 1.3, solid: 'arch', height: 2.4, width: 1.15, depth: 0.35, color: DARK });

  // Feet, to the north. The tower takes the east corner, so the door sits
  // west of centre on the wall that is left.
  const face = feet - 0.08;
  add('arch', [face, 0, 1.4], [0.55, 6.6, 3.5], STONE, Math.PI);
  add('arch', [face - 0.16, 0.15, 1.4], [0.4, 5.6, 2.6], DARK, Math.PI);
  // One door on each flank, as the 1666 church had.
  add('arch', [chapelMid, 0, -(flank + 0.08)], [0.4, 5.2, 2.5], STONE, FACING_Z);
  add('arch', [chapelMid, 0.1, -(flank + 0.22)], [0.36, 4.4, 1.9], DARK, FACING_Z);
  add('arch', [chapelMid, 0, flank + 0.08], [0.4, 5.2, 2.5], STONE, -FACING_Z);
  add('arch', [chapelMid, 0.1, flank + 0.22], [0.36, 4.4, 1.9], DARK, -FACING_Z);

  // A window in the sanctuary's south wall and one on each side of the head.
  add('arch', [LEN / 2 + 0.08, 6.2, 0], [0.35, 3.4, 1.6], DARK);
  for (const side of [-1, 1]) {
    add('arch', [headMid, 6.4, side * (headW / 2 + 0.06)], [0.34, 3.2, 1.5], DARK, side === -1 ? FACING_Z : -FACING_Z);
  }

  // Bell tower. Outer faces stand a little proud of the church corner.
  const tower = 7.2;
  const tx = feet + tower / 2 - 0.25;
  const tz = -flank + tower / 2 - 0.25;
  const shaft = 22;
  add('box', [tx, 0, tz], [tower, shaft, tower], STONE);
  add('box', [tx, shaft * 0.66, tz], [tower + 0.55, 0.45, tower + 0.55], STONE);
  add('box', [tx, shaft, tz], [tower + 0.9, 0.7, tower + 0.9], STONE);
  const bell = 6.4;
  const bellH = 6.2;
  add('box', [tx, shaft + 0.7, tz], [bell, bellH, bell], BRICK);
  add('box', [tx, shaft + 0.7 + bellH, tz], [tower + 0.5, 0.55, tower + 0.55], STONE);
  // One arch a side, stone pilasters standing in for the paired Doric order.
  const opening = (px, pz, yaw) => {
    add('arch', [px, shaft + 1.7, pz], [0.4, 4.2, 2.3], DARK, yaw);
    const ux = Math.cos(yaw);
    const uz = -Math.sin(yaw);
    // Across the face: perpendicular to the outward normal (ux, uz) in the ground plane.
    for (const s of [-1, 1]) {
      add('box', [px + uz * s * 1.55, shaft + 0.85, pz + ux * s * 1.55], [0.45, bellH - 0.3, 0.45], STONE, yaw);
    }
  };
  const half = bell / 2 + 0.08;
  opening(tx + half, tz, 0);
  opening(tx - half, tz, Math.PI);
  opening(tx, tz + half, -FACING_Z);
  opening(tx, tz - half, FACING_Z);
  // Balustrade and a pinnacle on each corner. No cupulín: that is 1703-1704.
  // The rail's long axis is local Z; yaw turns it along the face, not out of it.
  const rail = shaft + 0.7 + bellH + 0.55;
  const railSpan = tower - 1.6;
  for (const [dx, dz, yaw] of [[0, 1, FACING_Z], [0, -1, FACING_Z], [1, 0, 0], [-1, 0, 0]]) {
    add('box', [tx + dx * (tower / 2 - 0.2), rail, tz + dz * (tower / 2 - 0.2)], [0.32, 0.9, railSpan], STONE, yaw);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = tx + sx * (tower / 2 - 0.15);
      const pz = tz + sz * (tower / 2 - 0.15);
      add('box', [px, rail, pz], [0.7, 1.15, 0.7], STONE);
      add('pyramid', [px, rail + 1.15, pz], [0.85, 2.5, 0.85], STONE);
    }
  }
}
