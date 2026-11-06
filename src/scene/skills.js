/**
 * The skill graph: one hub per category with its skills orbiting it, and
 * the projects in the middle. Hovering a skill chip (or `skills <group>` in
 * the terminal) lights the skill, its hub, and the projects that use it,
 * with the links between them. Hub labels sit outside the ring so they
 * never overlap; project labels appear only when lit.
 * Instanced glowing nodes plus one line-segment draw call.
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
import { theme } from '../theme.js'
import { labelCanvas, makeTexture } from './text.js'
import { damp, rng } from './util.js'

const RX = 2.05
const RY = 1.0

export function createSkillCluster({ groups, projects = [], accent, secondary = theme.secondary }) {
  const r = rng(11)
  const color = new Color(accent)
  const color2 = new Color(secondary)
  const pts = [] // { x, y, z, size, kind: 'hub'|'skill'|'project', group, slug, name, tone }
  const lines = [] // [a, b, kind] kind 0 = structure, 1 = project link
  const G = groups.length
  groups.forEach((g, gi) => {
    const a = (gi / G) * Math.PI * 2 + Math.PI / 2
    const hub = { x: Math.cos(a) * RX, y: Math.sin(a) * RY, z: Math.sin(a) * 0.6, size: 0.2, kind: 'hub', group: g.slug, slug: null, name: g.name, tone: 0, angle: a }
    const hi = pts.push(hub) - 1
    g.skills.forEach((s, si) => {
      const t = (si / Math.max(1, g.skills.length)) * Math.PI * 2 + r()
      const rad = 0.36 + r() * 0.16
      const pi =
        pts.push({ x: hub.x + Math.cos(t) * rad, y: hub.y + Math.sin(t) * rad * 0.8, z: hub.z + (r() - 0.5) * 0.4, size: 0.08, kind: 'skill', group: g.slug, slug: s.slug, tone: 0 }) - 1
      lines.push([hi, pi, 0])
    })
  })
  const hubs = pts.map((p, i) => (p.kind === 'hub' ? i : -1)).filter((i) => i >= 0)
  hubs.forEach((h, i) => lines.push([h, hubs[(i + 1) % hubs.length], 0]))

  // Projects on a small inner ring, linked to every skill they use.
  const used = projects.filter((p) => p.tags.length)
  used.forEach((p, k) => {
    const a = (k / Math.max(1, used.length)) * Math.PI * 2
    const pi = pts.push({ x: Math.cos(a) * 0.8, y: Math.sin(a) * 0.36, z: 0.35, size: 0.075, kind: 'project', slug: p.slug, name: p.title, tone: 1 }) - 1
    pts.forEach((q, qi) => {
      if (q.kind === 'skill' && p.tags.some((tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === q.slug)) lines.push([pi, qi, 1])
    })
  })

  const uniforms = { uColor: { value: color }, uColor2: { value: color2 }, uTime: { value: 0 } }

  const quad = new PlaneGeometry(1, 1)
  const geo = new InstancedBufferGeometry()
  geo.index = quad.index
  geo.setAttribute('position', quad.getAttribute('position'))
  geo.setAttribute('uv', quad.getAttribute('uv'))
  geo.setAttribute('aOffset', new InstancedBufferAttribute(new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3))
  geo.setAttribute('aSize', new InstancedBufferAttribute(new Float32Array(pts.map((p) => p.size)), 1))
  geo.setAttribute('aTone', new InstancedBufferAttribute(new Float32Array(pts.map((p) => p.tone)), 1))
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
      attribute float aTone;
      varying vec2 vUv;
      varying float vLit;
      varying float vTone;
      void main() {
        vec3 p = aOffset + vec3(0.0, sin(uTime * 0.8 + aOffset.x * 3.0) * 0.03, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        mv.xy += position.xy * aSize * (1.0 + aLit * 0.8) * 2.4;
        vUv = uv;
        vLit = aLit;
        vTone = aTone;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColor2;
      varying vec2 vUv;
      varying float vLit;
      varying float vTone;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        if (r > 1.0) discard;
        float core = smoothstep(0.32, 0.0, r);
        float halo = exp(-r * r * 6.0) * 0.4;
        // project nodes (tone 1) stay quiet until lit
        float base = mix(0.6, 0.35, vTone);
        float a = (core + halo) * (base + vLit * 1.2);
        vec3 c = mix(uColor, uColor2, vTone * (1.0 - vLit));
        gl_FragColor = vec4(mix(c, vec3(1.0), core * (0.3 + vLit * 0.5)), a);
        #include <colorspace_fragment>
      }`,
  })
  const nodes = new Mesh(geo, nodeMat)
  nodes.frustumCulled = false

  const lp = new Float32Array(lines.length * 6)
  const ll = new Float32Array(lines.length * 2)
  const lkind = new Float32Array(lines.length * 2)
  lines.forEach(([a, b, kind], k) => {
    lp.set([pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z], k * 6)
    lkind[k * 2] = lkind[k * 2 + 1] = kind
  })
  const lineGeo = new BufferGeometry()
  lineGeo.setAttribute('position', new BufferAttribute(lp, 3))
  const lineLit = new BufferAttribute(ll, 1)
  lineGeo.setAttribute('aLit', lineLit)
  lineGeo.setAttribute('aKind', new BufferAttribute(lkind, 1))
  const lineMat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aLit;
      attribute float aKind;
      varying float vLit;
      varying float vKind;
      void main() {
        vLit = aLit;
        vKind = aKind;
        vec3 p = position + vec3(0.0, sin(uTime * 0.8 + position.x * 3.0) * 0.03, 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColor2;
      varying float vLit;
      varying float vKind;
      void main() {
        // structure links always show; project links only when lit
        float a = mix(0.22, 0.035, vKind) + vLit * 0.62;
        gl_FragColor = vec4(mix(uColor, uColor2, vKind * (1.0 - vLit)), a);
        #include <colorspace_fragment>
      }`,
  })
  const linesMesh = new LineSegments(lineGeo, lineMat)
  linesMesh.frustumCulled = false

  const inner = new Group()
  inner.add(linesMesh, nodes)

  // Labels: hubs outside the ring (always shown), projects next to their node (shown when lit).
  let labels = []
  function makeLabels() {
    for (const l of labels) {
      inner.remove(l.sprite)
      l.tex.dispose()
      l.sprite.material.dispose()
    }
    labels = []
    pts.forEach((p, i) => {
      if (p.kind === 'skill') return
      const isHub = p.kind === 'hub'
      const c = labelCanvas(p.name, { size: isHub ? 40 : 36, color: isHub ? theme.text : '#ffffff' })
      const tex = makeTexture(c)
      const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: isHub ? 0.9 : 0 }))
      const h = isHub ? 0.15 : 0.13
      sprite.scale.set((c.width / c.height) * h, h, 1)
      if (isHub) {
        // Push the label outward from the ring centre, and away from the hub sideways.
        const dx = Math.cos(p.angle)
        const dy = Math.sin(p.angle)
        sprite.position.set(p.x + dx * 0.62 + Math.sign(dx) * sprite.scale.x * 0.28, p.y + dy * 0.5 + (Math.abs(dy) > 0.9 ? Math.sign(dy) * 0.04 : 0), p.z)
      } else sprite.position.set(p.x, p.y + 0.15, p.z + 0.05)
      inner.add(sprite)
      labels.push({ sprite, tex, i, isHub })
    })
  }
  makeLabels()

  const group = new Group()
  group.add(inner)

  const target = new Float32Array(pts.length)
  const lineTarget = new Float32Array(lines.length)
  let hoverSkill = null
  let hoverGroup = null
  let hoverProject = null
  function retarget() {
    target.fill(0)
    lineTarget.fill(0)
    const litSkill = new Set()
    pts.forEach((p, i) => {
      if ((hoverSkill && p.slug === hoverSkill && p.kind === 'skill') || (hoverGroup && p.group === hoverGroup)) {
        target[i] = 1
        if (p.kind === 'skill') litSkill.add(i)
      }
    })
    const pi = hoverProject ? pts.findIndex((p) => p.kind === 'project' && p.slug === hoverProject) : -1
    if (hoverProject) {
      if (pi >= 0) target[pi] = 1
      lines.forEach(([a, b, kind]) => {
        if (kind === 1 && a === pi) {
          target[b] = 1
          litSkill.add(b)
        }
      })
    }
    lines.forEach(([a, b, kind], k) => {
      if (kind === 0 && target[a] && target[b]) lineTarget[k] = 1
      if (kind === 0 && pts[a].kind === 'hub' && litSkill.has(b)) {
        lineTarget[k] = 1
        target[a] = Math.max(target[a], 0.7)
      }
      // A lit skill lights the projects that use it and the links between them
      // (while a project is hovered, only that project's links).
      if (kind === 1 && litSkill.has(b) && (pi < 0 || a === pi)) {
        lineTarget[k] = 1
        target[a] = 1
      }
    })
  }

  return {
    group,
    fitHeight: 3.4,
    fitWidth: 7.0,
    setAccent: (c) => color.set(c),
    refreshText: makeLabels,
    hoverSkill(slug) {
      hoverSkill = slug
      retarget()
    },
    highlightGroup(slug) {
      hoverGroup = slug
      retarget()
    },
    hoverProject(slug) {
      hoverProject = slug
      retarget()
    },
    update(dt, time, pointer) {
      uniforms.uTime.value = time
      inner.rotation.y = Math.sin(time * 0.15) * 0.3 + pointer.x * 0.22
      inner.rotation.x = -0.12 + pointer.y * 0.1
      let changed = false
      const k = damp(8, dt)
      for (let i = 0; i < pts.length; i++) {
        const v = lit[i] + (target[i] - lit[i]) * k
        if (Math.abs(v - lit[i]) > 1e-3) changed = true
        lit[i] = v
      }
      for (let j = 0; j < lines.length; j++) {
        const v = ll[j * 2] + (lineTarget[j] - ll[j * 2]) * k
        if (Math.abs(v - ll[j * 2]) > 1e-3) changed = true
        ll[j * 2] = ll[j * 2 + 1] = v
      }
      if (changed) {
        litAttr.needsUpdate = true
        lineLit.needsUpdate = true
        for (const l of labels) if (!l.isHub) l.sprite.material.opacity = lit[l.i]
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
