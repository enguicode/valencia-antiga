// Casa de les Roques, the hall that keeps the Corpus carts. The Consell
// agreed it on 8 June 1435, widened the plot on 5 May 1441 and finished the
// works in 1448, beside the Portal dels Serrans. What Tosca draws there, one
// block inside the wall, is a mass of about 24 × 13 m: the long front follows
// the 24 m side of the present parcel (cadastral 398 m²) and the cart door
// is on the northwest gable, towards the gate. Walls are limewashed, the
// nave is a plain tiled gable and the aisles have flat roofs, as the standing
// hall still shows. Heights are estimated from that facade: side walls 6 m,
// eaves 7.3 m, ridge 10.7 m, lintelled door about 4 × 6.8 m. The exposed
// timber truss, the scalloped parapet and the 18th-century Roteros annex are
// left out — the roof was rebuilt in 1812 and the annex is later. The small
// door on the long wall is invented.

export const landmark = {
  id: 'casa-roques',
  name: 'Casa de les Roques',
  kind: 'casa-roques',
  x: -66.4,
  z: 12.8,
  axis: [-0.803, -0.597],
  length: 24,
  width: 13,
};

export function build(add, landmark, kit) {
  const { STONE, ROOF, DARK, RENDER } = kit.colors;
  const { RIDGE_ALONG_X, FACING_Z, windowRow } = kit;
  const length = 24;
  const width = 13;
  const halfL = length / 2;
  const halfW = width / 2;
  const sideH = 6.0;
  const eaves = 7.3;
  const rise = 3.4;
  const naveW = 6.8;
  const aisle = (width - naveW) / 2;
  const face = halfL;

  add('box', [0, 0, 0], [length + 0.3, 0.4, width + 0.3], STONE);
  add('box', [0, 0, 0], [length, sideH, width], RENDER);
  // Band of nave wall between the aisle roofs and the eaves.
  add('box', [0, sideH, 0], [length, eaves - sideH, naveW], RENDER);
  for (const side of [-1, 1]) {
    add('box', [0, sideH, side * (naveW / 2 + aisle / 2)], [length + 0.45, 0.32, aisle + 0.4], ROOF);
    add('box', [0, sideH - 0.18, side * (halfW + 0.08)], [length + 0.15, 0.32, 0.26], STONE);
  }
  // Plain triangle. The king-post truss now visible in the gable belongs to the roof of 1812.
  add('gable', [0, eaves, 0], [naveW + 0.75, rise, length + 0.55], ROOF, RIDGE_ALONG_X);
  for (const end of [-1, 1]) {
    add('gable', [end * (face + 0.14), eaves, 0], [naveW + 0.1, rise * 0.97, 0.42], RENDER, RIDGE_ALONG_X);
  }

  // Lintelled cart door, two leaves under a fixed upper panel, on the gable towards Serrans.
  add('box', [face + 0.08, 0, -2.28], [0.36, 7.3, 0.42], STONE);
  add('box', [face + 0.08, 0, 2.28], [0.36, 7.3, 0.42], STONE);
  add('box', [face + 0.08, 6.8, 0], [0.4, 0.46, 4.98], STONE);
  add('box', [face + 0.26, 0, 0], [0.22, 4.35, 4.05], DARK);
  add('box', [face + 0.24, 4.35, 0], [0.28, 0.18, 4.22], STONE);
  add('box', [face + 0.26, 4.53, 0], [0.22, 2.24, 4.05], DARK);

  // Estimated side door for the chaplain who lived in the house.
  add('box', [face - 4.2, 0, -halfW - 0.1], [0.28, 2.45, 1.2], DARK, FACING_Z);
  add('box', [face - 4.2, 2.45, -halfW - 0.08], [0.32, 0.22, 1.65], STONE, FACING_Z);

  for (const z of [halfW + 0.08, -halfW - 0.08]) {
    windowRow(add, { from: -halfL + 3.2, to: halfL - 3.2, step: 4.4, y: 3.4, z, width: 0.85, height: 1.15 });
  }
  for (const z of [-4.6, 4.6]) add('box', [-face - 0.08, 3.45, z], [0.28, 1.1, 0.8], DARK);
}
