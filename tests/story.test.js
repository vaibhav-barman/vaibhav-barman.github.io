import { describe, expect, it } from 'vitest'
import { layoutPipeline } from '../src/data/pipeline-layout.js'
import { STATES, sectionBlend, stateWeights, storyShapes } from '../src/scene/story.js'

describe('3D scroll story', () => {
  const n = 158
  const { positions, links } = storyShapes(n)

  it('has a full set of positions for every state', () => {
    for (const s of STATES) {
      expect(positions[s]).toHaveLength(n * 3)
      expect(positions[s].every(Number.isFinite)).toBe(true)
    }
  })

  it('links belong to at least one state and point at real nodes', () => {
    expect(links.length).toBeGreaterThan(n)
    for (const l of links) {
      expect(l.a).toBeLessThan(l.b)
      expect(l.b).toBeLessThan(n)
      expect(l.mask.some((m) => m === 1)).toBe(true)
    }
    // the layered state wires each column to the next
    const li = STATES.indexOf('layers')
    expect(links.filter((l) => l.mask[li]).length).toBeGreaterThan(n)
  })

  it('is deterministic', () => {
    expect(storyShapes(n).positions.beacon).toEqual(positions.beacon)
  })

  it('squeezes shapes on portrait screens', () => {
    const narrow = storyShapes(n, { narrow: true }).positions.cloud
    const maxX = (P) => Math.max(...P.filter((_, i) => i % 3 === 0).map(Math.abs))
    expect(maxX(narrow)).toBeLessThan(maxX(positions.cloud) * 0.6)
  })

  it('blends between the current and the next section', () => {
    const vh = 1000
    // top of the page: hero only
    expect(sectionBlend([0, 1000, 2400], vh)).toEqual([1, 0, 0])
    // next section's top at the middle of the screen: mostly the next one
    const mid = sectionBlend([-600, 500, 1900], vh)
    expect(mid[1]).toBeGreaterThan(0.6)
    expect(mid[0] + mid[1]).toBeCloseTo(1)
    // past the last section's top: last only
    expect(sectionBlend([-3000, -2000, 100], vh)).toEqual([0, 0, 1])
  })

  it('maps sections to states', () => {
    const w = stateWeights(['hero', 'about', 'projects', 'contact'], [0, 0.25, 0.75, 0])
    expect(w[STATES.indexOf('cloud')]).toBeCloseTo(0.25)
    expect(w[STATES.indexOf('layers')]).toBeCloseTo(0.75)
    expect(w.reduce((a, b) => a + b)).toBeCloseTo(1)
  })
})

describe('pipeline layout', () => {
  it('snakes long pipelines into two rows', () => {
    const L = layoutPipeline({ nodes: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], loop: { from: 4, to: 3, label: 'x' } })
    expect(L.rows).toBe(2)
    expect(L.perRow).toBe(4)
    // the second row runs right to left, so step 4 sits under step 3
    expect(L.nodes[4].col).toBe(L.nodes[3].col)
    // the loop bends outward (to the right of that last column)
    expect(L.loop.cx).toBeGreaterThan(L.nodes[3].x)
  })
  it('keeps short pipelines on one row with the loop above', () => {
    const L = layoutPipeline({ nodes: ['a', 'b', 'c'], loop: { from: 2, to: 0, label: '' } })
    expect(L.rows).toBe(1)
    expect(L.loop.cy).toBeLessThan(0)
  })
})
