import * as THREE from 'three';
import { RIVER, BANK, COLORS, yawTowards } from './config.js';

// Stone bridges: a deck on a row of arches, with a ramp down to each bank.
// They cross at right angles to the river, which is a simplification.

const SPAN = RIVER.width + BANK.slopeRun * 2 + 4;
const DECK = { width: 9, top: 8.5 };
const RAMP = 35;
const PIER = 3;
const ARCH = { spring: 2, rise: 4.5 };
const PARAPET = { height: 0.9, thickness: 0.5 };
const FOOT = -3;

// Number of arches of each bridge. Serrans and Mar are checked against a
// source; the other three are from memory. See docs/sources.md.
const ARCHES = { 'sant-josep': 13, serrans: 9, trinitat: 10, real: 10, mar: 10 };

function createBridgeGeometry(arches) {
  const half = SPAN / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-half - RAMP, FOOT);
  outline.lineTo(-half - RAMP, BANK.height - 0.2);
  outline.lineTo(-half, DECK.top);
  outline.lineTo(half, DECK.top);
  outline.lineTo(half + RAMP, BANK.height - 0.2);
  outline.lineTo(half + RAMP, FOOT);
  outline.closePath();

  const opening = (SPAN - PIER * (arches + 1)) / arches;
  for (let i = 0; i < arches; i++) {
    const centre = -half + PIER + opening / 2 + i * (opening + PIER);
    const hole = new THREE.Path();
    hole.moveTo(centre - opening / 2, FOOT + 0.5);
    hole.lineTo(centre - opening / 2, ARCH.spring);
    hole.absellipse(centre, ARCH.spring, opening / 2, ARCH.rise, Math.PI, 0, true);
    hole.lineTo(centre + opening / 2, FOOT + 0.5);
    hole.closePath();
    outline.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(outline, { depth: DECK.width, bevelEnabled: false, curveSegments: 8 });
  geometry.translate(0, 0, -DECK.width / 2);
  return geometry;
}

export function createBridges(layout, path) {
  const stone = new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 1, flatShading: true });
  const parapetGeometry = new THREE.BoxGeometry(SPAN, PARAPET.height, PARAPET.thickness);
  const group = new THREE.Group();

  for (const bridge of layout.bridges) {
    const { sample } = path.project(bridge.x, bridge.z);
    const model = new THREE.Group();
    model.position.set(sample.x, 0, sample.z);
    model.rotation.y = yawTowards(sample.rx, sample.rz);

    model.add(new THREE.Mesh(createBridgeGeometry(ARCHES[bridge.id] ?? 10), stone));
    for (const side of [-1, 1]) {
      const parapet = new THREE.Mesh(parapetGeometry, stone);
      parapet.position.set(0, DECK.top + PARAPET.height / 2, side * (DECK.width / 2 - PARAPET.thickness / 2));
      model.add(parapet);
    }
    group.add(model);
  }
  return group;
}
