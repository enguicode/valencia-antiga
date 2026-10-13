import * as THREE from 'three';
import { RIVER, createRandom, yawTowards } from './config.js';
import { createInstances } from './instancing.js';
import { createBoatModel, setSailLight, setLanternLight, animateBoat } from './boat.js';
import { waveHeight } from './water.js';
import { bridgeDecks } from './bridges.js';

// Things that move or keep the place company: other boats, washerwomen at
// the water's edge, people and carts on the bridges, smoke over the roofs
// and birds. All of it is decoration
// with no historical source behind it.

function createTraffic(path, random, bridgeGuide) {
  const boats = Array.from({ length: 7 }, (_, i) => {
    const model = createBoatModel(i % 2 ? 'lateen' : 'albufera');
    model.rotation.order = 'YXZ';
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
      const guided = bridgeGuide(boat.s, boat.lateral);
      animateBoat(boat.model, dt, time, { closeness: guided.closeness, speed: boat.speed, underSail: true });
      const x = point.x + point.rx * guided.lateral;
      const z = point.z + point.rz * guided.lateral;
      boat.model.position.set(x, waveHeight(x, z, time), z);
      boat.model.rotation.y = Math.atan2(point.tx * boat.direction, point.tz * boat.direction);
    }
  }

  return { models: boats.map((boat) => boat.model), update };
}

// Kneeling figures with a white cloth in front of them, near each bridge on
// the city side.
function createWasherwomen(decks, path, random) {
  const skirts = [0x7a4a3a, 0x4f5d73, 0x6b6b3f, 0x8a5a44, 0x3f4f4a];
  const waterline = RIVER.width / 2 + 5.2;
  const boxes = [];
  const heads = [];
  const dummy = new THREE.Object3D();

  for (const deck of decks) {
    const base = deck.cityStation + 42;
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

  const material = new THREE.MeshStandardMaterial({ roughness: 1 });
  const group = new THREE.Group();
  group.add(
    createInstances(new THREE.BoxGeometry(1, 1, 1), material, boxes),
    createInstances(new THREE.SphereGeometry(0.19, 10, 8), material, heads),
  );
  return group;
}

// Clumps of reeds in the shallows of both banks. The plan of 1704 draws the
// river bed full of them; where each clump stands is free.
function createReeds(decks, path, random) {
  const COLOURS = [0x6f7d3a, 0x8a8a46, 0x5d6b34];
  const blades = [];
  const dummy = new THREE.Object3D();
  for (let s = path.start + 10; s < path.end - 10; s += 5 + random() * 11) {
    const side = random() < 0.5 ? -1 : 1;
    // clear of the piers, and of the washerwomen just downstream of each bridge
    const past = (deck) => s - (side > 0 ? deck.cityStation : deck.farStation);
    if (decks.some((deck) => past(deck) > -14 && past(deck) < 54)) continue;
    const point = path.pointAt(s);
    const lateral = side * (RIVER.width / 2 + 0.4 + random() * 3);
    for (let i = 0; i < 7; i++) {
      const u = lateral + (random() - 0.5) * 2.6;
      const v = (random() - 0.5) * 3.4;
      dummy.position.set(point.x + point.rx * u + point.tx * v, -0.2, point.z + point.rz * u + point.tz * v);
      dummy.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3);
      dummy.scale.set(0.4, 1.7 + random() * 1.5, 0.4);
      dummy.updateMatrix();
      blades.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(COLOURS[Math.floor(random() * COLOURS.length)]) });
    }
  }
  return createInstances(new THREE.ConeGeometry(0.5, 1, 4).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
}

