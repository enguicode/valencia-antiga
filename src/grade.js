import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Final look, like a film grade: the scene is drawn into a linear buffer,
// given a glow around the brightest light (bloom), and a last full-screen pass
// tone-maps it, warms the lights, cools the shades, adds a gentle S-curve, a
// vignette, a faint lens fringe and moving grain.
// Off (scene straight to the screen) on the low quality level.

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uFrame;
  uniform float uNight;
  varying vec2 vUv;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    // faint colour fringe toward the frame edges
    vec2 cc = vUv - 0.5;
    vec2 ca = cc * dot(cc, cc) * 0.006;
    vec3 col = vec3(
      texture2D(tDiffuse, vUv - ca).r,
      texture2D(tDiffuse, vUv).g,
      texture2D(tDiffuse, vUv + ca).b
    );
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    vec3 m = gl_FragColor.rgb;

    // split tone: cool shades, warm lights (softer at night)
    float l = dot(m, vec3(0.2126, 0.7152, 0.0722));
    vec3 shadeTint = mix(vec3(0.94, 0.98, 1.05), vec3(0.92, 0.96, 1.08), uNight);
    vec3 lightTint = mix(vec3(1.05, 1.0, 0.92), vec3(1.02, 0.99, 0.94), uNight);
    m *= mix(shadeTint, vec3(1.0), smoothstep(0.0, 0.45, l));
    m *= mix(vec3(1.0), lightTint, smoothstep(0.45, 1.0, l));
    m = mix(vec3(l), m, 1.08); // a touch more saturation
    m = clamp(m, 0.0, 1.0);
    m = mix(m, m * m * (3.0 - 2.0 * m), 0.22); // S-curve

    float vig = 1.0 - smoothstep(0.4, 1.1, length(cc * vec2(1.05, 1.25)));
    m *= mix(0.78, 1.0, vig);

    // film grain, stronger in the shades, plus a dither against banding
    float gr = hash12(gl_FragCoord.xy + fract(uFrame * 0.618) * 311.0) - 0.5;
    m += gr * 0.022 * (1.0 - l * 0.6) + (hash12(gl_FragCoord.yx * 1.3 + uFrame) - 0.5) / 255.0;
    gl_FragColor = vec4(m, 1.0);
  }
`;

export function createGrade(renderer, scene, camera, antialias) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: antialias ? 4 : 0,
  });
  const composer = new EffectComposer(renderer, target);
  const scenePass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.5, 1.0); // strength, radius, threshold
  const finish = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uFrame: { value: 0 }, uNight: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader,
    }),
  );
  for (const pass of [scenePass, bloom, finish]) composer.addPass(pass);
  const size = new THREE.Vector2();
  const drawn = new THREE.Vector2();
  let on = true;
  renderer.info.autoReset = false; // so ?debug counts every pass, not just the last
  let frame = 0;

  return {
    setLevel(level) {
      on = level.grade;
      bloom.enabled = level.bloom;
    },
    // `view` lets a capture draw through a camera of its own.
    render(view = camera, night = 0) {
      renderer.info.reset();
      if (!on) {
        renderer.render(scene, view);
        return;
      }
      renderer.getDrawingBufferSize(size);
      if (!size.equals(drawn)) {
        drawn.copy(size);
        composer.setPixelRatio(renderer.getPixelRatio());
        renderer.getSize(size);
        composer.setSize(size.x, size.y);
      }
      scenePass.camera = view;
      frame = (frame + 1) % 1000;
      finish.uniforms.uFrame.value = frame;
      finish.uniforms.uNight.value = night;
      composer.render();
    },
  };
}
