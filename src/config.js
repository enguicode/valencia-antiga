// World layout. The river runs along +Z; the city sits on the -X bank,
// which is on the right-hand side when travelling downstream.

export const RIVER = {
  length: 600, // navigable stretch, in metres
  width: 56,
  overrun: 450, // scenery beyond both ends, hidden by fog
  margin: 2.5, // how close the boat may get to a bank
};

export const BANK = {
  slopeRun: 8,
  height: 2.5,
  extent: 260,
};

export const WALL = {
  setback: 16, // distance from the river edge to the wall axis
  height: 9,
  thickness: 3,
  towerSpacing: 75,
};

export const CITY_SIDE = -1;

export const COLORS = {
  skyTop: 0x5f97d2,
  horizon: 0xf0e2c6,
  water: 0x5a9a96,
  grass: 0x86a052,
  stone: 0xcdb78d,
  stoneDark: 0x3a2f24,
  foliage: 0x4f7a3a,
  trunk: 0x6b4f33,
  wood: 0x7a5230,
  sail: 0xf3e9d2,
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
