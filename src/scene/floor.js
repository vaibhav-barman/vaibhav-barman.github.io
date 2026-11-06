/**
 * The floor: a slowly undulating field of dots (a "latent space") in the
 * secondary colour, with a faint wave that lights them in the accent as it
 * rolls toward the viewer. One draw call (points).
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three'

export function createFloor({ accent, secondary, mobile = false, y = -3.6, pixelRatio = 1 }) {
  const step = mobile ? 1.25 : 0.85
  const pts = []
  for (let z = 10; z > -112; z -= step) for (let x = -30; x <= 30; x += step) pts.push(x, y, z)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))
  const uniforms = {
    uColor: { value: new Color(accent) },
    uColor2: { value: new Color(secondary) },
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uPixelRatio: { value: pixelRatio },
  }
  const mat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vFade;
      varying float vScan;
      void main() {
        vec3 p = position;
        p.y += sin(p.x * 0.22 + uTime * 0.35) * 0.22 + cos(p.z * 0.16 - uTime * 0.25) * 0.28;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float depth = -mv.z;
        float wave = fract(p.z * 0.02 + uTime * 0.05);
        vScan = smoothstep(0.07, 0.0, abs(wave - 0.5));
        vFade = exp(-depth * 0.05) * smoothstep(32.0, 12.0, abs(p.x)) * smoothstep(2.5, 8.0, depth);
        gl_PointSize = clamp(24.0 * uPixelRatio * (1.0 + vScan * 0.8) / max(depth, 0.5), 1.0, 5.0 * uPixelRatio);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColor2;
      uniform float uIntensity;
      varying float vFade;
      varying float vScan;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.1, d) * vFade * (0.32 + vScan * 0.8) * uIntensity;
        gl_FragColor = vec4(mix(uColor2, uColor, vScan), a);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new Points(geo, mat)
  mesh.frustumCulled = false
  return {
    mesh,
    uniforms,
    setAccent: (c) => uniforms.uColor.value.set(c),
    setPixelRatio: (pr) => (uniforms.uPixelRatio.value = pr),
    update(dt) {
      uniforms.uTime.value += dt
    },
    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}
