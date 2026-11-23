/**
 * Animated pipeline diagrams, built at build time as inline SVG (so they scale
 * and cost no JavaScript). A port of the `Scene` class in scripts/generate_assets.py
 * from the profile README repo: nodes over a perspective floor grid, with glowing
 * packets that run the agent's real routes (data/graph.js `routes`).
 *
 * Every graph is drawn twice, in a `wide` layout (desktop) and a `tall` one
 * (phones, so labels stay readable); CSS shows one of them and src/ui/fx.js pauses
 * the SMIL clock of whichever is hidden or off-screen.
 */
import { graphSummary } from '../data/graph.js'
import { chromeDefs } from './chrome-svg.js'
import { esc } from './util.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const f = (v) => +v.toFixed(1)
const f3 = (v) => +v.toFixed(4)

/** keyTimes must strictly increase and stay within 0..1. */
function keyTimes(times, total) {
  let prev = -1
  return times
    .map((t) => {
      const k = clamp(t / total, 0, 1)
      const v = Math.max(k, prev + 0.0004)
      prev = v
      return v
    })
    .map((v) => f3(Math.min(1, v)))
    .join(';')
}

const HOP = 0.75 // seconds per hop
const DWELL = 0.14 // pause on each node
const LEAD = 0.5
const GAP = 1.5 // pause between routes

const RADIUS = { ball: 15, ring: 9, stack: 9 }

function layoutOf(kind, graph) {
  if (kind === 'wide') return { kind, W: 720, H: graph.nodes.length > 9 ? 440 : 400, padX: 46, padTop: 58, padBottom: 66, horizon: 118, rows: 9, cols: 15 }
  const H = clamp(420 + graph.nodes.length * 18, 540, 700)
  return { kind, W: 300, H, padX: 30, padTop: 40, padBottom: 40, horizon: 72, rows: 7, cols: 8 }
}

const toPx = (L, [x, y]) => ({ x: L.padX + (x / 100) * (L.W - 2 * L.padX), y: L.padTop + (y / 100) * (L.H - L.padTop - L.padBottom) })

/** Geometry of one edge: the visible path (trimmed to the node rims) and the full centre-to-centre segment packets ride. */
function edgeGeometry(a, b, ra, rb, bend) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const c = bend ? { x: (a.x + b.x) / 2 + nx * bend * len, y: (a.y + b.y) / 2 + ny * bend * len } : null
  const toward = (from, to) => {
    const l = Math.hypot(to.x - from.x, to.y - from.y) || 1
    return { x: (to.x - from.x) / l, y: (to.y - from.y) / l }
  }
  const d0 = toward(a, c ?? b)
  const d1 = toward(c ?? a, b)
  const s = { x: a.x + d0.x * (ra + 2), y: a.y + d0.y * (ra + 2) }
  const e = { x: b.x - d1.x * (rb + 5), y: b.y - d1.y * (rb + 5) }
  const draw = c ? `M${f(s.x)} ${f(s.y)}Q${f(c.x)} ${f(c.y)} ${f(e.x)} ${f(e.y)}` : `M${f(s.x)} ${f(s.y)}L${f(e.x)} ${f(e.y)}`
  const ride = c ? `Q${f(c.x)} ${f(c.y)} ${f(b.x)} ${f(b.y)}` : `L${f(b.x)} ${f(b.y)}`
  let length = len
  if (c) {
    length = 0
    let px = a.x
    let py = a.y
    for (let i = 1; i <= 14; i++) {
      const t = i / 14
      const u = 1 - t
      const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x
      const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y
      length += Math.hypot(x - px, y - py)
      px = x
      py = y
    }
  }
  // Where the label sits: the curve's middle, nudged off the line.
  const mid = c ? { x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y } : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const vertical = Math.abs(dx) / len < 0.35
  return { draw, ride, length, mid, vertical, ux: dx / len, uy: dy / len, nx, ny }
}

/** Perspective floor: lines converging on a vanishing point, rows drifting toward the viewer. */
function floorSvg(L, p) {
  const { W, H, horizon: top, rows, cols } = L
  const A = H - top
  let d = ''
  for (let k = -cols; k <= cols; k++) d += `M${f(W / 2)} ${top}L${f(W / 2 + ((k * W) / cols) * 1.6)} ${H}`
  const row = (i) => {
    const ys = []
    const hs = []
    for (let s = 0; s <= 12; s++) {
      const t = (i + s / 12) / rows
      ys.push(f(top + A * t ** 2.6))
      hs.push(f(0.5 + 1.3 * t ** 2.6))
    }
    return `<rect x="0" y="${ys[0]}" width="${W}" height="${hs[0]}" fill="url(#${p}fg)"><animate attributeName="y" values="${ys.join(';')}" dur="2.6s" repeatCount="indefinite"/><animate attributeName="height" values="${hs.join(';')}" dur="2.6s" repeatCount="indefinite"/></rect>`
  }
  return `<linearGradient id="${p}fg" x1="0" y1="${top}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity=".34"/></linearGradient>
<pattern id="${p}dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r=".7" fill="#fff"/></pattern>
<g class="fx-floor"><rect width="${W}" height="${H}" fill="url(#${p}dots)" opacity=".16"/><path d="${d}" stroke="url(#${p}fg)" stroke-width="1" fill="none"/>${Array.from({ length: rows }, (_, i) => row(i)).join('')}</g>`
}

