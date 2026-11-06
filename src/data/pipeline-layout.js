/**
 * Lays out a project pipeline ({ nodes, loop }) as a "snake": up to 4 steps
 * in one row, otherwise two rows where the second row runs right to left, so
 * every step sits next to the one before it.
 *
 * Pure. Coordinates are in "row units" (the gap between rows is 1, y points
 * down) and the caller picks the column spacing, so both axes use the same
 * unit and the feedback loop bends the same way in the SVG on project pages
 * and the 3D graph in the projects stage.
 */
export function layoutPipeline(pipeline, { colGap = 1.6 } = {}) {
  const n = pipeline.nodes.length
  const perRow = n <= 4 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / perRow)
  const nodes = pipeline.nodes.map((label, i) => {
    const row = Math.floor(i / perRow)
    const k = i % perRow
    const col = row % 2 === 0 ? k : perRow - 1 - k
    return { label, i, row, col, x: col * colGap, y: row }
  })
  const width = (perRow - 1) * colGap
  const height = rows - 1
  const edges = nodes.slice(1).map((b, k) => ({ from: k, to: b.i }))

  let loop
  if (pipeline.loop) {
    const a = nodes[pipeline.loop.from]
    const b = nodes[pipeline.loop.to]
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    let nx = 0
    let ny = -1 // one row: bend upward, above the chain
    let bend = 0.75
    if (rows > 1) {
      // Bend sideways, away from the middle of the diagram, so the loop never
      // lies on top of the straight chain edges.
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      nx = -(b.y - a.y) / len
      ny = (b.x - a.x) / len
      if (nx * (mx - width / 2) + ny * (my - height / 2) < 0) {
        nx = -nx
        ny = -ny
      }
      bend = 0.5
    }
    loop = { from: a.i, to: b.i, label: pipeline.loop.label, cx: mx + nx * bend, cy: my + ny * bend }
  }
  return { nodes, edges, loop, rows, perRow, width, height }
}

/** Point on the quadratic curve a → c → b at t (used to place loop pulses and labels). */
export function quadPoint(ax, ay, cx, cy, bx, by, t) {
  const u = 1 - t
  return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by]
}
