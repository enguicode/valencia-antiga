import * as THREE from 'three';
import { FOG, COLORS } from './config.js';

// Time of day. A handful of keyframes drive the sky, the fog, both lights and
// the tint of the water; everything in between is interpolated.

const CYCLE_SECONDS = 480; // a full day when left on automatic

// hour, sky top, horizon and fog, sun colour, sun strength, ambient strength, fog reach, night (0-1)
const KEYS = [
  [0, 0x0b1026, 0x1a2140, 0x9fb4e6, 0.7, 0.6, 600, 1],
  [5, 0x1c2550, 0x3a3558, 0x9fb4e6, 0.6, 0.6, 480, 1],
  [6.6, 0x5b78b8, 0xf2b98a, 0xffc79a, 1.2, 0.8, 420, 0.1],
  [9, 0x5f97d2, 0xdfe6ea, 0xfff4e0, 1.9, 1.2, 760, 0],
  [13, 0x4f8fd8, 0xe6eef2, 0xffffff, 2.1, 1.3, FOG.far, 0],
  [18, 0x5f97d2, 0xf0e2c6, 0xfff1d6, 1.9, 1.2, FOG.far, 0],
  [20, 0x4a5f9f, 0xf0a070, 0xff9d5c, 1.1, 0.7, 700, 0.1],
  [21.5, 0x1c2550, 0x4a3a5a, 0x9fb4e6, 0.6, 0.6, 600, 1],
  [24, 0x0b1026, 0x1a2140, 0x9fb4e6, 0.7, 0.6, 600, 1],
].map(([hour, top, horizon, sun, sunStrength, ambient, reach, night]) => ({
  hour,
  top: new THREE.Color(top),
  horizon: new THREE.Color(horizon),
  sun: new THREE.Color(sun),
  sunStrength,
  ambient,
  reach,
  night,
}));

const MODES = [
  { label: 'Auto', hour: null },
  { label: 'Alba', hour: 6.6 },
  { label: 'Mediodía', hour: 13 },
  { label: 'Ocaso', hour: 20 },
  { label: 'Noche', hour: 23.5 },
];

const lerp = THREE.MathUtils.lerp;

export function createAtmosphere(scene, { skyMaterial, stars, sun, hemisphere }, waterMaterial, button, refreshEnvironment) {
  const state = { hour: 18, mode: 0, night: 0, light: 1, fogScale: 1, sunDirection: new THREE.Vector3(0, 1, 0) };
  let environmentHour = null;
  const waterBase = new THREE.Color(COLORS.water);

  const label = () => {
    const mode = MODES[state.mode];
    if (mode.hour !== null) return mode.label;
    const hours = Math.floor(state.hour);
    const minutes = Math.floor((state.hour % 1) * 6) * 10;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };
  let shown = '';

  button.addEventListener('click', () => {
    state.mode = (state.mode + 1) % MODES.length;
    if (MODES[state.mode].hour !== null) state.hour = MODES[state.mode].hour;
  });

  function update(dt) {
    if (MODES[state.mode].hour === null) state.hour = (state.hour + (dt * 24) / CYCLE_SECONDS) % 24;

    const next = KEYS.findIndex((key) => key.hour > state.hour);
    const a = KEYS[next - 1];
    const b = KEYS[next];
    const t = (state.hour - a.hour) / (b.hour - a.hour);

    skyMaterial.uniforms.topColor.value.lerpColors(a.top, b.top, t);
    skyMaterial.uniforms.horizonColor.value.lerpColors(a.horizon, b.horizon, t);
    scene.fog.color.copy(skyMaterial.uniforms.horizonColor.value);
    scene.fog.far = lerp(a.reach, b.reach, t) * state.fogScale;
    scene.fog.near = scene.fog.far * 0.18;

    sun.color.lerpColors(a.sun, b.sun, t);
    sun.intensity = lerp(a.sunStrength, b.sunStrength, t);
    // Half of the ambient light now comes from the sky's environment map.
    const ambient = lerp(a.ambient, b.ambient, t);
    hemisphere.intensity = ambient * 0.5;
    scene.environmentIntensity = 0.75;
    state.night = lerp(a.night, b.night, t);
    state.light = ambient / 1.3;
    stars.material.opacity = state.night * 0.9;

    // The sun rises in the east, crosses the south and sets in the west, a
    // little to the north at both ends as it does in summer. At night the
    // same light stands in for the moon.
    const arc = ((state.hour - 6) / 14) * Math.PI;
    if (state.hour >= 6 && state.hour <= 20) {
      state.sunDirection.set(Math.cos(arc), Math.max(0.12, Math.sin(arc)), 0.5 * Math.sin(arc) - 0.35);
    } else {
      state.sunDirection.set(-0.4, 0.8, -0.3);
    }
    state.sunDirection.normalize();

    waterMaterial.color.copy(waterBase).multiplyScalar(THREE.MathUtils.clamp(state.light, 0.4, 1));

    // The environment map is what the water and everything else reflects. It
    // is re-rendered from the sky only when the hour has moved on a little.
    const drift = Math.abs(state.hour - (environmentHour ?? state.hour));
    if (environmentHour === null || Math.min(drift, 24 - drift) > 0.2) {
      environmentHour = state.hour;
      refreshEnvironment();
    }

    const text = `Hora: ${label()}`;
    if (text !== shown) {
      shown = text;
      button.textContent = text;
    }
  }

  return { state, update };
}
