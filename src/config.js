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
  height: 6.25, // street level above the water, half-way up to the bridge decks: a gentle ramp, and the city still shows from a boat
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
  grass: 0x86a052,
  stone: 0xcdb78d,
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
