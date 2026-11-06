/**
 * The scroll story: the neural network changes shape as you move through the
 * page.
 *
 *   hero, about → cloud      a loose network (the "raw" model)
 *   projects    → layers     a layered network, input → output
 *   skills      → clusters   one cluster per skill group
 *   journey     → path       a path through time
 *   contact     → beacon     everything converges into one bright signal
 *
 * Pure functions (no three.js, no DOM), so the shapes and the blending are
 * unit-tested in Node. Positions are local to a point that travels with the
 * camera, so each shape is always in view.
 */
import { rng } from './util.js'

export const STATES = ['cloud', 'layers', 'clusters', 'path', 'beacon']
export const SECTION_STATE = { hero: 'cloud', about: 'cloud', projects: 'layers', skills: 'clusters', journey: 'path', notes: 'path', contact: 'beacon' }
/** Brightness of the network per state: full in the hero, quieter behind text. */
export const STATE_INTENSITY = { cloud: 1, layers: 0.4, clusters: 0.6, path: 0.6, beacon: 0.95 }

const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const smooth = (t) => t * t * (3 - 2 * t)

/** k nearest neighbours of each index in `idx` (within that subset), as [a, b] pairs with a < b. */
function knn(P, idx, k, maxDist = Infinity) {
  const out = []
  const max2 = maxDist * maxDist
  for (const i of idx) {
    const near = []
    for (const j of idx) {
      if (j === i) continue
      const dx = P[i * 3] - P[j * 3]
      const dy = P[i * 3 + 1] - P[j * 3 + 1]
      const dz = P[i * 3 + 2] - P[j * 3 + 2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 < max2) near.push([j, d2])
    }
    near.sort((a, b) => a[1] - b[1])
    for (const [j] of near.slice(0, k)) out.push(i < j ? [i, j] : [j, i])
  }
  return out
}

const range = (n) => Array.from({ length: n }, (_, i) => i)

/**
 * Builds every state's node positions and links for `n` nodes.
 *   narrow: portrait screens squeeze the shapes horizontally and stretch them vertically.
 * Returns { positions: { [state]: Float32Array(n*3) }, links: [{ a, b, mask: Float32Array(STATES.length) }] }
 */
