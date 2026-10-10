import * as THREE from 'three';
import { FOG, COLORS } from './config.js';
import { t, onLanguageChange } from './i18n.js';

// Time of day. A handful of keyframes drive the sky, the fog, both lights and
// the tint of the water; everything in between is interpolated. The hour
// does not advance on its own: the visitor picks it in the settings.

const MIST_REACH = 24; // metres that can be seen in the thick of the mist
const SETTLE_RATE = 0.9; // how quickly the light moves to a newly chosen hour

// hour, sky top, horizon and fog, sun colour, sun strength, ambient strength, fog reach, night (0-1)
const KEYS = [
  [0, 0x0b1026, 0x1a2140, 0x9fb4e6, 0.7, 0.6, 600, 1],
  [5, 0x1c2550, 0x3a3558, 0x9fb4e6, 0.6, 0.6, 480, 1],
  [6.6, 0x5b78b8, 0xf2b98a, 0xffc79a, 1.2, 0.8, 420, 0.1],
  [9, 0x5f97d2, 0xdfe6ea, 0xfff4e0, 1.9, 1.2, 760, 0],
  [13, 0x5f97d2, 0xf0e2c6, 0xfff1d6, 1.9, 1.2, FOG.far, 0], // same warm light as 18: a white sun and a cold horizon washed stone and ground to one grey
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

// The round button beside the sticks steps through the same four hours as
// the cover and the settings, in clock order. Morning and the old afternoon
// folded into midday; the sunset hour stays, under the name of afternoon.
const HOURS = [
  { value: '6.6', id: 'dawn' },
  { value: '13', id: 'noon' },
  { value: '20', id: 'afternoon' },
  { value: '23.5', id: 'night' },
];
const ICONS = {
  dawn: '<path d="M3 19h18M8 19a4 4 0 0 1 8 0M12 4v6M9.5 6.5 12 4l2.5 2.5"/>',
  noon: '<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  afternoon: '<path d="M3 19h18M8 19a4 4 0 0 1 8 0M12 4v6M9.5 7.5 12 10l2.5-2.5"/>',
  night: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5zM17.5 4v2.4M16.3 5.2h2.4"/>',
};
const momentIndex = (value) => {
  const index = HOURS.findIndex((item) => item.value === value);
  return index === -1 ? 0 : index;
};

const lerp = THREE.MathUtils.lerp;

// Each visit starts at the moment of day it is on the visitor's own clock.
// Dawn is 5:30–7:30, afternoon 19:00–21:00, night 21:00–5:30, and the rest
// midday. From there on it only changes by hand.
function clockHour() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour >= 21 || hour < 5.5) return '23.5';
  if (hour < 7.5) return '6.6';
  if (hour >= 19) return '20';
  return '13';
}

export function createAtmosphere(scene, { skyMaterial, stars, moon, sun, hemisphere }, waterMaterial, select, button, refreshEnvironment) {
  select.value = clockHour();
  const state = {
    hour: Number(select.value),
    night: 0,
    light: 1,
    fogScale: 1,
    mist: 0, // 0 in clear air, 1 inside the bank of mist at the end of the river
    sunDirection: new THREE.Vector3(0, 1, 0),
  };
  let chosenHour = state.hour;
  let environmentHour = null;
  // A borrowed night covers its gap on the wall clock, not on frame time:
  // a slow frame must not stretch the dusk.
  let easeFrom = null;
  let easeStart = 0;
  let easeSeconds = 0;
  const waterBase = new THREE.Color(COLORS.water);

  const showMoment = () => {
    const moment = HOURS[momentIndex(select.value)];
    const label = t(`hour.${moment.id}.next`);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[moment.id]}</svg><span class="label">${t(`hour.${moment.id}`)}</span>`;
    button.setAttribute('aria-label', label);
    button.title = label;
  };
  showMoment();
  onLanguageChange(showMoment);

  // One press moves on to the next hour: dawn, midday, afternoon, night.
  button.addEventListener('click', () => {
    const next = HOURS[(momentIndex(select.value) + 1) % HOURS.length];
    select.value = next.value;
    select.dispatchEvent(new Event('change'));
  });

  select.addEventListener('change', () => {
    chosenHour = Number(select.value);
    showMoment();
  });

  // Cover the change of hour in about `seconds`, so a borrowed night can
  // fall and lift instead of blinking. Starts from whatever light is showing.
  function easeOver(seconds) {
    easeFrom = state.hour;
    easeStart = performance.now();
    easeSeconds = Math.max(seconds, 0.05);
  }

  function cancelEase() {
    easeFrom = null;
  }

  function update(dt) {
    // Ease towards the chosen hour the short way round the clock, so a change
    // in the settings is a brief dusk or dawn rather than a jump.
    if (easeFrom !== null) {
      const gap0 = ((chosenHour - easeFrom + 36) % 24) - 12;
      const u = Math.min(1, (performance.now() - easeStart) / (easeSeconds * 1000));
      state.hour = u >= 1 ? chosenHour : (easeFrom + gap0 * u + 24) % 24;
      if (u >= 1) easeFrom = null;
    } else {
      const gap = ((chosenHour - state.hour + 36) % 24) - 12;
      // At least two hours a second, so the last stretch does not drag.
      const step = Math.sign(gap) * Math.min(Math.abs(gap), Math.max(Math.abs(gap) * SETTLE_RATE, 2) * dt);
      state.hour = Math.abs(gap) < 0.01 ? chosenHour : (state.hour + step + 24) % 24;
    }

    const next = KEYS.findIndex((key) => key.hour > state.hour);
    const a = KEYS[next - 1];
    const b = KEYS[next];
    const t = (state.hour - a.hour) / (b.hour - a.hour);

    skyMaterial.uniforms.topColor.value.lerpColors(a.top, b.top, t);
    skyMaterial.uniforms.horizonColor.value.lerpColors(a.horizon, b.horizon, t);
    scene.fog.color.copy(skyMaterial.uniforms.horizonColor.value);
    const reach = lerp(a.reach, b.reach, t) * state.fogScale;
    scene.fog.far = lerp(reach, MIST_REACH, state.mist);
    scene.fog.near = lerp(reach * 0.18, 0.5, state.mist);

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
    moon.userData.glow.material.opacity = state.night;

    // The sun rises in the east, crosses the south and sets in the west, a
    // little to the north at both ends as it does in summer. At night the
    // same light stands in for the moon.
    // Midday borrows the six o'clock sun. Overhead, it left every front that
    // faces the river in shade, and stone and ground went the same grey.
    const sunHour = state.hour <= 13 ? lerp(6, 18, (state.hour - 6) / 7) : lerp(18, 20, (state.hour - 13) / 7);
    const arc = ((sunHour - 6) / 14) * Math.PI;
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

    // The paper panels track the same night as the sky, or they glare.
    document.documentElement.style.setProperty('--night', state.night.toFixed(3));
  }

  update(0);
  return { state, update, easeOver, cancelEase };
}
