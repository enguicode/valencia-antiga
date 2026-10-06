import * as THREE from 'three';
import { RIVER, BANK, WALL, CITY_SIDE, COLORS } from './config.js';

// Placeholder city wall for v0.1: a straight curtain with repeated towers and a
// single gate. It does not follow the real layout yet.

const Z_START = -RIVER.overrun;
const Z_END = RIVER.length + RIVER.overrun;
const TOWARDS_RIVER = -CITY_SIDE;
const WALL_X = CITY_SIDE * (RIVER.width / 2 + WALL.setback);
const BASE_Y = BANK.height - 0.5;
const GATE_Z = RIVER.length / 2;

const TOWER = { size: 8, extraHeight: 5, offset: 2.5 };
const GATE = { towerRadius: 5.5, towerGap: 7.5, extraHeight: 9, offset: 3 };
const MERLON = { width: 1, height: 1.2, spacing: 2.4 };

function fillInstances(mesh, matrices) {
  matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
  return mesh;
}

export function createWalls() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 1, flatShading: true });
  const dark = new THREE.MeshBasicMaterial({ color: COLORS.stoneDark });
  const dummy = new THREE.Object3D();
  const merlons = [];
  const towers = [];
  const slits = [];

  const place = (list, x, y, z, rotationY = 0) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotationY, 0);
    dummy.updateMatrix();
    list.push(dummy.matrix.clone());
  };

  // Curtain wall
  const curtainLength = Z_END - Z_START;
  const curtain = new THREE.Mesh(new THREE.BoxGeometry(WALL.thickness, WALL.height, curtainLength), stone);
  curtain.position.set(WALL_X, BASE_Y + WALL.height / 2, (Z_START + Z_END) / 2);
  group.add(curtain);

  const curtainTop = BASE_Y + WALL.height + MERLON.height / 2;
  const curtainFace = WALL_X + TOWARDS_RIVER * (WALL.thickness / 2 - MERLON.width / 2);
  for (let z = Z_START; z <= Z_END; z += MERLON.spacing) {
    place(merlons, curtainFace, curtainTop, z);
  }

  // Square towers at regular intervals, leaving room for the gate
  const towerHeight = WALL.height + TOWER.extraHeight;
  const towerX = WALL_X + TOWARDS_RIVER * TOWER.offset;
  const towerTop = BASE_Y + towerHeight + MERLON.height / 2;
  const rim = TOWER.size / 2 - MERLON.width / 2;
  const firstTower = Math.ceil(Z_START / WALL.towerSpacing) * WALL.towerSpacing + WALL.towerSpacing / 2;
  for (let z = firstTower; z < Z_END; z += WALL.towerSpacing) {
    if (Math.abs(z - GATE_Z) < WALL.towerSpacing / 2) continue;
    place(towers, towerX, BASE_Y + towerHeight / 2, z);
    place(slits, towerX + TOWARDS_RIVER * (TOWER.size / 2 + 0.02), BASE_Y + towerHeight * 0.65, z);
    for (let step = -1; step <= 1; step++) {
      const along = step * rim;
      place(merlons, towerX + rim, towerTop, z + along);
      place(merlons, towerX - rim, towerTop, z + along);
      place(merlons, towerX + along, towerTop, z + rim);
      place(merlons, towerX + along, towerTop, z - rim);
    }
  }

  // Gate: two taller polygonal towers flanking an arched passage
  const gateHeight = WALL.height + GATE.extraHeight;
  const gateX = WALL_X + TOWARDS_RIVER * GATE.offset;
  const gateTowerGeometry = new THREE.CylinderGeometry(GATE.towerRadius, GATE.towerRadius, gateHeight, 6);
  for (const direction of [-1, 1]) {
    const z = GATE_Z + direction * GATE.towerGap;
    const tower = new THREE.Mesh(gateTowerGeometry, stone);
    tower.position.set(gateX, BASE_Y + gateHeight / 2, z);
    group.add(tower);
    const crown = GATE.towerRadius - MERLON.width / 2;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      place(
        merlons,
        gateX + Math.cos(angle) * crown,
        BASE_Y + gateHeight + MERLON.height / 2,
        z + Math.sin(angle) * crown,
        -angle,
      );
    }
  }

  const passageHeight = WALL.height + 4;
  const passageDepth = 6;
  const passage = new THREE.Mesh(new THREE.BoxGeometry(passageDepth, passageHeight, GATE.towerGap * 2), stone);
  passage.position.set(WALL_X + TOWARDS_RIVER * 1.5, BASE_Y + passageHeight / 2, GATE_Z);
  group.add(passage);

  const archShape = new THREE.Shape();
  archShape.moveTo(-2.2, 0);
  archShape.lineTo(-2.2, 4);
  archShape.absarc(0, 4, 2.2, Math.PI, 0, true);
  archShape.lineTo(2.2, 0);
  archShape.closePath();
  const arch = new THREE.Mesh(new THREE.ShapeGeometry(archShape, 10), dark);
  arch.rotation.y = TOWARDS_RIVER * (Math.PI / 2);
  arch.position.set(passage.position.x + TOWARDS_RIVER * (passageDepth / 2 + 0.03), BASE_Y + 0.5, GATE_Z);
  group.add(arch);

  // Instanced details
  group.add(
    fillInstances(
      new THREE.InstancedMesh(new THREE.BoxGeometry(TOWER.size, towerHeight, TOWER.size), stone, towers.length),
      towers,
    ),
    fillInstances(
      new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1.6, 0.35), dark, slits.length),
      slits,
    ),
    fillInstances(
      new THREE.InstancedMesh(
        new THREE.BoxGeometry(MERLON.width, MERLON.height, MERLON.width * 1.2),
        stone,
        merlons.length,
      ),
      merlons,
    ),
  );

  return group;
}