// People on foot and mule carts crossing each bridge, back and forth along
// the deck, and a few idlers at the parapet. From the water only what clears
// the parapet shows.
function createCrossings(decks, random) {
  const CLOTH = [0x7a4a3a, 0x4f5d73, 0x6b6b3f, 0x8a5a44, 0x3f4f4a, 0x8c8474];
  const SKIN = 0xd9a98a;
  const WOOD = 0x6e5236;
  const cloth = () => CLOTH[Math.floor(random() * CLOTH.length)];
  // Parts as [ahead, up, aside, length, height, breadth, colour], in metres.
  const walker = (ahead = 0, aside = 0) => [
    [ahead, 0, aside, 0.3, 1.38, 0.42, cloth()],
    [ahead, 1.4, aside, 0.24, 0.26, 0.24, SKIN],
  ];
  const cart = () => [
    [0, 0.55, 0, 2.3, 0.14, 1.3, WOOD],
    [0, 0.69, 0, 1.9, 1.1, 1.1, 0xcdbb8a], // the load, under a cloth
    [0, 0, 0.72, 1.1, 1.1, 0.1, WOOD],
    [0, 0, -0.72, 1.1, 1.1, 0.1, WOOD],
    [2.2, 0.75, 0, 1.5, 0.6, 0.45, 0x5a4634], // the mule
    [3.05, 1.2, 0, 0.5, 0.45, 0.3, 0x5a4634],
    [1.7, 0, 0, 0.22, 0.75, 0.4, 0x5a4634],
    [2.7, 0, 0, 0.22, 0.75, 0.4, 0x5a4634],
    ...walker(2.4, 0.85),
  ];

  const movers = [];
  for (const deck of decks) {
    const lane = deck.width / 2 - 1.2;
    const add = (parts, speed, aside) =>
      movers.push({ deck, parts, speed, aside, u: (random() * 2 - 1) * (deck.half - 6), direction: random() < 0.5 ? -1 : 1 });
    for (let i = 0; i < 7; i++) add(walker(), 0.9 + random() * 0.5, (random() * 2 - 1) * lane);
    add(cart(), 1.3 + random() * 0.4, (random() * 2 - 1) * (lane - 0.9));
    movers.at(-1).cart = true;
    // idlers leaning on the parapet, where the boat can see them
    for (let i = 0; i < 5; i++) add(random() < 0.4 ? [...walker(), ...walker(0.75)] : walker(), 0, (random() < 0.5 ? -1 : 1) * (deck.width / 2 - 0.35));
  }

  const count = movers.reduce((total, mover) => total + mover.parts.length, 0);
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ roughness: 1 }),
    count,
  );
  mesh.frustumCulled = false;
  const colour = new THREE.Color();
  let index = 0;
  for (const mover of movers) for (const part of mover.parts) mesh.setColorAt(index++, colour.set(part[6]));
  const dummy = new THREE.Object3D();

  function update(dt, time) {
    let i = 0;
    for (const mover of movers) {
      const { deck } = mover;
      mover.u += mover.direction * mover.speed * dt;
      // turn round with room for the mule, so nothing walks off the level deck
      if (Math.abs(mover.u) > deck.half - 4) mover.direction = -Math.sign(mover.u);
      const step = mover.speed && Math.abs(Math.sin(time * 6 + mover.aside * 9)) * 0.04;
      for (const [ahead, up, aside, length, height, breadth] of mover.parts) {
        const u = mover.u + mover.direction * ahead;
        const v = mover.aside + aside;
        // local +X runs along the deck, so local +Z is (-rz, rx)
        dummy.position.set(deck.x + deck.rx * u - deck.rz * v, deck.heightAt(u) + up + step, deck.z + deck.rz * u + deck.rx * v);
        dummy.rotation.set(0, yawTowards(deck.rx, deck.rz), 0);
        dummy.scale.set(length, height, breadth);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Starts the cart of the bridge nearest to a place on a run over to the
  // city bank, which is at +half, with deck ahead of it for a whole shot.
  function sendCart(x, z) {
    const carts = movers.filter((mover) => mover.cart);
    const distance = (mover) => Math.hypot(mover.deck.x - x, mover.deck.z - z);
    const cart = carts.reduce((best, mover) => (distance(mover) < distance(best) ? mover : best));
    cart.direction = 1;
    cart.u = Math.min(cart.u, cart.deck.half - 24);
    return cart;
  }

  return { mesh, update, sendCart };
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

export function createLife(layout, path, chimneys, bridgeGuide) {
  const random = createRandom(1957);
  const traffic = createTraffic(path, random, bridgeGuide);
  const smoke = createSmoke(chimneys, random);
  const birds = createBirds(random);
  const decks = bridgeDecks(layout, path);
  const crossings = createCrossings(decks, random);
  const reeds = createReeds(decks, path, random);

  const group = new THREE.Group();
  group.add(...traffic.models, createWasherwomen(decks, path, random), smoke.points, birds.mesh, crossings.mesh, reeds);

  let extras = true;

  function update(dt, time, boatState, atmosphere) {
    traffic.update(dt, time);
    crossings.update(dt, time);
    setSailLight(THREE.MathUtils.clamp(atmosphere.light, 0.15, 1));
    setLanternLight(atmosphere.night);
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

  return { group, update, setExtras, sendCart: crossings.sendCart };
}