export function storyShapes(n, { narrow = false, seed = 7, linkDistance = 2.6, linksPerNode = 3 } = {}) {
  const r = rng(seed)
  const sx = narrow ? 0.42 : 1
  const sy = narrow ? 1.35 : 1
  const gauss = () => (r() + r() + r() - 1.5) / 1.5
  const positions = {}
  const pairs = {}

  // cloud: a wide, shallow ellipsoid behind both halves of the hero
  {
    const P = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const u = r() * Math.PI * 2
      const v = Math.acos(2 * r() - 1)
      const rad = Math.cbrt(r())
      P.set([Math.cos(u) * Math.sin(v) * 9.5 * rad * sx, Math.cos(v) * 4.2 * rad * sy, Math.sin(u) * Math.sin(v) * 4 * rad - 2], i * 3)
    }
    positions.cloud = P
    pairs.cloud = knn(P, range(n), linksPerNode, linkDistance)
  }

  // layers: five columns, each node wired to the two nearest in the next column
  {
    const P = new Float32Array(n * 3)
    const share = [0.14, 0.22, 0.28, 0.22, 0.14]
    const cols = share.map((s) => Math.max(2, Math.round(s * n)))
    while (cols.reduce((a, b) => a + b) > n) cols[cols.indexOf(Math.max(...cols))]--
    while (cols.reduce((a, b) => a + b) < n) cols[2]++
    const maxM = Math.max(...cols)
    const byCol = []
    let i = 0
    cols.forEach((m, c) => {
      const ids = []
      for (let j = 0; j < m; j++, i++) {
        const span = 2 + 5.4 * (m / maxM)
        P.set([(c - 2) * 3.8 * sx + (r() - 0.5) * 0.3, (j / Math.max(1, m - 1) - 0.5) * span * sy + (r() - 0.5) * 0.15, -3 + (r() - 0.5) * 0.8], i * 3)
        ids.push(i)
      }
      byCol.push(ids)
    })
    const L = []
    for (let c = 0; c < byCol.length - 1; c++) {
      for (const a of byCol[c]) {
        const near = byCol[c + 1].map((b) => [b, Math.abs(P[a * 3 + 1] - P[b * 3 + 1])]).sort((x, y) => x[1] - y[1])
        for (const [b] of near.slice(0, 2)) L.push([a, b])
      }
    }
    positions.layers = P
    pairs.layers = L
  }

  // clusters: seven groups on a wide ring
  {
    const P = new Float32Array(n * 3)
    const K = 7
    const members = Array.from({ length: K }, () => [])
    for (let i = 0; i < n; i++) {
      const k = i % K
      const a = (k / K) * Math.PI * 2 + 0.3
      P.set([Math.cos(a) * 7.2 * sx + gauss() * 0.85, Math.sin(a) * 3.0 * sy + gauss() * 0.7, -3 + Math.sin(a) * 1.5 + gauss() * 0.8], i * 3)
      members[k].push(i)
    }
    positions.clusters = P
    pairs.clusters = members.flatMap((m) => knn(P, m, 3))
  }

  // path: a winding tube from lower left to upper right
  {
    const P = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1)
      const u = r() * Math.PI * 2
      const rad = 0.55 * Math.sqrt(r())
      P.set(
        [
          (t - 0.5) * 19 * sx + Math.cos(u) * rad * 0.6,
          (Math.sin(t * Math.PI * 2.2) * 1.8 + (t - 0.5) * 2.2) * sy + Math.sin(u) * rad,
          -3 + Math.cos(t * Math.PI * 1.6) * 1.8 + (r() - 0.5) * rad,
        ],
        i * 3,
      )
    }
    positions.path = P
    pairs.path = knn(P, range(n), 2)
  }

  // beacon: a bright sphere (on the right on wide screens, above centre on phones)
  {
    const P = new Float32Array(n * 3)
    const [cx, cy, cz] = narrow ? [0, 2.2, -2] : [5.2, 0.4, -2]
    const R = narrow ? 1.7 : 2.3
    const surface = Math.floor(n * 0.8)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < n; i++) {
      let x, y, z
      if (i < surface) {
        const yy = 1 - (i / Math.max(1, surface - 1)) * 2
        const rr = Math.sqrt(1 - yy * yy)
        x = Math.cos(golden * i) * rr * R
        y = yy * R
        z = Math.sin(golden * i) * rr * R
      } else {
        const u = r() * Math.PI * 2
        const v = Math.acos(2 * r() - 1)
        const rad = R * (0.2 + 0.3 * r())
        x = Math.cos(u) * Math.sin(v) * rad
        y = Math.cos(v) * rad
        z = Math.sin(u) * Math.sin(v) * rad
      }
      P.set([cx + x, cy + y, cz + z], i * 3)
    }
    positions.beacon = P
    pairs.beacon = knn(P, range(n), 3)
  }

  // One list of links; each knows which states it belongs to.
  const byKey = new Map()
  STATES.forEach((s, si) => {
    for (const [a, b] of pairs[s]) {
      const key = a * n + b
      if (!byKey.has(key)) byKey.set(key, { a, b, mask: new Float32Array(STATES.length) })
      byKey.get(key).mask[si] = 1
    }
  })
  return { positions, links: [...byKey.values()] }
}

/**
 * Which sections are on screen, as blend weights (one per section, summing to 1).
 * `tops` are each section's top edge in px relative to the viewport, in page order.
 * A section is "current" once its top passes the middle of the screen; the next
 * one blends in over the half screen before its top reaches the middle.
 */
export function sectionBlend(tops, vh) {
  const w = new Array(tops.length).fill(0)
  if (!tops.length) return w
  const mid = vh * 0.5
  let i = 0
  for (let k = 0; k < tops.length; k++) if (tops[k] <= mid) i = k
  if (i + 1 < tops.length) {
    const d = (tops[i + 1] - mid) / vh
    const t = smooth(clamp((0.35 - d) / 0.5, 0, 1))
    w[i] = 1 - t
    w[i + 1] = t
  } else w[i] = 1
  return w
}

/** Section weights → state weights (Float32Array over STATES). */
export function stateWeights(sectionIds, sectionW) {
  const out = new Float32Array(STATES.length)
  sectionIds.forEach((id, i) => {
    const s = STATES.indexOf(SECTION_STATE[id] ?? 'cloud')
    out[s] += sectionW[i]
  })
  return out
}
