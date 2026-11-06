/**
 * Neural-network particle field: glowing nodes (one instanced draw call per
 * part) connected by links (one line-segment draw call per part) with signal
 * pulses travelling along them. Nodes near the mouse are pushed aside and light up.
 *
 * Two parts:
 *  - the story network (accent colour) travels with the camera and changes
 *    shape per section (see story.js). Positions are blended on the CPU only
 *    while the shape is changing: a few hundred points, so it is cheap.
 *  - a sparse trail (secondary colour) stays fixed in the world along the
 *    camera path, so scrolling still feels like moving forward.
 *
 * Nodes and links fade behind page text (textMask) and light up in a ring
 * when a terminal command runs (burstGlow).
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector4,
} from 'three'
import { STATES, storyShapes } from './story.js'
import { DISPLACE_GLSL, MASK_GLSL, MAX_MASKS, rng } from './util.js'

const NODE_VERT = /* glsl */ `
  ${DISPLACE_GLSL}
  attribute vec3 aOffset;
  attribute float aSeed;
  attribute float aSize;
  attribute float aTone;
  varying vec2 vUv;
  varying float vGlow;
  varying float vTwinkle;
  varying float vFade;
  varying float vTone;
  void main() {
    float glow;
    vec2 ndc;
    vec4 mv = displaced(aOffset, aSeed, glow, ndc);
    glow += burstGlow(ndc) * 1.6;
    vGlow = glow;
    vTone = aTone;
    vFade = smoothstep(0.8, 4.0, -mv.z) * clamp(1.5 - (-mv.z) / 30.0, 0.0, 1.0);
    vTwinkle = 0.75 + 0.25 * sin(uTime * (0.8 + aSeed) + aSeed * 40.0);
    mv.xy += position.xy * aSize * 4.0 * (1.0 + glow * 0.9);
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }`

const NODE_FRAG = /* glsl */ `
  ${MASK_GLSL}
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vGlow;
  varying float vTwinkle;
  varying float vFade;
  varying float vTone;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = smoothstep(0.24, 0.0, r);
    float halo = exp(-r * r * 9.0) * 0.28;
    float a = (core + halo) * (0.5 + vGlow * 1.3) * vTwinkle * vFade * uIntensity * textMask();
    vec3 base = mix(uColor, uColor2, vTone);
    vec3 col = mix(base, vec3(1.0), core * (0.35 + vGlow * 0.5));
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }`

const LINK_VERT = /* glsl */ `
  ${DISPLACE_GLSL}
  attribute float aSeed;
  attribute float aAlong;
  attribute float aLink;
  attribute float aFade;
  attribute float aTone;
  varying float vAlong;
  varying float vLink;
  varying float vGlow;
  varying float vDepth;
  varying float vFadeIn;
  varying float vTone;
  void main() {
    float glow;
    vec2 ndc;
    vec4 mv = displaced(position, aSeed, glow, ndc);
    vGlow = glow + burstGlow(ndc) * 1.2;
    vAlong = aAlong;
    vLink = aLink;
    vDepth = -mv.z;
    vFadeIn = aFade;
    vTone = aTone;
    gl_Position = projectionMatrix * mv;
  }`

const LINK_FRAG = /* glsl */ `
  ${MASK_GLSL}
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulseBoost;
  varying float vAlong;
  varying float vLink;
  varying float vGlow;
  varying float vDepth;
  varying float vFadeIn;
  varying float vTone;
  void main() {
    if (vFadeIn < 0.002) discard;
    float speed = (0.18 + vLink * 0.25) * (1.0 + uPulseBoost * 2.0);
    float head = fract(uTime * speed + vLink * 17.0);
    float pulse = smoothstep(0.12, 0.0, abs(vAlong - head)) * step(0.55 - uPulseBoost * 0.4, fract(vLink * 7.3));
    float fade = clamp(1.4 - vDepth / 26.0, 0.0, 1.0) * smoothstep(0.8, 4.0, vDepth);
    float a = (0.07 + vGlow * 0.6 + pulse * 0.65) * fade * uIntensity * vFadeIn * textMask();
    vec3 base = mix(uColor, uColor2, vTone);
    gl_FragColor = vec4(mix(base, vec3(1.0), pulse * 0.3), a);
    #include <colorspace_fragment>
  }`