function nodeSvg(n, pt, p) {
  const r = RADIUS[n.kind]
  const { x, y } = pt
  let body
  if (n.kind === 'ball') {
    body = `<ellipse cx="${f(x)}" cy="${f(y + r * 1.15)}" rx="${f(r * 1.7)}" ry="${f(r * 0.42)}" fill="url(#${p}shd)"/><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#${p}chl)"/><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#${p}chs)"/><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#${p}chr)"/>`
  } else if (n.kind === 'stack') {
    body = [-1, 0, 1].map((k) => `<circle cx="${f(x + k * 7)}" cy="${f(y - k * 4)}" r="${r - 1}" fill="#000" stroke="#fff" stroke-opacity="${k === 0 ? 0.95 : 0.55}" stroke-width="1.2"/>`).join('') + `<circle cx="${f(x)}" cy="${f(y)}" r="3" fill="#fff" opacity=".85"/>`
  } else {
    body = `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="#000" stroke="#fff" stroke-opacity=".9" stroke-width="1.2"/><circle cx="${f(x)}" cy="${f(y)}" r="3" fill="#fff" opacity=".85"/>`
  }
  const side = n._side ?? 'below'
  const rr = n.kind === 'stack' ? r + 8 : r
  let tx
  let ty
  let anchor = 'middle'
  if (side === 'right') {
    tx = x + rr + 10
    ty = y + (n.sub ? -1 : 4)
    anchor = 'start'
  } else if (side === 'left') {
    tx = x - rr - 10
    ty = y + (n.sub ? -1 : 4)
    anchor = 'end'
  } else if (side === 'above') {
    tx = x
    ty = y - rr - 9 - (n.sub ? 13 : 0)
  } else {
    tx = x
    ty = y + rr + 16
  }
  const label = `<text class="fx-t" x="${f(tx)}" y="${f(ty)}" text-anchor="${anchor}">${esc(n.label)}</text>`
  const sub = n.sub ? `<text class="fx-s" x="${f(tx)}" y="${f(ty + 13)}" text-anchor="${anchor}">${esc(n.sub)}</text>` : ''
  return `<g class="fx-node">${body}${label}${sub}</g>`
}

