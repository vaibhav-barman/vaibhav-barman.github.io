/**
 * Build-time SVG of a project pipeline for project pages. Colours come from
 * CSS variables (see .pipeline in main.css), so it follows the theme.
 */
import { layoutPipeline, quadPoint } from '../data/pipeline-layout.js'
import { esc } from './util.js'

const NODE_W = 176
const NODE_H = 64
const UNIT = 150 // px between rows
const SPAN = 760 // px between the first and last column centres

/** Splits a label into at most two lines of roughly `max` characters. */
export function wrapLabel(label, max = 18) {
  if (label.length <= max) return [label]
  const words = label.split(/\s+/)
  let a = ''
  while (words.length && (a + ' ' + words[0]).trim().length <= max) a = (a + ' ' + words.shift()).trim()
  return a ? [a, words.join(' ')] : [label]
}

export function pipelineSvg(pipeline, { title = 'How it works' } = {}) {
  const perRow = pipeline.nodes.length <= 4 ? pipeline.nodes.length : Math.ceil(pipeline.nodes.length / 2)
  const L = layoutPipeline(pipeline, { colGap: SPAN / Math.max(1, perRow - 1) / UNIT })
  const pts = L.nodes.map((n) => ({ ...n, X: n.x * UNIT, Y: n.y * UNIT }))

  // Chain edges: from the side (or bottom) of one box to the next.
  const edge = ({ from, to }) => {
    const a = pts[from]
    const b = pts[to]
    if (a.row === b.row) {
      const dir = Math.sign(b.X - a.X)
      return `<line class="pl-edge" x1="${a.X + (dir * NODE_W) / 2}" y1="${a.Y}" x2="${b.X - (dir * NODE_W) / 2 - dir * 6}" y2="${b.Y}" marker-end="url(#pl-arrow)"/>`
    }
    return `<line class="pl-edge" x1="${a.X}" y1="${a.Y + NODE_H / 2}" x2="${b.X}" y2="${b.Y - NODE_H / 2 - 6}" marker-end="url(#pl-arrow)"/>`
  }

  /** Where the segment from a box centre toward (tx, ty) leaves the box (plus a gap). */
  const exitPoint = (n, tx, ty, gap) => {
    const dx = tx - n.X
    const dy = ty - n.Y
    const s = Math.min((NODE_W / 2 + gap) / Math.abs(dx || 1e-9), (NODE_H / 2 + gap) / Math.abs(dy || 1e-9))
    return [n.X + dx * s, n.Y + dy * s]
  }

  let loop = ''
  const extra = []
  if (L.loop) {
    const a = pts[L.loop.from]
    const b = pts[L.loop.to]
    const cx = L.loop.cx * UNIT
    const cy = L.loop.cy * UNIT
    const [ax, ay] = exitPoint(a, cx, cy, 0)
    const [bx, by] = exitPoint(b, cx, cy, 6)
    const [lx, ly] = quadPoint(ax, ay, cx, cy, bx, by, 0.5)
    extra.push([cx, cy], [lx, ly - 24])
    loop = `<path class="pl-loop" d="M${ax} ${ay} Q${cx} ${cy} ${bx} ${by}" marker-end="url(#pl-arrow-loop)"/>
      ${L.loop.label ? `<text class="pl-loop-label" x="${lx}" y="${ly - 10}" text-anchor="middle">${esc(L.loop.label)}</text>` : ''}`
  }

  const node = (n) => {
    const lines = wrapLabel(n.label)
    const t0 = n.Y - (lines.length - 1) * 10 + 5
    return `<g class="pl-node${n.i === 0 ? ' is-first' : ''}">
        <rect x="${n.X - NODE_W / 2}" y="${n.Y - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="12"/>
        <text x="${n.X}" y="${t0}" text-anchor="middle">${lines.map((l, k) => `<tspan x="${n.X}" dy="${k ? 20 : 0}">${esc(l)}</tspan>`).join('')}</text>
      </g>`
  }

  // Fit the view box around the boxes and the loop.
  const xs = [...pts.flatMap((p) => [p.X - NODE_W / 2, p.X + NODE_W / 2]), ...extra.map((e) => e[0])]
  const ys = [...pts.flatMap((p) => [p.Y - NODE_H / 2, p.Y + NODE_H / 2]), ...extra.map((e) => e[1])]
  const m = 24
  const minX = Math.min(...xs) - m
  const minY = Math.min(...ys) - m
  const w = Math.max(...xs) + m - minX
  const h = Math.max(...ys) + m - minY
  return `<svg class="pipeline" viewBox="${minX} ${minY} ${w} ${h}" role="img" aria-labelledby="pl-title">
      <title id="pl-title">${esc(title)}: ${esc(pipeline.nodes.join(' → '))}</title>
      <defs>
        <marker id="pl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="pl-arrowhead"/></marker>
        <marker id="pl-arrow-loop" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="pl-arrowhead-loop"/></marker>
      </defs>
      ${L.edges.map(edge).join('')}
      ${loop}
      ${pts.map(node).join('')}
    </svg>`
}
