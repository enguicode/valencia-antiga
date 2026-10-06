import * as THREE from 'three';
import { RIVER } from './config.js';

// The river centreline, sampled at a fixed spacing. Each sample carries its
// tangent (tx, tz) and the unit vector pointing to the right-hand bank
// (rx, rz), which is the city side.
export function createRiverPath(layout) {
  const curve = new THREE.CatmullRomCurve3(
    layout.river.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const length = curve.getLength();
  const count = Math.round(length / RIVER.sampleSpacing);
  const step = length / count;
  const points = curve.getSpacedPoints(count);

  const samples = points.map((point, i) => {
    const before = points[Math.max(i - 1, 0)];
    const after = points[Math.min(i + 1, count)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const norm = Math.hypot(dx, dz);
    const tx = dx / norm;
    const tz = dz / norm;
    return { x: point.x, z: point.z, tx, tz, rx: -tz, rz: tx, s: i * step };
  });

  // Distance along the river (s) and signed offset from the centreline
  // (positive towards the city) for any point on the map.
  function project(x, z) {
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

  function sampleAt(s) {
    return samples[THREE.MathUtils.clamp(Math.round(s / step), 0, count)];
  }

  // Same as sampleAt, but interpolated: for things that move smoothly.
  function pointAt(s) {
    const position = THREE.MathUtils.clamp(s / step, 0, count - 0.001);
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

  const bridgeStations = layout.bridges.map((bridge) => project(bridge.x, bridge.z).s);
  const start = Math.min(...bridgeStations) - RIVER.upstreamRun;
  const end = Math.max(...bridgeStations) + RIVER.downstreamRun;

  return { samples, length, step, project, sampleAt, pointAt, start, end };
}

const ribbons = [];

// Limits every ribbon to the rows between two samples, so the stretches lost
// in the fog are not drawn.
export function setRibbonWindow(first, last) {
  for (const { geometry, columns } of ribbons) {
    geometry.setDrawRange(first * (columns - 1) * 6, (last - first) * (columns - 1) * 6);
  }
}

// Sweeps a cross-section along the river. `profile` lists [lateral, height]
// pairs; vertices are laid out row by row, one row per sample.
export function buildRibbon(samples, profile) {
  const columns = profile.length;
  const positions = new Float32Array(samples.length * columns * 3);
  const indices = [];
  samples.forEach((sample, row) => {
    profile.forEach(([lateral, height], column) => {
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
  ribbons.push({ geometry, columns });
  return geometry;
}
