import { RIVER, BANK, COLORS } from './config.js';
import { bridgeDecks } from './bridges.js';

// Small north-up plan. Inside the walled tour it is the city. Past the pale
// line at the end of that tour it becomes the river on to the beach, and
// sailing back brings the city sheet again. Drawn from the same layout as
// the scene, not from a historical map. It can be redrawn at another size,
// which is how it opens out when tapped.

const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;

// Same widening as the water mesh.
function waterHalf(path, s) {
  const cityHalf = RIVER.width / 2 + BANK.slopeRun;
  if (s < path.mouth - 600) return cityHalf;
  if (s < path.mouth) {
    const t = (s - (path.mouth - 600)) / 600;
    const smooth = t * t * (3 - 2 * t);
    return cityHalf + (480 - cityHalf) * smooth;
  }
  const span = Math.max(path.step, path.seaEnd - path.mouth);
  const u = Math.min(1, (s - path.mouth) / span);
  return 480 + (700 - 480) * u;
}

export function createMinimap(canvas, layout, path, guide) {
  const context = canvas.getContext('2d');
  const base = document.createElement('canvas');
  let ratio = 1;
  let px = (x) => x;
  let py = (z) => z;
  let detail = 1;
  let mode = 'city';

  function fit(xs, zs) {
    const minX = Math.min(...xs);
    const minZ = Math.min(...zs);
    const spanX = Math.max(...xs) - minX || 1;
    const spanZ = Math.max(...zs) - minZ || 1;
    const span = Math.max(spanX, spanZ);
    const size = canvas.clientWidth;
    const pad = 10;
    const scale = (size - pad * 2) / span;
    const offsetX = pad + (span - spanX) * scale * 0.5;
    const offsetY = pad + (span - spanZ) * scale * 0.5;
    px = (x) => (offsetX + (x - minX) * scale) * ratio;
    py = (z) => (offsetY + (z - minZ) * scale) * ratio;
    return scale;
  }

  // The same mark on both sheets, so the city plan ends where the other begins.
  function paintLimit(pen) {
    const at = path.pointAt(path.end);
    const half = waterHalf(path, path.end) + 150;
    pen.lineCap = 'round';
    pen.strokeStyle = 'rgba(90, 70, 48, 0.9)';
    pen.lineWidth = 2.4 * ratio;
    pen.beginPath();
    pen.moveTo(px(at.x - at.rx * half), py(at.z - at.rz * half));
    pen.lineTo(px(at.x + at.rx * half), py(at.z + at.rz * half));
    pen.stroke();
  }

  function ribbon(pen, samples, halfAt, color) {
    if (samples.length < 2) return;
    pen.beginPath();
    samples.forEach((sample, i) => {
      const reach = halfAt(sample.s);
      const x = sample.x + sample.rx * reach;
      const z = sample.z + sample.rz * reach;
      if (i) pen.lineTo(px(x), py(z));
      else pen.moveTo(px(x), py(z));
    });
    for (let i = samples.length - 1; i >= 0; i--) {
      const sample = samples[i];
      const reach = halfAt(sample.s);
      pen.lineTo(px(sample.x - sample.rx * reach), py(sample.z - sample.rz * reach));
    }
    pen.closePath();
    pen.fillStyle = color;
    pen.fill();
  }

  function paintCity(pen) {
    const navigable = path.samples.filter((sample) => sample.s >= path.start && sample.s <= path.end);
    const limit = path.pointAt(path.end);
    const reach = waterHalf(path, path.end) + 150;
    const xs = [
      ...layout.wall.map(([x]) => x),
      ...navigable.map((sample) => sample.x),
      limit.x - limit.rx * reach,
      limit.x + limit.rx * reach,
    ];
    const zs = [
      ...layout.wall.map(([, z]) => z),
      ...navigable.map((sample) => sample.z),
      limit.z - limit.rz * reach,
      limit.z + limit.rz * reach,
    ];
    const scale = fit(xs, zs);

    pen.strokeStyle = hex(COLORS.water);
    pen.lineWidth = Math.max(3, RIVER.width * scale) * ratio;
    pen.beginPath();
    path.citySamples.forEach((sample, i) => (i ? pen.lineTo(px(sample.x), py(sample.z)) : pen.moveTo(px(sample.x), py(sample.z))));
    pen.stroke();

    pen.beginPath();
    layout.wall.forEach(([x, z], i) => (i ? pen.lineTo(px(x), py(z)) : pen.moveTo(px(x), py(z))));
    pen.closePath();
    pen.fillStyle = 'rgba(181, 101, 63, 0.35)';
    pen.fill();
    pen.strokeStyle = '#6b5a3c';
    pen.lineWidth = 1.5 * ratio;
    pen.stroke();

    pen.strokeStyle = '#8c7a55';
    pen.lineWidth = 2.5 * detail * ratio;
    for (const deck of bridgeDecks(layout, path)) {
      const across = deck.half * 1.3; // drawn a little long, so it reads on the map
      pen.beginPath();
      pen.moveTo(px(deck.x - deck.rx * across), py(deck.z - deck.rz * across));
      pen.lineTo(px(deck.x + deck.rx * across), py(deck.z + deck.rz * across));
      pen.stroke();
    }
  }

  function paintSea(pen) {
    const samples = path.samples.filter((sample) => sample.s >= path.end - 90 && sample.s <= path.seaEnd + 1);
    const shore = samples.filter((sample) => sample.s >= path.mouth - 200);
    const xs = [];
    const zs = [];
    for (const sample of samples) {
      const reach = sample.s >= path.mouth - 200 ? waterHalf(path, sample.s) + 200 : waterHalf(path, sample.s) + 8;
      for (const side of [-1, 1]) {
        xs.push(sample.x + sample.rx * side * reach);
        zs.push(sample.z + sample.rz * side * reach);
      }
    }
    for (const marker of guide.markers) {
      if (marker.bonus !== 'sea') continue;
      xs.push(marker.x);
      zs.push(marker.z);
    }
    const limit = path.pointAt(path.end);
    const reach = waterHalf(path, path.end) + 150;
    xs.push(limit.x - limit.rx * reach, limit.x + limit.rx * reach);
    zs.push(limit.z - limit.rz * reach, limit.z + limit.rz * reach);
    fit(xs, zs);
    ribbon(pen, shore, (s) => waterHalf(path, s) + 200, '#d2b48c');
    ribbon(pen, samples, (s) => waterHalf(path, s), hex(COLORS.water));
  }

  function paint() {
    const pen = base.getContext('2d');
    pen.clearRect(0, 0, base.width, base.height);
    pen.lineJoin = 'round';
    pen.lineCap = 'round';
    if (mode === 'sea') paintSea(pen);
    else paintCity(pen);
  }

  function resize() {
    const size = canvas.clientWidth;
    ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = base.width = size * ratio;
    canvas.height = base.height = size * ratio;
    detail = Math.min(2.2, Math.max(1, size / 120));
    paint();
  }
  resize();

  function update(state, beyond = false) {
    const next = beyond ? 'sea' : 'city';
    if (next !== mode) {
      mode = next;
      paint();
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(base, 0, 0);
    for (const marker of guide.markers) {
      const past = path.project(marker.x, marker.z).s > path.end + 30;
      // Each sheet shows its own points: the tour, or the run to the beach.
      if (mode === 'city' ? past : marker.bonus !== 'sea') continue;
      context.beginPath();
      context.arc(px(marker.x), py(marker.z), 2.4 * detail * ratio, 0, Math.PI * 2);
      const pending = marker.bonus === 'night' ? '#e8c860' : '#f4e9d2';
      context.fillStyle = guide.found.has(marker.id) ? '#4a7a4e' : pending;
      context.fill();
      context.lineWidth = 0.8 * ratio;
      context.strokeStyle = '#2e2418';
      context.stroke();
    }
    // On the city sheet the boat stays at the line once the tour is behind it.
    const pinned = mode === 'city' && state.s > path.end ? path.pointAt(path.end) : state;
    context.save();
    context.translate(px(pinned.x), py(pinned.z));
    context.rotate(-state.heading + Math.PI);
    context.scale(detail, detail);
    context.beginPath();
    context.moveTo(0, -6 * ratio);
    context.lineTo(4 * ratio, 5 * ratio);
    context.lineTo(-4 * ratio, 5 * ratio);
    context.closePath();
    context.fillStyle = '#c0392b';
    context.strokeStyle = '#fff8e8';
    context.lineWidth = ratio;
    context.fill();
    context.stroke();
    context.restore();
    // On top of the boat, so the join stays visible when the mark sits on it.
    paintLimit(context);
  }

  return { update, resize };
}
