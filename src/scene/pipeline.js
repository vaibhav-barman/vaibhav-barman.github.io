/**
 * "How it works" in the projects stage: each featured project's pipeline
 * (from portfolio.json) as a glowing graph. Pulses run along the chain, and
 * the feedback loop (critic → generator, QA → engineer, ...) is an animated
 * dashed arc. Hovering a project card shows its graph; otherwise the
 * featured projects take turns.
 *
 * Same API as the old holographic cards: { group, fitHeight, fitWidth,
 * setAccent, focus, update, refreshText, dispose }.
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
import { layoutPipeline, quadPoint } from '../data/pipeline-layout.js'
import { wrapLabel } from '../site/pipeline-svg.js'
import { theme } from '../theme.js'
import { FONT_MONO, FONT_SANS, makeTexture } from './text.js'
import { damp } from './util.js'

const SPAN = 4.4 // world units between the first and last column
const UNIT = 1.25 // world units between rows
const LINE_H = 0.155 // world height of one line of label text
const CYCLE_S = 7 // seconds per project when nothing is hovered
const NODE_R = 0.11

function textCanvas(lines, { size = 36, color = theme.text, font = FONT_MONO, weight = 500, align = 'center' } = {}) {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const f = `${weight} ${size}px ${font}`
  ctx.font = f
  const lh = Math.ceil(size * 1.3)
  const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 16
  c.width = w
  c.height = lh * lines.length + 8
  ctx.font = f
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.textAlign = align
  lines.forEach((l, i) => ctx.fillText(l, align === 'center' ? w / 2 : 8, 4 + lh * (i + 0.5)))
  return { canvas: c, perLine: lh }
}

function makeSprite({ canvas, perLine }, lineH) {
  const tex = makeTexture(canvas)
  const mat = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, opacity: 0 })
  const s = new Sprite(mat)
  const k = lineH / perLine
  s.scale.set(canvas.width * k, canvas.height * k, 1)
  return s
}

const NODE_VERT = /* glsl */ `
  uniform float uTime;
  attribute vec3 aOffset;
  attribute float aFirst;
  varying vec2 vUv;
  varying float vFirst;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
    float beat = 1.0 + 0.08 * sin(uTime * 2.0 + aOffset.x * 2.0);
    mv.xy += position.xy * ${(NODE_R * 2.6).toFixed(3)} * beat * (1.0 + aFirst * 0.25);
    vUv = uv;
    vFirst = aFirst;
    gl_Position = projectionMatrix * mv;
  }`
