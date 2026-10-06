// Ambient sound, synthesised in the browser: running water and, every so
// often, a bell. It starts switched off and only creates the audio
// context when asked, as browsers require.

const BELL_EVERY_SECONDS = 90;
const BELL_PARTIALS = [
  [0.5, 0.5, 4.5],
  [1, 1, 3.5],
  [1.19, 0.6, 2.8],
  [1.5, 0.35, 2.2],
  [2, 0.45, 1.8],
  [2.74, 0.2, 1.2],
];

export function createSound(button) {
  let context = null;
  let master = null;
  let waterGain = null;
  let enabled = false;
  let sinceBell = BELL_EVERY_SECONDS - 12; // the first one comes soon after switching on

  function build() {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    // Water: looped noise through two filters, a low rumble and a brighter lap.
    const seconds = 3;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
      data[i] = last * 6;
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const rumble = context.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.value = 420;
    const lap = context.createBiquadFilter();
    lap.type = 'bandpass';
    lap.frequency.value = 1400;
    lap.Q.value = 0.7;
    const lapGain = context.createGain();
    lapGain.gain.value = 0.25;
    const swell = context.createOscillator();
    swell.frequency.value = 0.23;
    const swellDepth = context.createGain();
    swellDepth.gain.value = 0.15;
    swell.connect(swellDepth).connect(lapGain.gain);

    waterGain = context.createGain();
    waterGain.gain.value = 0.5;
    noise.connect(rumble).connect(waterGain);
    noise.connect(lap).connect(lapGain).connect(waterGain);
    waterGain.connect(master);
    noise.start();
    swell.start();
  }

  function strike(at) {
    const fundamental = 196;
    for (const [ratio, level, decay] of BELL_PARTIALS) {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = fundamental * ratio;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(level * 0.09, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      oscillator.connect(gain).connect(master);
      oscillator.start(at);
      oscillator.stop(at + decay + 0.1);
    }
  }

  function ring(strokes) {
    for (let i = 0; i < strokes; i++) strike(context.currentTime + 0.1 + i * 1.7);
  }

  button.addEventListener('click', () => {
    enabled = !enabled;
    if (enabled && !context) build();
    if (enabled) context.resume();
    master.gain.setTargetAtTime(enabled ? 1 : 0, context.currentTime, 0.3);
    button.textContent = enabled ? 'Sonido: sí' : 'Sonido: no';
    button.classList.toggle('active', enabled);
  });

  document.addEventListener('visibilitychange', () => {
    if (!context || !enabled) return;
    if (document.hidden) context.suspend();
    else context.resume();
  });

  function update(dt, boatSpeed) {
    if (enabled) {
      waterGain.gain.setTargetAtTime(0.4 + Math.min(Math.abs(boatSpeed), 9) * 0.07, context.currentTime, 0.5);
      sinceBell += dt;
      if (sinceBell >= BELL_EVERY_SECONDS) {
        sinceBell = 0;
        ring(3);
      }
    }
  }

  return {
    update,
    get enabled() {
      return enabled;
    },
  };
}
