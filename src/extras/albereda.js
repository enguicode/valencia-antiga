// The Albereda (the Prat de València) and the Pla del Real, around 1700.
// Opened in 1677 as the way up from the sea to the Palau del Real, and a
// public walk by 1692, when the Fàbrica de Murs i Valls planted it again and
// set stone balls and benches on the oval plaza in front of the palace. It
// runs along the north bank from just downstream of the Pont del Real to just
// short of the Pont de la Mar. On this scene that is about 800 m; the 825 m
// comes from the 1714 replanting, which still ended at that bridge. Four rows of white poplars (Populus alba)
// make two carriage salons and a narrower central walk, the double salon of
// the later descriptions. Fortea's engraving of 1738 draws those four rows;
// a museum note says the planting of 1677 was three, so the fourth row is
// the less certain one. The 15 m carriageways are the measure of the 1714
// replanting; the gaps here (14 m and 12 m) are an estimate for the earlier
// walk, and so is the 12 m spacing along the rows. The guard towers, the
// Ermita de la Soledad (1714) and the column of 1716 are left out. The Llano
// is beaten earth, not a paving anyone drew.

const PALACE = { x: 725.9, z: 128.2, tx: 0.699249, tz: 0.714878 };

// River centreline in scene metres, every 50 m, from just below the Pont del
// Real to just above the Pont de la Mar. Sampled on the same curve as the
// water, so the rows stay on the bank where it bends.
const CENTRE = [
  [626.53, 335.14], [656.81, 374.93], [685.43, 415.96], [713.27, 457.51],
  [740.06, 499.72], [765.89, 542.55], [791.79, 585.33], [818.33, 627.71],
  [845.08, 669.96], [872.01, 712.1], [899.13, 754.12], [926.54, 795.95],
  [953.96, 837.76], [981.23, 879.68], [1009.03, 921.25], [1036.28, 963.17],
  [1061.38, 1006.51],
];

// Metres north of the centreline (negative lateral). Outer gap 14 m, central
// walk 12 m, outer gap 14 m again.
const ROWS = [-88, -102, -114, -128];
const WALK = -108; // middle of the central walk
const ALONG = 12;

const LLANO = { x: -6, z: 70, along: 46, deep: 34 }; // palace frame: +X downstream, +Z toward the river

function trace(spacing) {
  const cum = [0];
  for (let i = 1; i < CENTRE.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(CENTRE[i][0] - CENTRE[i - 1][0], CENTRE[i][1] - CENTRE[i - 1][1]));
  }
  const total = cum.at(-1);
  const out = [];
  const push = (d) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const span = cum[i] - cum[i - 1] || 1;
    const t = (d - cum[i - 1]) / span;
    const x = CENTRE[i - 1][0] + (CENTRE[i][0] - CENTRE[i - 1][0]) * t;
    const z = CENTRE[i - 1][1] + (CENTRE[i][1] - CENTRE[i - 1][1]) * t;
    out.push({ x, z, tx: (CENTRE[i][0] - CENTRE[i - 1][0]) / span, tz: (CENTRE[i][1] - CENTRE[i - 1][1]) / span });
  };
  for (let d = 0; d < total - spacing * 0.35; d += spacing) push(d);
  push(total);
  return out;
}

// A point `lateral` metres off the centreline. Negative is the north bank.
function bank(point, lateral) {
  return [point.x - point.tz * lateral, point.z + point.tx * lateral];
}

function palaceWorld(lx, lz) {
  const rx = -PALACE.tz;
  const rz = PALACE.tx;
  return [PALACE.x + PALACE.tx * lx + rx * lz, PALACE.z + PALACE.tz * lx + rz * lz];
}

const stations = trace(ALONG);
const mid = stations[Math.floor(stations.length / 2)];
const [originX, originZ] = bank(mid, WALK);

// Radius 34, not 15: the four rows span 40 m and the filler orchard would
// otherwise stand in the salons. The extra circles keep the open Llano, the
// ground between it and the parapet, and the bridge approach free of orchard.
const clearings = trace(32).map((point) => {
  const [x, z] = bank(point, WALK);
  return { x, z, radius: 34 };
});
for (const [lx, lz, radius] of [[LLANO.x, LLANO.z, 58], [0, 118, 38], [32, 105, 32], [-28, 98, 30]]) {
  const [x, z] = palaceWorld(lx, lz);
  clearings.push({ x, z, radius });
}

