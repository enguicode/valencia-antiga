import * as THREE from 'three';
import { RIVER, BANK, COLORS, yawTowards } from './config.js';
import { createSurface } from './materials.js';
import { createInstances } from './instancing.js';

// Stone bridges: a deck on a row of arches, with a ramp down to each bank.
// They cross at right angles to the river, which is a simplification.

const SPAN = RIVER.width + BANK.slopeRun * 2 + 4;
const DECK = { width: 9, top: 8.5 };
const RAMP = 35;
const PIER = 3;
const ARCH = { spring: 2, rise: 4.5 };
const PARAPET = { height: 0.9, thickness: 0.5 };
const FOOT = -3;
const CUTWATER = { reach: 3.2, top: 4.6 }; // how far the piers' pointed ends stick out, and how high

// Number of arches of each bridge. Serrans and Mar are checked against a
// source; the other three are from memory. See docs/sources.md.
const ARCHES = { 'sant-josep': 13, serrans: 9, trinitat: 10, real: 10, mar: 10 };
// Bridges with a pair of small shrines (casalicis) on the parapets. Mar is
// documented; Real is from memory.
const SHRINES = new Set(['real', 'mar']);

const archCount = (bridge) => ARCHES[bridge.id] ?? 10;
const openingOf = (arches) => (SPAN - PIER * (arches + 1)) / arches;
const archCentre = (arches, i) => -SPAN / 2 + PIER + openingOf(arches) / 2 + i * (openingOf(arches) + PIER);

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

  const opening = openingOf(arches);
  for (let i = 0; i < arches; i++) {
    const centre = archCentre(arches, i);
    const hole = new THREE.Path();
    hole.moveTo(centre - opening / 2, FOOT + 0.5);
    hole.lineTo(centre - opening / 2, ARCH.spring);
    hole.absellipse(centre, ARCH.spring, opening / 2, ARCH.rise, Math.PI, 0, true);
    hole.lineTo(centre + opening / 2, FOOT + 0.5);
    hole.closePath();
    outline.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(outline, { depth: DECK.width, bevelEnabled: false, curveSegments: 10 });
  geometry.translate(0, 0, -DECK.width / 2);
  return geometry;
}

// A pier seen from above: its rectangle, drawn out to a point up- and
// downstream so the current parts around it.
function createCutwaterGeometry() {
  const half = DECK.width / 2;
  const plan = new THREE.Shape();
  plan.moveTo(-PIER / 2, -half);
  plan.lineTo(0, -half - CUTWATER.reach);
  plan.lineTo(PIER / 2, -half);
  plan.lineTo(PIER / 2, half);
  plan.lineTo(0, half + CUTWATER.reach);
  plan.lineTo(-PIER / 2, half);
  plan.closePath();
  const geometry = new THREE.ExtrudeGeometry(plan, { depth: CUTWATER.top - FOOT, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); // extrude upwards; the plan's y becomes -z
  geometry.translate(0, FOOT, 0);
  return geometry;
}

export function createBridges(layout, path) {
  // Double-sided, so a camera that strays into the stonework sees stone
  // rather than straight through it.
  const stone = createSurface('masonry', 4, { color: COLORS.stone, side: THREE.DoubleSide });
  const pale = createSurface('masonry', 3, { color: 0xe2d3b0 });
  const roof = createSurface('tiles', 2, { color: COLORS.roofs[0] });
  const parapetGeometry = new THREE.BoxGeometry(SPAN, PARAPET.height, PARAPET.thickness);
  const courseGeometry = new THREE.BoxGeometry(SPAN, 0.35, DECK.width + 0.5);
  const shrineGeometry = new THREE.BoxGeometry(1.7, 2.8, 1.7);
  const shrineRoofGeometry = new THREE.ConeGeometry(1.5, 1.4, 4).rotateY(Math.PI / 4);
  const cutwaterGeometry = createCutwaterGeometry();
  const group = new THREE.Group();
  const cutwaters = [];
  const balls = [];
  const local = new THREE.Object3D();

  for (const bridge of layout.bridges) {
    const { sample } = path.project(bridge.x, bridge.z);
    const arches = archCount(bridge);
    const model = new THREE.Group();
    model.position.set(sample.x, 0, sample.z);
    model.rotation.y = yawTowards(sample.rx, sample.rz);
    model.updateMatrix();

    model.add(new THREE.Mesh(createBridgeGeometry(arches), stone));
    const course = new THREE.Mesh(courseGeometry, stone);
    course.position.y = DECK.top - 1;
    model.add(course);
    for (const side of [-1, 1]) {
      const parapet = new THREE.Mesh(parapetGeometry, stone);
      const z = side * (DECK.width / 2 - PARAPET.thickness / 2);
      parapet.position.set(0, DECK.top + PARAPET.height / 2, z);
      model.add(parapet);

      // A stone ball over every pier, as on the river walls
      for (let i = 0; i <= arches; i++) {
        local.position.set(-SPAN / 2 + PIER / 2 + i * (openingOf(arches) + PIER), DECK.top + PARAPET.height + 0.3, z);
        local.updateMatrix();
        balls.push({ matrix: model.matrix.clone().multiply(local.matrix) });
      }

      if (SHRINES.has(bridge.id)) {
        const shrine = new THREE.Mesh(shrineGeometry, pale);
        shrine.position.set(side * 0, DECK.top + 1.4, side * (DECK.width / 2 + 0.6));
        const cap = new THREE.Mesh(shrineRoofGeometry, roof);
        cap.position.set(0, DECK.top + 3.5, side * (DECK.width / 2 + 0.6));
        model.add(shrine, cap);
      }
    }

    for (let i = 0; i <= arches; i++) {
      local.position.set(-SPAN / 2 + PIER / 2 + i * (openingOf(arches) + PIER), 0, 0);
      local.updateMatrix();
      cutwaters.push({ matrix: model.matrix.clone().multiply(local.matrix) });
    }
    group.add(model);
  }

  group.add(
    createInstances(cutwaterGeometry, stone, cutwaters),
    createInstances(new THREE.SphereGeometry(0.42, 12, 9), stone, balls),
  );
  return group;
}

// Keeps boats out of the stonework. From some way off it eases a boat
// towards the nearest arch, so that by the time it reaches the bridge it is
// inside an opening; it also says how close the bridge is, from 0 to 1.
export function createBridgeGuide(layout, path) {
  const FUNNEL = 38; // metres before and after the bridge where it acts
  const CLEARANCE = 1.5; // kept between the boat's middle and the pier
  const bridges = layout.bridges.map((bridge) => {
    const arches = archCount(bridge);
    return {
      s: path.project(bridge.x, bridge.z).s,
      centres: Array.from({ length: arches }, (_, i) => archCentre(arches, i)),
      room: openingOf(arches) / 2 - CLEARANCE,
    };
  });

  return function constrain(s, lateral) {
    let closeness = 0;
    let corrected = lateral;
    for (const bridge of bridges) {
      const gap = Math.abs(s - bridge.s);
      if (gap >= FUNNEL) continue;
      closeness = 1 - gap / FUNNEL;
      const centre = bridge.centres.reduce((best, c) => (Math.abs(c - lateral) < Math.abs(best - lateral) ? c : best));
      // Fully narrowed over the last third of the approach.
      const squeeze = THREE.MathUtils.smoothstep(closeness, 0, 0.66);
      const room = THREE.MathUtils.lerp(RIVER.width, bridge.room, squeeze);
      corrected = THREE.MathUtils.clamp(lateral, centre - room, centre + room);
    }
    return { lateral: corrected, closeness };
  };
}
