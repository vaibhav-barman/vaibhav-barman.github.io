/**
 * Small rotating wireframe solids (canvas 2D) on the build cards and the
 * whoami card. One shared animation loop draws only the canvases that are on
 * screen, so six solids cost almost nothing, and there is never more than the
 * hero's single WebGL context. Reduced motion: one still frame.
 */
import { state } from './bus.js'

const PHI = (1 + Math.sqrt(5)) / 2

/** Vertices; edges are found as the shortest distance between vertices (per component for the stella). */
const SOLIDS = {
  tetrahedron: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  cube: [...Array(8)].map((_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]),
  octahedron: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  icosahedron: [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]],
  dodecahedron: [
    ...[...Array(8)].map((_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]),
    ...[-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [[0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]])),
  ],
}

const edgesOf = (verts, idx = verts.map((_, i) => i)) => {
  const d = (a, b) => Math.hypot(...verts[a].map((v, k) => v - verts[b][k]))
  let min = Infinity
  for (const a of idx) for (const b of idx) if (a < b) min = Math.min(min, d(a, b))
  const out = []
  for (const a of idx) for (const b of idx) if (a < b && Math.abs(d(a, b) - min) < 1e-6) out.push([a, b])
  return out
}

const built = new Map()
function solid(name) {
  if (built.has(name)) return built.get(name)
  let s
  if (name === 'stella') {
    const t = SOLIDS.tetrahedron
    const verts = [...t, ...t.map((v) => v.map((x) => -x))]
    s = { verts, edges: [...edgesOf(verts, [0, 1, 2, 3]), ...edgesOf(verts, [4, 5, 6, 7])] }
  } else {
    const verts = SOLIDS[name] ?? SOLIDS.icosahedron
    s = { verts, edges: edgesOf(verts) }
  }
  const r = Math.max(...s.verts.map((v) => Math.hypot(...v)))
  s.verts = s.verts.map((v) => v.map((x) => x / r))
  built.set(name, s)
  return s
}

function draw(c, t) {
  const { ctx, w, h, dpr, shape } = c
  ctx.clearRect(0, 0, w, h)
  const ay = t * 0.55
  const ax = 0.5 + Math.sin(t * 0.31) * 0.18
  const [sy, cy, sx, cx] = [Math.sin(ay), Math.cos(ay), Math.sin(ax), Math.cos(ax)]
  const R = Math.min(w, h) * 0.38
  const cam = 3.2
  const p = shape.verts.map(([x, y, z]) => {
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    const y1 = y * cx - z1 * sx
    const z2 = y * sx + z1 * cx
    const k = cam / (cam - z2)
    return [w / 2 + x1 * R * k, h / 2 + y1 * R * k, z2]
  })
  ctx.lineWidth = 1.1 * dpr
  ctx.lineCap = 'round'
  for (const [a, b] of shape.edges) {
    const near = ((p[a][2] + p[b][2]) / 2 + 1) / 2 // 0 far .. 1 near
    ctx.strokeStyle = `rgba(255,255,255,${(0.22 + 0.68 * near).toFixed(2)})`
    ctx.beginPath()
    ctx.moveTo(p[a][0], p[a][1])
    ctx.lineTo(p[b][0], p[b][1])
    ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  for (const [x, y, z] of p) {
    ctx.globalAlpha = 0.3 + 0.7 * ((z + 1) / 2)
    ctx.beginPath()
    ctx.arc(x, y, 1.4 * dpr, 0, 6.2832)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function initSolids() {
  const canvases = [...document.querySelectorAll('canvas.solid[data-solid]')]
  if (!canvases.length) return
  const items = canvases.map((el, i) => ({ el, ctx: el.getContext('2d'), shape: solid(el.dataset.solid), visible: false, w: 0, h: 0, dpr: 1, phase: i * 1.7 }))

  const size = (c) => {
    c.dpr = Math.min(devicePixelRatio || 1, 2)
    const r = c.el.getBoundingClientRect()
    c.w = c.el.width = Math.max(1, Math.round(r.width * c.dpr))
    c.h = c.el.height = Math.max(1, Math.round(r.height * c.dpr))
  }
  items.forEach(size)
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const c = items.find((x) => x.el === e.target)
      if (!c) continue
      size(c)
      draw(c, c.phase + 2) // redraw immediately; the loop (if running) takes over
    }
  })
  items.forEach((c) => ro.observe(c.el))

  if (state.reducedMotion) {
    items.forEach((c) => draw(c, c.phase + 2))
    return
  }

  let raf = 0
  const frame = (now) => {
    raf = 0
    if (document.hidden) return
    const t = now / 1000
    let any = false
    for (const c of items) {
      if (!c.visible) continue
      any = true
      draw(c, t + c.phase)
    }
    if (any) raf = requestAnimationFrame(frame)
  }
  const kick = () => {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame)
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) items.find((c) => c.el === e.target).visible = e.isIntersecting
      kick()
    },
    { rootMargin: '60px' },
  )
  items.forEach((c) => io.observe(c.el))
  document.addEventListener('visibilitychange', kick)
}