export const landmark = {
  id: 'albereda',
  name: 'Albereda i Pla del Real',
  kind: 'albereda',
  x: originX,
  z: originZ,
  axis: [mid.tx, mid.tz],
  length: 30,
  width: 22,
  clearings,
};

export function build(add, landmark, kit) {
  const { STONE, PALE, SOIL, LEAF } = kit.colors;
  const [ax, az] = landmark.axis;
  const rx = -az;
  const rz = ax;
  const toLocal = (x, z) => {
    const dx = x - landmark.x;
    const dz = z - landmark.z;
    return [dx * ax + dz * az, dx * rx + dz * rz];
  };
  const yawOf = (tx, tz) => kit.yawTowards(tx * ax + tz * az, tx * rx + tz * rz);
  const put = (solid, x, y, z, scale, color, yaw = 0) => {
    const [lx, lz] = toLocal(x, z);
    add(solid, [lx, y, lz], scale, color, yaw);
  };

  // Beaten-earth oval in front of the facade, balls and benches on its rim.
  const [padX, padZ] = palaceWorld(LLANO.x, LLANO.z);
  // Inscribed in the ball ellipse, so the corners do not stick out past the ring.
  put('box', padX, 0, padZ, [LLANO.along * 1.35, 0.16, LLANO.deep * 1.35], SOIL, yawOf(PALACE.tx, PALACE.tz));
  const balls = 22;
  for (let i = 0; i < balls; i++) {
    const angle = (i / balls) * Math.PI * 2;
    const lx = LLANO.x + Math.cos(angle) * LLANO.along;
    const lz = LLANO.z + Math.sin(angle) * LLANO.deep;
    const [x, z] = palaceWorld(lx, lz);
    put('box', x, 0, z, [1.05, 0.55, 1.05], STONE);
    put('ball', x, 0.55, z, [0.9, 0.9, 0.9], STONE);
  }
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI * (i + 0.5) / 8;
    const lx = LLANO.x + Math.cos(angle) * LLANO.along * 0.72;
    const lz = LLANO.z + Math.sin(angle) * LLANO.deep * 0.72;
    const [x, z] = palaceWorld(lx, lz);
    const dlx = -LLANO.along * Math.sin(angle);
    const dlz = LLANO.deep * Math.cos(angle);
    const tx = PALACE.tx * dlx + -PALACE.tz * dlz;
    const tz = PALACE.tz * dlx + PALACE.tx * dlz;
    put('box', x, 0, z, [2.6, 0.48, 0.62], STONE, yawOf(tx, tz));
  }

  // White poplars: a pale trunk and an upright oval crown. A cone read as a
  // tiled roof; the ball is the crown the planting actually had.
  stations.forEach((point, i) => {
    ROWS.forEach((lateral, row) => {
      const [x, z] = bank(point, lateral);
      const tall = (i + row) % 3 === 0;
      const trunk = tall ? 6.4 : 5.2;
      const crownH = tall ? 8.4 : 7.0;
      const crownW = tall ? 5.8 : 4.8;
      put('box', x, 0, z, [0.5, trunk, 0.5], PALE);
      put('ball', x, trunk * 0.4, z, [crownW, crownH, crownW], LEAF);
    });
    if (i % 11 === 5) {
      const [x, z] = bank(point, WALK + 1.8);
      put('box', x, 0, z, [2.4, 0.46, 0.58], STONE, yawOf(point.tx, point.tz));
    }
  });

  // Two stone balls where the rows begin: the formal mouth of 1692, without
  // the column that came in 1716.
  for (const lateral of [-84, -132]) {
    const [x, z] = bank({ ...stations[0], x: stations[0].x - stations[0].tx * 7, z: stations[0].z - stations[0].tz * 7 }, lateral);
    put('box', x, 0, z, [1.1, 0.55, 1.1], STONE);
    put('ball', x, 0.55, z, [0.8, 0.8, 0.8], STONE);
  }
}
