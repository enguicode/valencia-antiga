import { RIVER, COLORS } from './config.js';

// Small north-up plan of the city with the boat's position. It is drawn from
// the same layout as the scene, not from a historical map. It can be redrawn
// at another size, which is how it opens out when tapped.

const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;

export function createMinimap(canvas, layout, path, guide) {
  const context = canvas.getContext('2d');
  const navigable = path.samples.filter((sample) => sample.s >= path.start && sample.s <= path.end);
  const xs = [...layout.wall.map(([x]) => x), ...navigable.map((sample) => sample.x)];
  const zs = [...layout.wall.map(([, z]) => z), ...navigable.map((sample) => sample.z)];
  const minX = Math.min(...xs);
  const minZ = Math.min(...zs);
  const spanX = Math.max(...xs) - minX;
  const spanZ = Math.max(...zs) - minZ;
  const span = Math.max(spanX, spanZ);

  // Everything but the boat and the points is drawn once per size and kept.
  const base = document.createElement('canvas');
  let ratio = 1;
  let px = (x) => x;
  let py = (z) => z;
  let detail = 1; // marks grow a little with the map

  function resize() {
    const size = canvas.clientWidth;
    ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = base.width = size * ratio;
    canvas.height = base.height = size * ratio;
    detail = Math.min(2.2, Math.max(1, size / 120));

    const pad = 10;
    const scale = (size - pad * 2) / span;
    const offsetX = pad + (span - spanX) * scale * 0.5;
    const offsetY = pad + (span - spanZ) * scale * 0.5;
    px = (x) => (offsetX + (x - minX) * scale) * ratio;
    py = (z) => (offsetY + (z - minZ) * scale) * ratio;

    const pen = base.getContext('2d');
    pen.clearRect(0, 0, base.width, base.height);
    pen.lineJoin = 'round';
    pen.lineCap = 'round';

    pen.strokeStyle = hex(COLORS.water);
    pen.lineWidth = Math.max(3, RIVER.width * scale) * ratio;
    pen.beginPath();
    path.samples.forEach((sample, i) => (i ? pen.lineTo(px(sample.x), py(sample.z)) : pen.moveTo(px(sample.x), py(sample.z))));
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
    for (const bridge of layout.bridges) {
      const { sample } = path.project(bridge.x, bridge.z);
      const reach = RIVER.width * 0.75;
      pen.beginPath();
      pen.moveTo(px(sample.x - sample.rx * reach), py(sample.z - sample.rz * reach));
      pen.lineTo(px(sample.x + sample.rx * reach), py(sample.z + sample.rz * reach));
      pen.stroke();
    }
  }
  resize();

  function update(state) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(base, 0, 0);
    // Points of interest: pale while pending, green once found.
    for (const marker of guide.markers) {
      context.beginPath();
      context.arc(px(marker.x), py(marker.z), 2.4 * detail * ratio, 0, Math.PI * 2);
      // The night-only point shows in moonlight yellow until it is found.
      context.fillStyle = guide.found.has(marker.id) ? '#4a7a4e' : marker.bonus ? '#e8c860' : '#f4e9d2';
      context.fill();
      context.lineWidth = 0.8 * ratio;
      context.strokeStyle = '#2e2418';
      context.stroke();
    }
    context.save();
    context.translate(px(state.x), py(state.z));
    context.rotate(-state.heading + Math.PI); // heading 0 points south on the map
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
  }

  return { update, resize };
}