function makeNodes(quad, uniforms, { offsets, seeds, sizes, tone, dynamic }) {
  const n = seeds.length
  const geo = new InstancedBufferGeometry()
  geo.index = quad.index
  geo.setAttribute('position', quad.getAttribute('position'))
  geo.setAttribute('uv', quad.getAttribute('uv'))
  const offsetAttr = new InstancedBufferAttribute(offsets, 3)
  if (dynamic) offsetAttr.setUsage(DynamicDrawUsage)
  geo.setAttribute('aOffset', offsetAttr)
  geo.setAttribute('aSeed', new InstancedBufferAttribute(Float32Array.from(seeds), 1))
  geo.setAttribute('aSize', new InstancedBufferAttribute(Float32Array.from(sizes), 1))
  geo.setAttribute('aTone', new InstancedBufferAttribute(new Float32Array(n).fill(tone), 1))
  geo.instanceCount = n
  const mat = new ShaderMaterial({ uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending, vertexShader: NODE_VERT, fragmentShader: NODE_FRAG })
  const mesh = new Mesh(geo, mat)
  mesh.frustumCulled = false
  return { mesh, geo, mat, offsetAttr }
}

/** pairs: [[a, b], ...] into `positions` (Float32Array n*3). */
function makeLinks(uniforms, { positions, pairs, seeds, tone, r, dynamic }) {
  const m = pairs.length
  const lp = new Float32Array(m * 6)
  const ls = new Float32Array(m * 2)
  const la = new Float32Array(m * 2)
  const lk = new Float32Array(m * 2)
  const lf = new Float32Array(m * 2).fill(1)
  pairs.forEach(([a, b], k) => {
    lp.set(positions.subarray(a * 3, a * 3 + 3), k * 6)
    lp.set(positions.subarray(b * 3, b * 3 + 3), k * 6 + 3)
    ls[k * 2] = seeds[a]
    ls[k * 2 + 1] = seeds[b]
    la[k * 2 + 1] = 1
    lk[k * 2] = lk[k * 2 + 1] = r()
  })
  const geo = new BufferGeometry()
  const posAttr = new BufferAttribute(lp, 3)
  const fadeAttr = new BufferAttribute(lf, 1)
  if (dynamic) {
    posAttr.setUsage(DynamicDrawUsage)
    fadeAttr.setUsage(DynamicDrawUsage)
  }
  geo.setAttribute('position', posAttr)
  geo.setAttribute('aSeed', new BufferAttribute(ls, 1))
  geo.setAttribute('aAlong', new BufferAttribute(la, 1))
  geo.setAttribute('aLink', new BufferAttribute(lk, 1))
  geo.setAttribute('aFade', fadeAttr)
  geo.setAttribute('aTone', new BufferAttribute(new Float32Array(m * 2).fill(tone), 1))
  const mat = new ShaderMaterial({ uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending, vertexShader: LINK_VERT, fragmentShader: LINK_FRAG })
  const lines = new LineSegments(geo, mat)
  lines.frustumCulled = false
  return { lines, geo, mat, posAttr, fadeAttr }
}

