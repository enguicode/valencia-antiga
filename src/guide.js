// History cards: each point of interest sits at a station along the river and
// its card shows while the boat is within range of it.

const RANGE = 110;

export function createGuide(points, layout, path, card) {
  const title = card.querySelector('h2');
  const text = card.querySelector('p');
  const source = card.querySelector('a');

  const locate = ({ type, id, offset = 0 }) => {
    if (type === 'start') return path.start + offset;
    let x;
    let z;
    if (type === 'gate') {
      [x, z] = layout.wall[layout.gates.find((gate) => gate.id === id).vertex];
    } else {
      const list = type === 'bridge' ? layout.bridges : layout.landmarks;
      ({ x, z } = list.find((item) => item.id === id));
    }
    return path.project(x, z).s + offset;
  };

  const stations = points.map((point) => ({ ...point, s: locate(point.at) }));
  let current = null;

  function update(boatStation) {
    let nearest = null;
    for (const station of stations) {
      const distance = Math.abs(station.s - boatStation);
      if (distance <= RANGE && (!nearest || distance < Math.abs(nearest.s - boatStation))) nearest = station;
    }
    if (nearest === current) return;
    current = nearest;
    document.body.classList.toggle('has-card', Boolean(nearest));
    if (!nearest) return;
    title.textContent = nearest.title;
    text.textContent = nearest.text;
    source.href = nearest.source;
  }

  return { stations, update };
}

// Autopilot for the guided tour: holds a steady speed down the middle of the
// river until the end of the stretch.
export function createTour(path, button) {
  const CRUISE = 0.6; // throttle that settles at about 6 m/s
  const LOOK_AHEAD = 30;
  let active = false;

  const set = (value) => {
    active = value;
    const label = active ? 'Detener el recorrido guiado' : 'Recorrido guiado';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.classList.toggle('active', active);
  };
  button.addEventListener('click', () => set(!active));

  function drive(state) {
    if (state.s >= path.end - 2) {
      set(false);
      return { throttle: 0, steer: 0 };
    }
    const target = path.sampleAt(state.s + LOOK_AHEAD);
    const wanted = Math.atan2(target.x - state.x, target.z - state.z);
    const error = Math.atan2(Math.sin(wanted - state.heading), Math.cos(wanted - state.heading));
    return { throttle: CRUISE, steer: Math.max(-1, Math.min(1, -error * 2.5)) };
  }

  return {
    get active() {
      return active;
    },
    stop: () => set(false),
    drive,
  };
}
