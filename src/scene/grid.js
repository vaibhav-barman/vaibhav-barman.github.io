/** A subtle glowing grid floor that fades into the fog. One draw call. */
import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from 'three'

export function createGrid({ accent, y = -3.6 }) {
  const geo = new PlaneGeometry(80, 220, 1, 1)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, y, -70)
  const uniforms = { uColor: { value: new Color(accent) }, uTime: { value: 0 }, uIntensity: { value: 1 } }
  const mat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mv = viewMatrix * world;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uIntensity;
      varying vec3 vWorld;
      varying float vDepth;
      float grid(vec2 p, float size) {
        vec2 q = p / size;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        float minor = grid(vWorld.xz, 1.0) * 0.35;
        float major = grid(vWorld.xz, 5.0);
        float fade = exp(-vDepth * 0.055) * smoothstep(40.0, 10.0, abs(vWorld.x));
        // a slow scan line sweeping toward the viewer
        float scan = smoothstep(1.2, 0.0, abs(fract(vWorld.z * 0.02 + uTime * 0.05) - 0.5) * 20.0) * 0.6;
        float a = max(minor, major) * (0.15 + scan * 0.8) * fade * uIntensity;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new Mesh(geo, mat)
  mesh.frustumCulled = false
  return {
    mesh,
    setAccent: (c) => uniforms.uColor.value.set(c),
    update(dt) {
      uniforms.uTime.value += dt
    },
    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}
