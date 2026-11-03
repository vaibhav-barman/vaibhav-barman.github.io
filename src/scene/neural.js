/**
 * Neural-network particle field: glowing nodes (one instanced draw call)
 * connected by links (one line-segment draw call) with signal pulses
 * travelling along them. Nodes near the mouse are pushed aside and light up.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from 'three'
import { DISPLACE_GLSL, rng } from './util.js'

export function createNeuralField({ count, linksPerNode, linkDistance, accent, mouse }) {
  const r = rng(7)
  const pos = []
  const heroCount = Math.floor(count * 0.72)
  // Hero cloud: a wide, shallow ellipsoid behind both halves of the hero.
  for (let i = 0; i < heroCount; i++) {
    const u = r() * Math.PI * 2
    const v = Math.acos(2 * r() - 1)
    const rad = Math.cbrt(r())
    pos.push([Math.cos(u) * Math.sin(v) * 9.5 * rad, Math.cos(v) * 4.2 * rad, Math.sin(u) * Math.sin(v) * 4 * rad - 2])
  }
  // A sparse trail along the camera path, for depth while scrolling.
  for (let i = heroCount; i < count; i++) {
    pos.push([(r() - 0.5) * 22, (r() - 0.5) * 9, 2 - r() * 96])
  }
  const seeds = pos.map(() => r())
  const sizes = pos.map((_, i) => (i < heroCount ? 0.05 + r() * 0.07 : 0.045 + r() * 0.05) * (r() < 0.07 ? 1.9 : 1))

  // Links: each node connects to a few nearest neighbours.
  const links = []
  const maxD2 = linkDistance * linkDistance
  for (let i = 0; i < pos.length; i++) {
    const near = []
    for (let j = i + 1; j < pos.length; j++) {
      const dx = pos[i][0] - pos[j][0]
      const dy = pos[i][1] - pos[j][1]
      const dz = pos[i][2] - pos[j][2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 < maxD2) near.push([j, d2])
    }
    near.sort((a, b) => a[1] - b[1])
    for (const [j] of near.slice(0, linksPerNode)) links.push(i, j)
  }

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: mouse.ndc },
    uMouseOn: { value: 0 },
    uAspect: { value: 1 },
    uRadius: { value: 0.32 },
    uPush: { value: 0.55 },
    uColor: { value: new Color(accent) },
    uIntensity: { value: 1 },
  }

  // ---- nodes: instanced camera-facing quads with a soft glow ----
  const quad = new PlaneGeometry(1, 1)
  const geo = new InstancedBufferGeometry()
  geo.index = quad.index
  geo.setAttribute('position', quad.getAttribute('position'))
  geo.setAttribute('uv', quad.getAttribute('uv'))
  geo.setAttribute('aOffset', new InstancedBufferAttribute(new Float32Array(pos.flat()), 3))
  geo.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(seeds), 1))
  geo.setAttribute('aSize', new InstancedBufferAttribute(new Float32Array(sizes), 1))
  geo.instanceCount = pos.length

  const nodeMat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      ${DISPLACE_GLSL}
      attribute vec3 aOffset;
      attribute float aSeed;
      attribute float aSize;
      varying vec2 vUv;
      varying float vGlow;
      varying float vTwinkle;
      void main() {
        float glow;
        vec4 mv = displaced(aOffset, aSeed, glow);
        vGlow = glow;
        vTwinkle = 0.75 + 0.25 * sin(uTime * (0.8 + aSeed) + aSeed * 40.0);
        mv.xy += position.xy * aSize * 4.0 * (1.0 + glow * 0.9);
        vUv = uv;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      varying float vGlow;
      varying float vTwinkle;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        if (r > 1.0) discard;
        float core = smoothstep(0.24, 0.0, r);
        float halo = exp(-r * r * 9.0) * 0.28;
        float a = (core + halo) * (0.5 + vGlow * 1.3) * vTwinkle * uIntensity;
        vec3 col = mix(uColor, vec3(1.0), core * (0.35 + vGlow * 0.5));
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  })
  const nodes = new Mesh(geo, nodeMat)
  nodes.frustumCulled = false

  // ---- links: line segments with travelling pulses ----
  const n = links.length / 2
  const lp = new Float32Array(n * 6)
  const ls = new Float32Array(n * 2)
  const la = new Float32Array(n * 2)
  const lk = new Float32Array(n * 2)
  for (let k = 0; k < n; k++) {
    const a = links[k * 2]
    const b = links[k * 2 + 1]
    lp.set([...pos[a], ...pos[b]], k * 6)
    ls[k * 2] = seeds[a]
    ls[k * 2 + 1] = seeds[b]
    la[k * 2] = 0
    la[k * 2 + 1] = 1
    const s = r()
    lk[k * 2] = s
    lk[k * 2 + 1] = s
  }
  const lineGeo = new BufferGeometry()
  lineGeo.setAttribute('position', new BufferAttribute(lp, 3))
  lineGeo.setAttribute('aSeed', new BufferAttribute(ls, 1))
  lineGeo.setAttribute('aAlong', new BufferAttribute(la, 1))
  lineGeo.setAttribute('aLink', new BufferAttribute(lk, 1))
  const lineMat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      ${DISPLACE_GLSL}
      attribute float aSeed;
      attribute float aAlong;
      attribute float aLink;
      varying float vAlong;
      varying float vLink;
      varying float vGlow;
      varying float vDepth;
      void main() {
        float glow;
        vec4 mv = displaced(position, aSeed, glow);
        vGlow = glow;
        vAlong = aAlong;
        vLink = aLink;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uIntensity;
      varying float vAlong;
      varying float vLink;
      varying float vGlow;
      varying float vDepth;
      void main() {
        float speed = 0.18 + vLink * 0.25;
        float head = fract(uTime * speed + vLink * 17.0);
        float pulse = smoothstep(0.12, 0.0, abs(vAlong - head)) * step(0.55, fract(vLink * 7.3));
        float fade = clamp(1.4 - vDepth / 26.0, 0.0, 1.0);
        float a = (0.07 + vGlow * 0.6 + pulse * 0.65) * fade * uIntensity;
        gl_FragColor = vec4(mix(uColor, vec3(1.0), pulse * 0.3), a);
        #include <colorspace_fragment>
      }`,
  })
  const lines = new LineSegments(lineGeo, lineMat)
  lines.frustumCulled = false

  const group = new Group()
  group.add(lines, nodes)

  return {
    group,
    uniforms,
    setAccent: (c) => uniforms.uColor.value.set(c),
    update(dt, { aspect, mouseOn }) {
      uniforms.uTime.value += dt
      uniforms.uAspect.value = aspect
      uniforms.uMouseOn.value = mouseOn
    },
    dispose() {
      quad.dispose()
      geo.dispose()
      lineGeo.dispose()
      nodeMat.dispose()
      lineMat.dispose()
    },
  }
}

export const mouseState = () => ({ ndc: new Vector2(0, 0), on: 0, target: 0 })