export function createNeuralField({ count, linksPerNode, linkDistance, accent, secondary, mouse, narrow = false }) {
  const r = rng(7)
  const storyCount = Math.floor(count * 0.72)
  const trailCount = count - storyCount

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: mouse.ndc },
    uMouseOn: { value: 0 },
    uAspect: { value: 1 },
    uRadius: { value: 0.32 },
    uPush: { value: 0.55 },
    uColor: { value: new Color(accent) },
    uColor2: { value: new Color(secondary) },
    uIntensity: { value: 1 },
    uMask: { value: Array.from({ length: MAX_MASKS }, () => new Vector4()) },
    uMaskCount: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uBurst: { value: -1 },
    uBurstOrigin: { value: new Vector2() },
    uPulseBoost: { value: 0 },
  }
  const quad = new PlaneGeometry(1, 1)

  // ---- story network: follows the camera, changes shape per section ----
  const story = storyShapes(storyCount, { narrow, linkDistance, linksPerNode })
  const storySeeds = Array.from({ length: storyCount }, () => r())
  const storySizes = storySeeds.map(() => (0.05 + r() * 0.07) * (r() < 0.07 ? 1.9 : 1))
  const current = Float32Array.from(story.positions.cloud)
  const sNodes = makeNodes(quad, uniforms, { offsets: current, seeds: storySeeds, sizes: storySizes, tone: 0, dynamic: true })
  const sLinks = makeLinks(uniforms, { positions: current, pairs: story.links.map((l) => [l.a, l.b]), seeds: storySeeds, tone: 0, r, dynamic: true })
  const storyGroup = new Group()
  storyGroup.add(sLinks.lines, sNodes.mesh)

  // ---- trail: sparse, fixed in the world along the camera path ----
  const trailPos = new Float32Array(trailCount * 3)
  for (let i = 0; i < trailCount; i++) trailPos.set([(r() - 0.5) * 22, (r() - 0.5) * 9, 2 - r() * 96], i * 3)
  const trailSeeds = Array.from({ length: trailCount }, () => r())
  const trailSizes = trailSeeds.map(() => (0.045 + r() * 0.05) * (r() < 0.07 ? 1.9 : 1))
  const trailPairs = []
  {
    const max2 = linkDistance * linkDistance * 1.6
    for (let i = 0; i < trailCount; i++) {
      const near = []
      for (let j = i + 1; j < trailCount; j++) {
        const dx = trailPos[i * 3] - trailPos[j * 3]
        const dy = trailPos[i * 3 + 1] - trailPos[j * 3 + 1]
        const dz = trailPos[i * 3 + 2] - trailPos[j * 3 + 2]
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 < max2) near.push([j, d2])
      }
      near.sort((a, b) => a[1] - b[1])
      for (const [j] of near.slice(0, 2)) trailPairs.push([i, j])
    }
  }
  const tNodes = makeNodes(quad, uniforms, { offsets: trailPos, seeds: trailSeeds, sizes: trailSizes, tone: 1, dynamic: false })
  const tLinks = makeLinks(uniforms, { positions: trailPos, pairs: trailPairs, seeds: trailSeeds, tone: 1, r, dynamic: false })

  const group = new Group()
  group.add(tLinks.lines, tNodes.mesh, storyGroup)

  // ---- shape blending ----
  const S = STATES.length
  const applied = new Float32Array(S).fill(-1)
  const P = STATES.map((s) => story.positions[s])
  const linkPos = sLinks.posAttr.array
  const linkFade = sLinks.fadeAttr.array
  function blend(weights) {
    let changed = false
    for (let s = 0; s < S; s++) if (Math.abs(weights[s] - applied[s]) > 1e-4) changed = true
    if (!changed) return
    applied.set(weights)
    current.fill(0)
    for (let s = 0; s < S; s++) {
      const w = weights[s]
      if (w < 1e-4) continue
      const src = P[s]
      for (let i = 0; i < current.length; i++) current[i] += src[i] * w
    }
    story.links.forEach((l, k) => {
      linkPos.set(current.subarray(l.a * 3, l.a * 3 + 3), k * 6)
      linkPos.set(current.subarray(l.b * 3, l.b * 3 + 3), k * 6 + 3)
      let f = 0
      for (let s = 0; s < S; s++) f += l.mask[s] * weights[s]
      linkFade[k * 2] = linkFade[k * 2 + 1] = f
    })
    sNodes.offsetAttr.needsUpdate = true
    sLinks.posAttr.needsUpdate = true
    sLinks.fadeAttr.needsUpdate = true
  }
  blend(Float32Array.from(STATES, (s) => (s === 'cloud' ? 1 : 0)))

  return {
    group,
    uniforms,
    setAccent: (c) => uniforms.uColor.value.set(c),
    /** Text rectangles (NDC) to fade behind: [[minX, minY, maxX, maxY], ...] */
    setMasks(rects) {
      const n = Math.min(MAX_MASKS, rects.length)
      for (let i = 0; i < n; i++) uniforms.uMask.value[i].set(...rects[i])
      uniforms.uMaskCount.value = n
    },
    /** Start a ripple from `ndc` (a Vector2-like { x, y }). */
    /** Drawing-buffer size in px (for the per-pixel text mask). */
    setResolution(w, h) {
      uniforms.uResolution.value.set(w, h)
    },
    burst(ndc) {
      uniforms.uBurstOrigin.value.set(ndc.x, ndc.y)
      uniforms.uBurst.value = 0
    },
    update(dt, { aspect, mouseOn, weights, anchor }) {
      uniforms.uTime.value += dt
      uniforms.uAspect.value = aspect
      uniforms.uMouseOn.value = mouseOn
      if (uniforms.uBurst.value >= 0) {
        uniforms.uBurst.value += dt
        if (uniforms.uBurst.value > 3) uniforms.uBurst.value = -1
      }
      // Pulses speed up for a moment after a command.
      const b = uniforms.uBurst.value
      uniforms.uPulseBoost.value = b < 0 ? 0 : Math.max(0, 1 - b / 2.5)
      if (anchor) storyGroup.position.copy(anchor)
      if (weights) blend(weights)
    },
    dispose() {
      quad.dispose()
      for (const x of [sNodes, tNodes]) {
        x.geo.dispose()
        x.mat.dispose()
      }
      for (const x of [sLinks, tLinks]) {
        x.geo.dispose()
        x.mat.dispose()
      }
    },
  }
}

export const mouseState = () => ({ ndc: new Vector2(0, 0), on: 0, target: 0 })
