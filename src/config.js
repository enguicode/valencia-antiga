// Scene axes follow the map: x grows to the east, z to the south, in metres
// from the Torres dels Serrans. The river flows roughly west to east, so the
// city sits on its right-hand bank.

export const RIVER = {
  width: 108,
  margin: 2.5, // how close the boat may get to a bank
  sampleSpacing: 5,
  // Navigable water before the first historic bridge: far enough upstream to
  // pass the corner where the wall leaves the river.
  upstreamRun: 550,
  downstreamRun: 450, // and after the last one, with room for the mist to close in well clear of it
};

export const BANK = {
  slopeRun: 8,
  height: 4, // street level above the water
  extent: 1100,
};

export const WALL = {
  height: 10, // about what the sources give for the curtain
  thickness: 2.6,
};

export const FOG = { near: 150, far: 800 };

export const COLORS = {
  skyTop: 0x5f97d2,
  horizon: 0xf0e2c6,
  water: 0x3f746e,
  grass: 0x86a052, // huerta only; the city floor and the banks use earth
  earth: 0xc49878, // beaten-earth tint; the earth map is darker than the masonry
  stone: 0xf6c05a, // honey limestone tint; the masonry map brings it to a mid gold
  stonePale: 0xffd9a0, // lighter honey for mouldings and dressings
  tapial: 0xee9a40, // ochre rammed earth, redder and darker than the ashlar
  brick: 0xe07048,
  limewash: 0xe8d2a6, // warm plaster, duller than the house fronts
  glaze: 0x4a96e8, // cobalt of the glazed tile domes
  stoneDark: 0x3a2f24,
  foliage: 0x4f7a3a,
  trunk: 0x6b4f33,
  wood: 0x7a5230,
  sail: 0xf3e9d2,
  houseWalls: [0xe9dcc0, 0xd9c7a0, 0xf2ead8, 0xcbb38a],
  roofs: [0xb5653f, 0xa85a3a, 0xc27448],
};

// Small deterministic PRNG so the scenery is identical on every load.
export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rotation about Y that turns local +X towards the given horizontal direction.
export function yawTowards(dirX, dirZ) {
  return Math.atan2(-dirZ, dirX);
}
