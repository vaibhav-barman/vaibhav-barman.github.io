/**
 * Pipeline graphs: the nodes, edges and "routes" (the paths data packets
 * actually travel) of an agent. Pure; imported at build time by the SVG
 * renderer and in the browser by the terminal / ask.
 *
 * Raw shape in portfolio.json (positions are percentages of the diagram's plot
 * area, one set per layout: `wide` for desktop panels, `tall` for phones):
 *
 *   "graph": {
 *     "nodes":  [{ "id": "router", "label": "router", "sub": "picks a mode", "kind": "ball",
 *                  "wide": [16, 58], "tall": [50, 12], "wideLabel": "below", "tallLabel": "right" }],
 *     "edges":  [{ "from": "router", "to": "research", "label": "hybrid", "tallLabel": "hybrid", "conditional": true, "bend": 0.2 }],
 *               (`label` is drawn on the wide layout; the tall one only shows `tallLabel`, if given)
 *     "routes": [{ "name": "closed book", "path": ["start", "router", "end"] }]
 *   }
 *
 * Legacy projects only have a chain plus one loop ("pipeline"); graphFromPipeline
 * turns that into the same shape so one renderer draws everything.
 */
import { layoutPipeline } from './pipeline-layout.js'

export const NODE_KINDS = ['ring', 'ball', 'stack']
export const LABEL_SIDES = ['above', 'below', 'left', 'right']

const pct = (n) => Math.min(100, Math.max(0, Number(n)))
const point = (v) => (Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(Number(n))) ? [pct(v[0]), pct(v[1])] : undefined)

/**
 * Validates and normalises a raw graph. Never throws (it also runs in the
 * browser): bad nodes, edges and routes are dropped and listed in `warnings`,
 * which tests/graph.test.js requires to be empty for portfolio.json.
 */
export function normalizeGraph(raw) {
  if (!raw || !Array.isArray(raw.nodes)) return undefined
  const warnings = []
  const ids = new Set()
  const nodes = []
  raw.nodes.forEach((n, i) => {
    const id = String(n?.id ?? '').trim()
    if (!id || ids.has(id) || !n.label) return void warnings.push(`node #${i}: missing/duplicate id or label`)
    ids.add(id)
    const wide = point(n.wide)
    const tall = point(n.tall)
    if (!wide || !tall) warnings.push(`node ${id}: needs wide and tall positions`)
    nodes.push({
      id,
      label: String(n.label),
      sub: n.sub ? String(n.sub) : undefined,
      kind: NODE_KINDS.includes(n.kind) ? n.kind : 'ring',
      wide: wide ?? [50, 50],
      tall: tall ?? [50, 50],
      wideLabel: LABEL_SIDES.includes(n.wideLabel) ? n.wideLabel : 'below',
      tallLabel: LABEL_SIDES.includes(n.tallLabel) ? n.tallLabel : 'right',
    })
  })
  if (nodes.length < 2) return undefined

  const edges = []
  const seen = new Set()
  for (const e of raw.edges ?? []) {
    const key = `${e?.from}>${e?.to}`
    if (!ids.has(e?.from) || !ids.has(e?.to) || e.from === e.to) {
      warnings.push(`edge ${key}: unknown node`)
    } else if (seen.has(key)) {
      warnings.push(`edge ${key}: duplicate`)
    } else {
      seen.add(key)
      edges.push({ from: e.from, to: e.to, label: e.label ? String(e.label) : undefined, tallLabel: e.tallLabel ? String(e.tallLabel) : undefined, conditional: Boolean(e.conditional), bend: Number(e.bend) || 0 })
    }
  }

  const routes = []
  for (const r of raw.routes ?? []) {
    const path = (r?.path ?? []).map(String)
    const bad = path.findIndex((id, i) => (i === 0 ? !ids.has(id) : !seen.has(`${path[i - 1]}>${id}`)))
    if (path.length < 2 || !r.name || bad !== -1) warnings.push(`route "${r?.name}": ${path.length < 2 ? 'too short' : `no edge into step ${bad} (${path[bad]})`}`)
    else routes.push({ name: String(r.name), path })
  }
  if (!routes.length) warnings.push('graph has no valid routes (no packets will run)')

  return { nodes, edges, routes, warnings }
}

/** A chain plus at most one feedback loop, as a graph (wide: snake rows, tall: one column). */
export function graphFromPipeline(pipeline) {
  const n = pipeline.nodes.length
  const L = layoutPipeline(pipeline, { colGap: 1 })
  const loop = pipeline.loop
  const nodes = pipeline.nodes.map((label, i) => {
    const ln = L.nodes[i]
    const x = L.perRow > 1 ? 6 + (ln.col / (L.perRow - 1)) * 88 : 50
    const y = L.rows === 1 ? 52 : ln.row === 0 ? 30 : 76
    const isLoopEnd = loop && (i === loop.from || i === loop.to)
    return {
      id: `n${i}`,
      label,
      kind: isLoopEnd ? 'ball' : 'ring',
      wide: [x, y],
      tall: [50, n === 1 ? 50 : 4 + (i / (n - 1)) * 92],
      wideLabel: 'below',
      tallLabel: 'right',
    }
  })
  const edges = nodes.slice(1).map((b, i) => ({ from: `n${i}`, to: b.id }))
  if (loop) edges.push({ from: `n${loop.from}`, to: `n${loop.to}`, label: loop.label || undefined, conditional: true, bend: 0.3 })
  const chain = nodes.map((x) => x.id)
  const routes = [{ name: 'run', path: chain }]
  if (loop) routes.push({ name: loop.label || 'loop', path: [...chain.slice(0, loop.from + 1), ...chain.slice(loop.to)] })
  return normalizeGraph({ nodes, edges, routes })
}

/** Readable one-liners per route, for the terminal, `ask` and the resume. */
export function graphSummary(graph) {
  if (!graph) return []
  const label = new Map(graph.nodes.map((n) => [n.id, n.label]))
  return graph.routes.map((r) => ({ name: r.name, steps: r.path.map((id) => label.get(id)) }))
}