const NODE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vFirst;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    if (r > 1.0) discard;
    float ring = smoothstep(0.1, 0.0, abs(r - 0.42));
    float core = smoothstep(0.3, 0.0, r);
    float halo = exp(-r * r * 5.0) * 0.35;
    float a = (core * (0.55 + vFirst * 0.45) + ring * 0.9 + halo) * uOpacity;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.45), a);
    #include <colorspace_fragment>
  }`
const EDGE_VERT = /* glsl */ `
  attribute float aAlong;
  attribute float aEdge;
  attribute float aLoop;
  varying float vAlong;
  varying float vEdge;
  varying float vLoop;
  void main() {
    vAlong = aAlong;
    vEdge = aEdge;
    vLoop = aLoop;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`
const EDGE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uTime;
  uniform float uOpacity;
  varying float vAlong;
  varying float vEdge;
  varying float vLoop;
  void main() {
    float a;
    vec3 col;
    if (vLoop > 0.5) {
      float dash = step(0.45, fract(vAlong * 12.0 - uTime * 1.4));
      a = 0.2 + 0.75 * dash;
      col = uColor;
    } else {
      // one pulse flows down the chain, edge after edge
      float head = fract(uTime * 0.16) * 6.0 - vEdge;
      float pulse = smoothstep(0.18, 0.0, abs(vAlong - head));
      a = 0.35 + pulse * 0.9;
      col = mix(uColor2, mix(uColor, vec3(1.0), 0.3), pulse);
    }
    gl_FragColor = vec4(col, a * uOpacity);
    #include <colorspace_fragment>
  }`

function buildGraph(p, colors, quad) {
  const perRow = p.pipeline.nodes.length <= 4 ? p.pipeline.nodes.length : Math.ceil(p.pipeline.nodes.length / 2)
  const L = layoutPipeline(p.pipeline, { colGap: SPAN / Math.max(1, perRow - 1) / UNIT })
  const X = (x) => (x - L.width / 2) * UNIT
  const Y = (y) => (L.height / 2 - y) * UNIT - 0.12
  const pos = L.nodes.map((n) => [X(n.x), Y(n.y), 0])

  const uniforms = { uColor: { value: colors.accent }, uColor2: { value: colors.secondary }, uTime: { value: 0 }, uOpacity: { value: 0 } }
  const g = new Group()

  // nodes
  const geo = new InstancedBufferGeometry()
  geo.index = quad.index
  geo.setAttribute('position', quad.getAttribute('position'))
  geo.setAttribute('uv', quad.getAttribute('uv'))
  geo.setAttribute('aOffset', new InstancedBufferAttribute(new Float32Array(pos.flat()), 3))
  geo.setAttribute('aFirst', new InstancedBufferAttribute(Float32Array.from(pos, (_, i) => (i === 0 ? 1 : 0)), 1))
  geo.instanceCount = pos.length
  const nodeMat = new ShaderMaterial({ uniforms, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, vertexShader: NODE_VERT, fragmentShader: NODE_FRAG })
  const nodes = new Mesh(geo, nodeMat)
  nodes.frustumCulled = false

  // edges: the chain, then the loop as a curve
  const P = []
  const along = []
  const edgeIdx = []
  const isLoop = []
  L.edges.forEach(({ from, to }, k) => {
    const [ax, ay] = pos[from]
    const [bx, by] = pos[to]
    const len = Math.hypot(bx - ax, by - ay)
    const ux = (bx - ax) / len
    const uy = (by - ay) / len
    P.push(ax + ux * NODE_R * 1.3, ay + uy * NODE_R * 1.3, 0, bx - ux * NODE_R * 1.3, by - uy * NODE_R * 1.3, 0)
    along.push(0, 1)
    edgeIdx.push(k, k)
    isLoop.push(0, 0)
  })
  let loopLabel = null
  if (L.loop) {
    const [ax, ay] = pos[L.loop.from]
    const [bx, by] = pos[L.loop.to]
    const cx = X(L.loop.cx)
    const cy = Y(L.loop.cy)
    const SEG = 32
    const t0 = 0.08
    const t1 = 0.92
    for (let s = 0; s < SEG; s++) {
      const ta = t0 + ((t1 - t0) * s) / SEG
      const tb = t0 + ((t1 - t0) * (s + 1)) / SEG
      P.push(...quadPoint(ax, ay, cx, cy, bx, by, ta), 0, ...quadPoint(ax, ay, cx, cy, bx, by, tb), 0)
      along.push(ta, tb)
      edgeIdx.push(0, 0)
      isLoop.push(1, 1)
    }
    loopLabel = { at: quadPoint(ax, ay, cx, cy, bx, by, 0.5), text: L.loop.label }
  }
  const edgeGeo = new BufferGeometry()
  edgeGeo.setAttribute('position', new BufferAttribute(new Float32Array(P), 3))
  edgeGeo.setAttribute('aAlong', new BufferAttribute(new Float32Array(along), 1))
  edgeGeo.setAttribute('aEdge', new BufferAttribute(new Float32Array(edgeIdx), 1))
  edgeGeo.setAttribute('aLoop', new BufferAttribute(new Float32Array(isLoop), 1))
  const edgeMat = new ShaderMaterial({ uniforms, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, vertexShader: EDGE_VERT, fragmentShader: EDGE_FRAG })
  const edges = new LineSegments(edgeGeo, edgeMat)
  edges.frustumCulled = false
  g.add(edges, nodes)

  const top = Y(0) + 0.62
  const left = X(0) - 0.35
  const makeText = (accent) => {
    const sprites = []
    L.nodes.forEach((n, i) => {
      const s = makeSprite(textCanvas(wrapLabel(n.label, 16), { size: 34 }), LINE_H)
      s.position.set(pos[i][0], pos[i][1] - NODE_R - 0.08 - s.scale.y / 2, 0)
      sprites.push(s)
    })
    if (loopLabel?.text) {
      const s = makeSprite(textCanvas([loopLabel.text], { size: 32, color: accent, weight: 700 }), LINE_H * 0.95)
      const outward = loopLabel.at[1] > 0 ? 0.12 : -0.12
      s.position.set(loopLabel.at[0], loopLabel.at[1] + outward, 0)
      sprites.push(s)
    }
    const title = makeSprite(textCanvas([`${String(p.index).padStart(2, '0')}  ${p.title}`], { size: 44, color: '#ffffff', font: FONT_SANS, weight: 700, align: 'left' }), LINE_H * 1.45)
    title.position.set(left + title.scale.x / 2, top, 0)
    const sub = makeSprite(textCanvas([`${p.categoryLabel.toLowerCase()} · how it works`], { size: 30, color: theme.secondary, align: 'left' }), LINE_H * 0.85)
    sub.position.set(left + sub.scale.x / 2, top - 0.22, 0)
    sprites.push(title, sub)
    return sprites
  }

  let sprites = makeText(colors.accentHex)
  g.add(...sprites)
  return {
    p,
    group: g,
    uniforms,
    opacity: 0,
    get sprites() {
      return sprites
    },
    redraw(accentHex) {
      for (const s of sprites) {
        g.remove(s)
        s.material.map.dispose()
        s.material.dispose()
      }
      sprites = makeText(accentHex)
      g.add(...sprites)
    },
    dispose() {
      geo.dispose()
      edgeGeo.dispose()
      nodeMat.dispose()
      edgeMat.dispose()
      for (const s of sprites) {
        s.material.map.dispose()
        s.material.dispose()
      }
    },
  }
}

export function createPipelines({ projects, accent, secondary }) {
  const quad = new PlaneGeometry(1, 1)
  const colors = { accent: new Color(accent), secondary: new Color(secondary), accentHex: accent }
  const graphs = projects.filter((p) => p.featured && p.pipeline).map((p) => buildGraph(p, colors, quad))
  const group = new Group()
  for (const gr of graphs) group.add(gr.group)

  let focused = null
  let auto = 0
  let clock = 0
  return {
    group,
    fitHeight: 3.0,
    fitWidth: 5.9,
    setAccent(c) {
      colors.accent.set(c)
      colors.accentHex = c
      graphs.forEach((gr) => gr.redraw(c))
    },
    /** Redraw labels once the web fonts have loaded. */
    refreshText() {
      graphs.forEach((gr) => gr.redraw(colors.accentHex))
    },
    focus(slug) {
      const i = graphs.findIndex((gr) => gr.p.slug === slug)
      if (i >= 0) {
        focused = i
        auto = i
        clock = 0
      } else focused = null
    },
    update(dt, time) {
      if (!graphs.length) return
      if (focused === null) {
        clock += dt
        if (clock > CYCLE_S) {
          clock = 0
          auto = (auto + 1) % graphs.length
        }
      }
      const active = focused ?? auto
      graphs.forEach((gr, i) => {
        gr.opacity += ((i === active ? 1 : 0) - gr.opacity) * damp(5, dt)
        gr.group.visible = gr.opacity > 0.01
        gr.uniforms.uOpacity.value = gr.opacity
        gr.uniforms.uTime.value = time
        for (const s of gr.sprites) s.material.opacity = gr.opacity
        gr.group.position.y = (1 - gr.opacity) * -0.15
      })
    },
    dispose() {
      quad.dispose()
      graphs.forEach((gr) => gr.dispose())
    },
  }
}
