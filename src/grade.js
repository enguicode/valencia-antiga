import * as THREE from 'three';

// Final look, like a film grade: the scene is drawn into a linear buffer and
// a single full-screen pass tone-maps it, warms the lights, cools the shades,
// adds a gentle S-curve, a vignette, a faint lens fringe and moving grain.
// Off (scene straight to the screen) on the low quality level.

const fragmentShader = /* glsl */ `
  uniform sampler2D tScene;
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
      texture2D(tScene, vUv - ca).r,
      texture2D(tScene, vUv).g,
      texture2D(tScene, vUv + ca).b
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

export function createGrade(renderer, antialias) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: antialias ? 4 : 0,
  });
  const material = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: target.texture }, uFrame: { value: 0 }, uNight: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const post = new THREE.Scene();
  post.add(quad);
  const postCamera = new THREE.Camera();
  const size = new THREE.Vector2();
  let on = true;
  renderer.info.autoReset = false; // so ?debug counts the scene, not just the last pass

  return {
    setEnabled(value) {
      on = value;
    },
    render(scene, camera, night = 0) {
      renderer.info.reset();
      if (!on) {
        renderer.render(scene, camera);
        return;
      }
      renderer.getDrawingBufferSize(size);
      if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      material.uniforms.uFrame.value = (material.uniforms.uFrame.value + 1) % 1000;
      material.uniforms.uNight.value = night;
      renderer.render(post, postCamera);
    },
  };
}
