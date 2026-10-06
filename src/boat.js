import * as THREE from 'three';
import { RIVER, COLORS } from './config.js';
import { waveHeight } from './water.js';

const MAX_SPEED = 9;
const MAX_REVERSE = -2.5;
const ACCELERATION = 6;
const DRAG = 0.6;
const TURN_RATE = 0.9;

function createHull(material) {
  // Top-down outline, bow towards +Y of the shape (which becomes +Z in the world).
  const outline = new THREE.Shape();
  outline.moveTo(-0.9, -2.6);
  outline.lineTo(0.9, -2.6);
  outline.lineTo(1.15, 0.4);
  outline.lineTo(0, 3.2);
  outline.lineTo(-1.15, 0.4);
  outline.closePath();

  const depth = 0.9;
  const geometry = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false });
  geometry.rotateX(Math.PI / 2);

  // Narrow the keel so the hull is not a plain prism.
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) < -depth / 2) {
      positions.setX(i, positions.getX(i) * 0.5);
      positions.setZ(i, positions.getZ(i) * 0.85);
    }
  }
  geometry.translate(0, 0.5, 0);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createRigging(wood) {
  const group = new THREE.Group();

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), wood);
  mast.position.set(0, 2.6, 0.5);
  group.add(mast);

  // Lateen sail: a triangle hanging from a slanted yard.
  const tack = new THREE.Vector3(0, 1.3, 2.5);
  const peak = new THREE.Vector3(0, 5.0, -1.3);
  const clew = new THREE.Vector3(1.5, 1.2, -1.8); // sheeted out to port so the sail shows from astern

  const sailGeometry = new THREE.BufferGeometry().setFromPoints([tack, peak, clew]);
  sailGeometry.computeVertexNormals();
  const sail = new THREE.Mesh(
    sailGeometry,
    new THREE.MeshStandardMaterial({
      color: COLORS.sail,
      emissive: COLORS.sail,
      emissiveIntensity: 0.35,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  sail.position.x = 0.1;
  group.add(sail);

  const yardVector = peak.clone().sub(tack);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, yardVector.length() + 0.4, 5), wood);
  yard.position.copy(tack).add(peak).multiplyScalar(0.5);
  yard.position.x = 0.1;
  yard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), yardVector.normalize());
  group.add(yard);

  return group;
}

export function createBoat() {
  const wood = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.9, flatShading: true });
  const mesh = new THREE.Group();
  mesh.rotation.order = 'YXZ';
  mesh.add(createHull(wood), createRigging(wood));

  for (const z of [-1.4, 1.0]) {
    const thwart = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.3), wood);
    thwart.position.set(0, 0.56, z);
    mesh.add(thwart);
  }

  const state = { x: 0, z: 8, heading: 0, speed: 0 };
  const limitX = RIVER.width / 2 - RIVER.margin;
  const forward = new THREE.Vector3();

  function update(dt, input, time) {
    state.speed += input.throttle * ACCELERATION * dt;
    state.speed -= state.speed * DRAG * dt;
    state.speed = THREE.MathUtils.clamp(state.speed, MAX_REVERSE, MAX_SPEED);

    // The rudder needs way on to bite; keep a little authority at rest so the
    // boat can still be pointed somewhere.
    let rudder = THREE.MathUtils.clamp(state.speed / 3, -1, 1);
    if (Math.abs(rudder) < 0.25) rudder = 0.25;
    state.heading -= input.steer * TURN_RATE * rudder * dt;

    state.x += Math.sin(state.heading) * state.speed * dt;
    state.z += Math.cos(state.heading) * state.speed * dt;

    if (Math.abs(state.x) > limitX) {
      state.x = Math.sign(state.x) * limitX;
      // Scrape along the bank: only the part of the motion aimed at it is lost.
      state.speed *= 1 - Math.min(1, 2.5 * Math.abs(Math.sin(state.heading)) * dt);
    }
    if (state.z < 4 || state.z > RIVER.length) {
      state.z = THREE.MathUtils.clamp(state.z, 4, RIVER.length);
      state.speed = 0;
    }

    const bow = waveHeight(state.x + Math.sin(state.heading) * 2, state.z + Math.cos(state.heading) * 2, time);
    const stern = waveHeight(state.x - Math.sin(state.heading) * 2, state.z - Math.cos(state.heading) * 2, time);
    mesh.position.set(state.x, (bow + stern) / 2, state.z);
    mesh.rotation.y = state.heading;
    mesh.rotation.x = (stern - bow) * 0.25;
    mesh.rotation.z = input.steer * (state.speed / MAX_SPEED) * 0.12;
  }

  function getForward() {
    return forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  }

  return { mesh, state, update, getForward };
}
