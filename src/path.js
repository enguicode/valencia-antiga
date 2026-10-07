import * as THREE from 'three';
import { RIVER } from './config.js';

// The river centreline, sampled at a fixed spacing. Each sample carries its
// tangent (tx, tz) and the unit vector pointing to the right-hand bank
// (rx, rz), which is the city side.
function sampleCurve(points) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const length = curve.getLength();
  const count = Math.round(length / RIVER.sampleSpacing);
  const step = length / count;
  const spaced = curve.getSpacedPoints(count);

  const samples = spaced.map((point, i) => {
    const before = spaced[Math.max(i - 1, 0)];
    const after = spaced[Math.min(i + 1, count)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const norm = Math.hypot(dx, dz);
    const tx = dx / norm;
    const tz = dz / norm;
    return { x: point.x, z: point.z, tx, tz, rx: -tz, rz: tx, s: i * step };
  });

  return { samples, length, step, count };
}

// Arc-length parameter of the control point the curve already passes through.
function parameterAt(curve, x, z) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const left = (lo * 2 + hi) / 3;
    const right = (lo + hi * 2) / 3;
    const a = curve.getPointAt(left);
    const b = curve.getPointAt(right);
    const da = (a.x - x) ** 2 + (a.z - z) ** 2;
    const db = (b.x - x) ** 2 + (b.z - z) ** 2;
    if (da < db) hi = right;
    else lo = left;
  }
  return (lo + hi) / 2;
}

// Samples that continue past the city curve. `course` is in scene metres,
// after the last city point. The city samples themselves are not rebuilt.
function continuationSamples(city, course) {
  if (!course?.length) return [];
  const previous = city.samples.at(-2);
  const join = city.samples.at(-1);
  const controls = [
    new THREE.Vector3(previous.x, 0, previous.z),
    new THREE.Vector3(join.x, 0, join.z),
    ...course.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  ];
  const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal');
  const length = curve.getLength();
  const joinU = parameterAt(curve, join.x, join.z);
  const points = [];
  for (let dist = joinU * length + city.step; dist < length - city.step * 0.35; dist += city.step) {
    points.push(curve.getPointAt(dist / length));
  }
  points.push(curve.getPointAt(1));

  return points.map((point, i) => {
    const before = i === 0 ? join : points[i - 1];
    const after = points[Math.min(i + 1, points.length - 1)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const norm = Math.hypot(dx, dz) || 1;
    const tx = dx / norm;
    const tz = dz / norm;
    return { x: point.x, z: point.z, tx, tz, rx: -tz, rz: tx, s: join.s + (i + 1) * city.step };
  });
}

function projectList(samples, x, z) {
  let index = 0;
  let best = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2;
    if (d < best) {
      best = d;
      index = i;
    }
  }
  const sample = samples[index];
  const dx = x - sample.x;
  const dz = z - sample.z;
  return {
    index,
    sample,
    s: sample.s + dx * sample.tx + dz * sample.tz,
    lateral: dx * sample.rx + dz * sample.rz,
  };
}

export function createRiverPath(layout) {
  const city = sampleCurve(layout.river);
  // The tour's start and end come only from the historic bridges, so adding
  // the run to the sea cannot move them.
  const bridgeStations = layout.bridges.map((bridge) => projectList(city.samples, bridge.x, bridge.z).s);
  const start = Math.min(...bridgeStations) - RIVER.upstreamRun;
  const end = Math.max(...bridgeStations) + RIVER.downstreamRun;
  const samples = city.samples.concat(continuationSamples(city, layout.sea?.course));
  const garden = city.samples.findLast((sample) => sample.s <= end)?.s ?? end;

  function project(x, z) {
    return projectList(samples, x, z);
  }

  const step = city.step;
  const last = samples.length - 1;

  function sampleAt(s) {
    return samples[THREE.MathUtils.clamp(Math.round(s / step), 0, last)];
  }

  // Same as sampleAt, but interpolated: for things that move smoothly.
  function pointAt(s) {
    const position = THREE.MathUtils.clamp(s / step, 0, last - 0.001);
    const a = samples[Math.floor(position)];
    const b = samples[Math.floor(position) + 1];
    const t = position % 1;
    const tx = a.tx + (b.tx - a.tx) * t;
    const tz = a.tz + (b.tz - a.tz) * t;
    const norm = Math.hypot(tx, tz);
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      tx: tx / norm,
      tz: tz / norm,
      rx: -tz / norm,
      rz: tx / norm,
    };
  }

  const mouth = layout.sea ? project(layout.sea.mouth[0], layout.sea.mouth[1]).s : end;
  const seaEnd = layout.sea ? project(layout.sea.offshore[0], layout.sea.offshore[1]).s : end;

  return {
    samples,
    citySamples: city.samples,
    length: city.length,
    cityLength: city.length,
    step,
    project,
    sampleAt,
    pointAt,
    start,
    end,
    garden,
    mouth,
    seaEnd,
  };
}

const ribbons = [];

// Limits every ribbon to the rows between two samples, so the stretches lost
// in the fog are not drawn. A ribbon shorter than the full river (the city
// banks stop where the gardens start) is clamped to the rows it has.
export function setRibbonWindow(first, last) {
  for (const { geometry, columns, rows } of ribbons) {
    const from = Math.max(0, Math.min(first, rows - 1));
    const to = Math.max(from, Math.min(last, rows - 1));
    geometry.setDrawRange(from * (columns - 1) * 6, (to - from) * (columns - 1) * 6);
  }
}

// Sweeps a cross-section along the river. `profile` lists [lateral, height]
// pairs, or is a function of the sample when the section changes along the
// course. Vertices are laid out row by row, one row per sample.
export function buildRibbon(samples, profile) {
  const vary = typeof profile === 'function';
  const first = vary ? profile(samples[0]) : profile;
  const columns = first.length;
  const positions = new Float32Array(samples.length * columns * 3);
  const indices = [];
  samples.forEach((sample, row) => {
    const section = vary ? profile(sample) : profile;
    section.forEach(([lateral, height], column) => {
      const offset = (row * columns + column) * 3;
      positions[offset] = sample.x + sample.rx * lateral;
      positions[offset + 1] = height;
      positions[offset + 2] = sample.z + sample.rz * lateral;
    });
    if (row === samples.length - 1) return;
    for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  ribbons.push({ geometry, columns, rows: samples.length });
  return geometry;
}
