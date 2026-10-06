import * as THREE from 'three';
import { FOG, COLORS } from './config.js';
import { t, onLanguageChange } from './i18n.js';

// Time of day. A handful of keyframes drive the sky, the fog, both lights and
// the tint of the water; everything in between is interpolated. The hour
// does not advance on its own: the visitor picks it in the settings.

const SETTLE_RATE = 0.9; // how quickly the light moves to a newly chosen hour

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

// The sky button steps through these three; the settings offer the rest.
const QUICK_HOURS = [18, 20, 23.5];
const ICONS = {
  day: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  dusk: '<path d="M6.2 16a5.8 5.8 0 0 1 11.6 0M2.5 16h19M5 20h14M12 4.5v3M4.6 8.6l2.1 2.1M19.4 8.6l-2.1 2.1"/>',
  night: '<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z"/>',
};
const phaseOf = (hour) => (hour >= 21 || hour < 5.5 ? 'night' : hour >= 19 || hour < 7.5 ? 'dusk' : 'day');

const lerp = THREE.MathUtils.lerp;

// Each visit starts at the moment of day it is on the visitor's own clock:
// day, dusk or night. From there on it only changes by hand.
function clockHour() {
  const now = new Date();
  const phase = phaseOf(now.getHours() + now.getMinutes() / 60);
  return String(QUICK_HOURS[['day', 'dusk', 'night'].indexOf(phase)]);
}

export function createAtmosphere(scene, { skyMaterial, stars, moon, sun, hemisphere }, waterMaterial, select, button, refreshEnvironment) {
  select.value = clockHour();
  const state = {
    hour: Number(select.value),
    night: 0,
    light: 1,
    fogScale: 1,
    sunDirection: new THREE.Vector3(0, 1, 0),
  };
  let chosenHour = state.hour;
  let environmentHour = null;
  const waterBase = new THREE.Color(COLORS.water);

  const showPhase = () => {
    const phase = phaseOf(chosenHour);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[phase]}</svg><span class="label">${t(`sky.${phase}`)}</span>`;
    button.setAttribute('aria-label', t(`sky.${phase}.next`));
    button.title = t(`sky.${phase}.next`);
  };
  showPhase();
  onLanguageChange(showPhase);

  // One press moves on to the next of day, dusk and night.
  button.addEventListener('click', () => {
    const order = ['day', 'dusk', 'night'];
    const next = QUICK_HOURS[(order.indexOf(phaseOf(chosenHour)) + 1) % order.length];
    select.value = String(next);
    select.dispatchEvent(new Event('change'));
  });

  select.addEventListener('change', () => {
    chosenHour = Number(select.value);
    showPhase();
  });

  function update(dt) {
    // Ease towards the chosen hour the short way round the clock, so a change
    // in the settings is a brief dusk or dawn rather than a jump.
    const gap = ((chosenHour - state.hour + 36) % 24) - 12;
    // At least two hours a second, so the last stretch does not drag.
    const step = Math.sign(gap) * Math.min(Math.abs(gap), Math.max(Math.abs(gap) * SETTLE_RATE, 2) * dt);
    state.hour = Math.abs(gap) < 0.01 ? chosenHour : (state.hour + step + 24) % 24;

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
    moon.material.opacity = state.night;

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
    // is re-rendered from the sky a few times while the hour is changing and
    // once more when it settles.
    const drift = Math.abs(state.hour - (environmentHour ?? state.hour));
    const settled = state.hour === chosenHour && environmentHour !== state.hour;
    if (environmentHour === null || settled || Math.min(drift, 24 - drift) > 0.75) {
      environmentHour = state.hour;
      refreshEnvironment();
    }
  }

  return { state, update };
}
