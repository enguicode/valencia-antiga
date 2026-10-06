// Graphics quality. On automatic it starts from a guess based on the device
// and steps down when the frame rate stays low; it never steps back up on its
// own, so it cannot flicker between two levels.

const LEVELS = {
  high: { label: 'alta', pixelRatio: 2, fogScale: 1, extras: true },
  medium: { label: 'media', pixelRatio: 1.5, fogScale: 0.85, extras: true },
  low: { label: 'baja', pixelRatio: 1, fogScale: 0.65, extras: false },
};
const ORDER = ['high', 'medium', 'low'];
const STORAGE_KEY = 'valencia-antiga.quality';
const WINDOW_SECONDS = 2;
const SLOW_FPS = 38;

function guessLevel() {
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = navigator.deviceMemory ?? 8;
  return cores <= 4 || memory <= 4 ? 'medium' : 'high';
}

function readChoice() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored in LEVELS ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

export function createQuality(select, apply) {
  let choice = readChoice();
  let level = choice === 'auto' ? guessLevel() : choice;
  let frames = 0;
  let elapsed = -WINDOW_SECONDS; // let the first seconds settle
  let slowWindows = 0;

  select.value = choice;
  apply(LEVELS[level]);

  select.addEventListener('change', () => {
    choice = select.value;
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Private browsing: the choice simply lasts for this visit.
    }
    level = choice === 'auto' ? guessLevel() : choice;
    slowWindows = 0;
    apply(LEVELS[level]);
  });

  function update(dt) {
    if (choice !== 'auto' || level === 'low') return;
    elapsed += dt;
    if (elapsed < 0) return;
    frames++;
    if (elapsed < WINDOW_SECONDS) return;
    slowWindows = frames / elapsed < SLOW_FPS ? slowWindows + 1 : 0;
    frames = 0;
    elapsed = 0;
    if (slowWindows >= 2) {
      level = ORDER[ORDER.indexOf(level) + 1];
      slowWindows = 0;
      apply(LEVELS[level]);
    }
  }

  return {
    update,
    describe: () => `calidad ${LEVELS[level].label}${choice === 'auto' ? ' (auto)' : ''}`,
  };
}
