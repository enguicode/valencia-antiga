import * as THREE from 'three';
import { RIVER, createRandom, yawTowards } from './config.js';
import { createInstances } from './instancing.js';
import { createBoatModel, setSailLight } from './boat.js';
import { waveHeight } from './water.js';

// Things that move or keep the place company: other boats, washerwomen at
// the water's edge, smoke over the roofs and birds. All of it is decoration
// with no historical source behind it.

function createTraffic(path, random) {
  const boats = Array.from({ length: 7 }, (_, i) => {
    const model = createBoatModel();
    model.scale.setScalar(0.8 + random() * 0.3);
    return {
      model,
      s: path.start + 60 + ((path.end - path.start - 120) * (i + random() * 0.6)) / 7,
      lateral: (random() < 0.5 ? -1 : 1) * (14 + random() * 22),
      direction: random() < 0.5 ? -1 : 1,
      speed: 1.5 + random() * 2.5,
    };
  });

  function update(dt, time) {
    for (const boat of boats) {
      boat.s += boat.direction * boat.speed * dt;
      if (boat.s > path.end - 20 || boat.s < path.start + 20) boat.direction *= -1;
      const point = path.pointAt(boat.s);
      const x = point.x + point.rx * boat.lateral;
      const z = point.z + point.rz * boat.lateral;
      boat.model.position.set(x, waveHeight(x, z, time), z);
      boat.model.rotation.y = Math.atan2(point.tx * boat.direction, point.tz * boat.direction);
    }
  }

  return { models: boats.map((boat) => boat.model), update };
}

// Kneeling figures with a white cloth in front of them, near each bridge on
// the city side.
function createWasherwomen(layout, path, random) {
  const skirts = [0x7a4a3a, 0x4f5d73, 0x6b6b3f, 0x8a5a44, 0x3f4f4a];
  const waterline = RIVER.width / 2 + 5.2;
  const boxes = [];
  const heads = [];
  const dummy = new THREE.Object3D();

  for (const bridge of layout.bridges) {
    const base = path.project(bridge.x, bridge.z).s + 42;
    for (let i = 0; i < 4; i++) {
      const point = path.pointAt(base + i * 1.7 + random() * 0.5);
      const facing = yawTowards(-point.rx, -point.rz); // local +X towards the river
      const place = (lateral) => [point.x + point.rx * lateral, point.z + point.rz * lateral];

      const [x, z] = place(waterline + 0.6);
      dummy.rotation.set(0, facing, 0);
      dummy.position.set(x, 0.55, z);
      dummy.scale.set(0.5, 0.7, 0.5);
      dummy.updateMatrix();
      boxes.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(skirts[Math.floor(random() * skirts.length)]) });

      dummy.position.set(x, 1.08, z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      heads.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(0xd9a98a) });

      const [clothX, clothZ] = place(waterline - 0.2);
      dummy.position.set(clothX, 0.12, clothZ);
      dummy.scale.set(0.7, 0.06, 0.45);
      dummy.updateMatrix();
      boxes.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(0xf4f1e8) });
    }
  }

  const material = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const group = new THREE.Group();
  group.add(
    createInstances(new THREE.BoxGeometry(1, 1, 1), material, boxes),
    createInstances(new THREE.IcosahedronGeometry(0.19, 0), material, heads),
  );
  return group;
}

function createSmoke(chimneys, random) {
  const PUFFS = 5;
  const count = chimneys.length * PUFFS;
  const positions = new Float32Array(count * 3);
  const ages = new Float32Array(count);
  const phases = Float32Array.from({ length: count }, () => random());

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { color: { value: new THREE.Color(0xd8d2c8) }, light: { value: 1 } },
    ]),
    vertexShader: `
      attribute float age;
      varying float vAlpha;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (4.0 + age * 12.0) * (260.0 / -mvPosition.z);
        vAlpha = (1.0 - age) * smoothstep(0.0, 0.15, age);
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float light;
      varying float vAlpha;
      #include <fog_pars_fragment>
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(color * light, vAlpha * 0.4 * (1.0 - d * 1.6));
        #include <fog_fragment>
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  function update(time, light) {
    material.uniforms.light.value = light;
    for (let i = 0; i < count; i++) {
      const chimney = chimneys[Math.floor(i / PUFFS)];
      const age = (time * 0.07 + phases[i]) % 1;
      ages[i] = age;
      positions[i * 3] = chimney.x + age * 12 + Math.sin(time * 0.7 + i) * 0.6;
      positions[i * 3 + 1] = chimney.y + age * 16;
      positions[i * 3 + 2] = chimney.z + age * 5;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.age.needsUpdate = true;
  }

  return { points, update };
}

function createBirds(random) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 0, 0.3, 0, 0, -0.3, -1.2, 0.4, 0, 0, 0, 0.3, 1.2, 0.4, 0, 0, 0, -0.3],
      3,
    ),
  );
  const birds = Array.from({ length: 18 }, (_, i) => ({
    flock: i % 3,
    phase: random() * Math.PI * 2,
    radius: 35 + random() * 30,
    height: 28 + random() * 14,
    beat: 5 + random() * 3,
  }));
  const flocks = [
    { offsetX: 90, offsetZ: -60, speed: 0.22 },
    { offsetX: -70, offsetZ: 110, speed: -0.17 },
    { offsetX: 160, offsetZ: 140, speed: 0.2 },
  ];
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x2a2520, side: THREE.DoubleSide }),
    birds.length,
  );
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();

  function update(time, boatState, night) {
    mesh.visible = night < 0.5;
    if (!mesh.visible) return;
    birds.forEach((bird, i) => {
      const flock = flocks[bird.flock];
      const angle = time * flock.speed + bird.phase;
      dummy.position.set(
        boatState.x + flock.offsetX + Math.cos(angle) * bird.radius,
        bird.height + Math.sin(time * 0.5 + bird.phase) * 3,
        boatState.z + flock.offsetZ + Math.sin(angle) * bird.radius,
      );
      const turn = Math.sign(flock.speed);
      dummy.rotation.set(0, Math.atan2(-Math.sin(angle) * turn, Math.cos(angle) * turn), 0);
      dummy.scale.set(1, Math.sin(time * bird.beat + bird.phase), 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}

export function createLife(layout, path, chimneys) {
  const random = createRandom(1957);
  const traffic = createTraffic(path, random);
  const smoke = createSmoke(chimneys, random);
  const birds = createBirds(random);

  const group = new THREE.Group();
  group.add(...traffic.models, createWasherwomen(layout, path, random), smoke.points, birds.mesh);

  let extras = true;

  function update(dt, time, boatState, atmosphere) {
    traffic.update(dt, time);
    setSailLight(THREE.MathUtils.clamp(atmosphere.light, 0.15, 1));
    smoke.points.visible = extras;
    birds.mesh.visible = extras;
    if (!extras) return;
    smoke.update(time, THREE.MathUtils.clamp(atmosphere.light, 0.25, 1));
    birds.update(time, boatState, atmosphere.night);
  }

  // Smoke and birds are the first things to go on slow devices.
  const setExtras = (value) => {
    extras = value;
  };

  return { group, update, setExtras };
}