function layoutSvg(graph, kind, { id, title }) {
  const L = layoutOf(kind, graph)
  const p = `${id}-${kind[0]}-`
  const pts = new Map(graph.nodes.map((n) => [n.id, toPx(L, n[kind])]))
  const byId = new Map(graph.nodes.map((n) => [n.id, { ...n, _side: kind === 'wide' ? n.wideLabel : n.tallLabel }]))

  // edges
  const geo = new Map()
  const edges = graph.edges.map((e) => {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    const g = edgeGeometry(pts.get(e.from), pts.get(e.to), RADIUS[a.kind] + (a.kind === 'stack' ? 8 : 0), RADIUS[b.kind] + (b.kind === 'stack' ? 8 : 0), e.bend)
    geo.set(`${e.from}>${e.to}`, g)
    const cls = e.conditional ? 'fx-edge is-cond' : 'fx-edge'
    let label = ''
    const text = kind === 'wide' ? e.label : e.tallLabel
    if (text) {
      // Vertical edges: label to the right of the line. Others: just above the middle.
      const off = g.vertical ? { x: g.mid.x + 9, y: g.mid.y + 3, a: 'start' } : { x: g.mid.x, y: g.mid.y - 8, a: 'middle' }
      label = `<text class="fx-e" x="${f(off.x)}" y="${f(off.y)}" text-anchor="${off.a}">${esc(text)}</text>`
    }
    return `<path class="${cls}" d="${g.draw}" marker-end="url(#${p}ar)"/>${label}`
  })

  // schedule the routes one after another
  let cursor = LEAD
  const sched = graph.routes.map((r) => {
    const hops = r.path.length - 1
    const t0 = cursor
    cursor = t0 + hops * HOP + GAP
    return { ...r, hops, t0, t1: t0 + (hops - 1) * HOP + (HOP - DWELL) }
  })
  const T = f(cursor)
  const arrivals = new Map(graph.nodes.map((n) => [n.id, []]))

  const packets = sched
    .map((r) => {
      const segs = r.path.slice(1).map((to, i) => geo.get(`${r.path[i]}>${to}`))
      const total = segs.reduce((s, g) => s + g.length, 0) || 1
      const cum = [0]
      segs.forEach((g) => cum.push(cum.at(-1) + g.length / total))
      const p0 = pts.get(r.path[0])
      const path = `M${f(p0.x)} ${f(p0.y)}${segs.map((g) => g.ride).join('')}`
      const times = [0, r.t0]
      const points = [0, 0]
      for (let i = 0; i < r.hops; i++) {
        const s = r.t0 + i * HOP
        times.push(s + HOP - DWELL)
        points.push(cum[i + 1])
        if (i < r.hops - 1) {
          times.push(s + HOP)
          points.push(cum[i + 1])
        }
      }
      times.push(T)
      points.push(1)
      r.path.forEach((nid, i) => arrivals.get(nid).push(i === 0 ? r.t0 : r.t0 + (i - 1) * HOP + (HOP - DWELL)))
      const kts = keyTimes(times, T)
      const kps = points.map(f3).join(';')
      // Each packet is a bright head plus three lagging dots (a comet), all riding one path.
      const begin = (lag) => (lag ? ` begin="${lag}s"` : '')
      const fade = (peak, lag) =>
        `<animate attributeName="opacity" values="0;0;${peak};${peak};0;0" keyTimes="${keyTimes([0, r.t0, r.t0 + 0.12, r.t1, r.t1 + 0.4, T], T)}" dur="${T}s"${begin(lag)} repeatCount="indefinite"/>`
      const move = (lag) => `<animateMotion path="${path}" keyPoints="${kps}" keyTimes="${kts}" calcMode="linear" dur="${T}s"${begin(lag)} repeatCount="indefinite"/>`
      const dot = (rad, peak, lag) => `<circle r="${rad}" fill="#fff" opacity="0">${move(lag)}${fade(peak, lag)}</circle>`
      return `<g class="fx-packet"><circle r="11" fill="url(#${p}glow)" opacity="0">${move(0)}${fade(1, 0)}</circle>${dot(3.2, 1, 0)}${dot(2.3, 0.55, 0.07)}${dot(1.7, 0.32, 0.14)}${dot(1.2, 0.18, 0.21)}</g>`
    })
    .join('')

  // arrival pulses (one soft glow per node, lit whenever a packet lands)
  const pulses = graph.nodes
    .map((n) => {
      const at = [...arrivals.get(n.id)].sort((a, b) => a - b)
      if (!at.length) return ''
      const times = [0]
      const vals = [0]
      for (const a of at) {
        times.push(a - 0.03, a, a + 0.6)
        vals.push(0, 1, 0)
      }
      times.push(T)
      vals.push(0)
      const { x, y } = pts.get(n.id)
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${RADIUS[n.kind] * 2.6}" fill="url(#${p}glow)" opacity="0"><animate attributeName="opacity" values="${vals.join(';')}" keyTimes="${keyTimes(times, T)}" dur="${T}s" repeatCount="indefinite"/></circle>`
    })
    .join('')

  // route name, faded in while its packet runs
  const captions = sched
    .map(
      (r) =>
        `<text class="fx-r" x="${L.padX}" y="${kind === 'wide' ? 28 : 22}" opacity="0">ROUTE · ${esc(r.name.toUpperCase())}<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="${keyTimes([0, r.t0 - 0.05, r.t0 + 0.2, r.t1, r.t1 + 0.4, T], T)}" dur="${T}s" repeatCount="indefinite"/></text>`,
    )
    .join('')

  const nodes = graph.nodes.map((n) => nodeSvg(byId.get(n.id), pts.get(n.id), p)).join('')
  const decorative = kind === 'tall'
  return `<svg class="fx-svg fx-${kind}" viewBox="0 0 ${L.W} ${L.H}" ${decorative ? 'aria-hidden="true" focusable="false"' : `role="img" aria-label="${esc(title)}"`}>
<defs>${chromeDefs(p)}<marker id="${p}ar" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1.5 1.5L8.5 5L1.5 8.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
${floorSvg(L, p)}
<g class="fx-edges">${edges.join('')}</g>
<g class="fx-nodes">${nodes}</g>${pulses}${packets}${captions}
</svg>`
}

/**
 * The diagram for one project: a wide and a tall SVG plus a screen-reader
 * description of every route. `id` must be unique on the page.
 */
export function graphDiagram(graph, { id, title }) {
  const routes = graphSummary(graph)
    .map((r) => `${r.name}: ${r.steps.join(' to ')}`)
    .join('. ')
  return `<figure class="fx" data-fx>
${layoutSvg(graph, 'wide', { id, title })}
${layoutSvg(graph, 'tall', { id, title })}
<figcaption class="sr-only">${esc(title)}. Routes: ${esc(routes)}.</figcaption>
</figure>`
}
