/**
 * The skill graph: one hub per category with its skills orbiting it,
 * all drawn as instanced glowing nodes plus one line-segment draw call.
 * Hovering a chip (or `skills <group>` in the terminal) lights the matching
 * nodes. Hubs carry a text label.
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
  Sprite,
  SpriteMaterial,
} from 'three'
import { labelCanvas, makeTexture } from './text.js'
import { damp, rng } from './util.js'

export function createSkillCluster({ groups, accent }) {
  const r = rng(11)
  const color = new Color(accent)
  const pts = [] // { x, y, z, size, hub, group, slug }
  const lines = []
  const G = groups.length
  groups.forEach((g, gi) => {
    // hubs on a tilted ring
    const a = (gi / G) * Math.PI * 2
    const hub = { x: Math.cos(a) * 1.9, y: Math.sin(a) * 0.95 + (gi % 2 ? 0.15 : -0.15), z: Math.sin(a) * 0.8, size: 0.2, hub: true, group: g.slug, slug: null, name: g.name }
    const hi = pts.push(hub) - 1
    g.skills.forEach((s, si) => {
      const t = (si / Math.max(1, g.skills.length)) * Math.PI * 2 + r()
      const rad = 0.42 + r() * 0.22
      const p = {
        x: hub.x + Math.cos(t) * rad,
        y: hub.y + Math.sin(t) * rad * 0.8,
        z: hub.z + (r() - 0.5) * 0.5,
        size: 0.085,
        hub: false,
        group: g.slug,
        slug: s.slug,
      }
      const pi = pts.push(p) - 1
      lines.push(hi, pi)
    })
  })
  // ring between hubs
  const hubs = pts.map((p, i) => (p.hub ? i : -1)).filter((i) => i >= 0)
  hubs.forEach((h, i) => lines.push(h, hubs[(i + 1) % hubs.length]))

  const uniforms = { uColor: { value: color }, uTime: { value: 0 } }

  const quad = new PlaneGeometry(1, 1)
  const geo = new InstancedBufferGeometry()
  geo.index = quad.index
  geo.setAttribute('position', quad.getAttribute('position'))
  geo.setAttribute('uv', quad.getAttribute('uv'))
  geo.setAttribute('aOffset', new InstancedBufferAttribute(new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3))
  geo.setAttribute('aSize', new InstancedBufferAttribute(new Float32Array(pts.map((p) => p.size)), 1))
  const lit = new Float32Array(pts.length)
  const litAttr = new InstancedBufferAttribute(lit, 1)
  geo.setAttribute('aLit', litAttr)
  geo.instanceCount = pts.length

  const nodeMat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute vec3 aOffset;
      attribute float aSize;
      attribute float aLit;
      varying vec2 vUv;
      varying float vLit;
      void main() {
        vec3 p = aOffset + vec3(0.0, sin(uTime * 0.8 + aOffset.x * 3.0) * 0.03, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        mv.xy += position.xy * aSize * (1.0 + aLit * 0.8) * 2.4;
        vUv = uv;
        vLit = aLit;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vLit;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        if (r > 1.0) discard;
        float core = smoothstep(0.32, 0.0, r);
        float halo = exp(-r * r * 6.0) * 0.4;
        float a = (core + halo) * (0.6 + vLit * 1.2);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), core * (0.3 + vLit * 0.5)), a);
        #include <colorspace_fragment>
      }`,
  })
  const nodes = new Mesh(geo, nodeMat)
  nodes.frustumCulled = false

  const lp = new Float32Array(lines.length * 3)
  const ll = new Float32Array(lines.length)
  lines.forEach((idx, k) => lp.set([pts[idx].x, pts[idx].y, pts[idx].z], k * 3))
  const lineGeo = new BufferGeometry()
  lineGeo.setAttribute('position', new BufferAttribute(lp, 3))
  const lineLit = new BufferAttribute(ll, 1)
  lineGeo.setAttribute('aLit', lineLit)
  const lineMat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aLit;
      varying float vLit;
      void main() {
        vLit = aLit;
        vec3 p = position + vec3(0.0, sin(uTime * 0.8 + position.x * 3.0) * 0.03, 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vLit;
      void main() {
        float a = 0.22 + vLit * 0.6;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  })
  const linesMesh = new LineSegments(lineGeo, lineMat)
  linesMesh.frustumCulled = false

  const inner = new Group()
  inner.add(linesMesh, nodes)
  // Hub labels.
  const labels = pts
    .filter((p) => p.hub)
    .map((p) => {
      const c = labelCanvas(p.name, { size: 40 })
      const tex = makeTexture(c)
      const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 }))
      const h = 0.15
      sprite.scale.set((c.width / c.height) * h, h, 1)
      sprite.position.set(p.x, p.y + 0.3, p.z)
      inner.add(sprite)
      return { sprite, tex, group: p.group }
    })
  const group = new Group()
  group.add(inner)

  const target = new Float32Array(pts.length)
  let hoverSkill = null
  let hoverGroup = null
  function retarget() {
    pts.forEach((p, i) => {
      target[i] = (hoverSkill && p.slug === hoverSkill) || (hoverGroup && p.group === hoverGroup) ? 1 : 0
      if (hoverSkill && p.hub && pts.some((q) => q.slug === hoverSkill && q.group === p.group)) target[i] = 0.7
    })
  }

  return {
    group,
    fitHeight: 3.1,
    fitWidth: 5.6,
    setAccent: (c) => color.set(c),
    hoverSkill(slug) {
      hoverSkill = slug
      retarget()
    },
    highlightGroup(slug) {
      hoverGroup = slug
      retarget()
    },
    update(dt, time, pointer) {
      uniforms.uTime.value = time
      inner.rotation.y = Math.sin(time * 0.15) * 0.35 + pointer.x * 0.25
      inner.rotation.x = -0.15 + pointer.y * 0.12
      let changed = false
      for (let i = 0; i < pts.length; i++) {
        const v = lit[i] + (target[i] - lit[i]) * damp(8, dt)
        if (Math.abs(v - lit[i]) > 1e-3) changed = true
        lit[i] = v
      }
      if (changed) {
        litAttr.needsUpdate = true
        lines.forEach((idx, k) => (ll[k] = lit[idx]))
        lineLit.needsUpdate = true
      }
    },
    dispose() {
      quad.dispose()
      geo.dispose()
      lineGeo.dispose()
      nodeMat.dispose()
      lineMat.dispose()
      labels.forEach((l) => {
        l.tex.dispose()
        l.sprite.material.dispose()
      })
    },
  }
}
