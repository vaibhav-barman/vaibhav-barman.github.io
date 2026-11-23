import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { graphFromPipeline, graphSummary, normalizeGraph } from '../src/data/graph.js'
import { normalize } from '../src/data/normalize.js'

const d = normalize(raw)
const flagship = (title) => d.flagships.find((p) => p.title === title)

describe('normalizeGraph', () => {
  const nodes = [
    { id: 'a', label: 'A', wide: [10, 50], tall: [50, 10] },
    { id: 'b', label: 'B', wide: [90, 50], tall: [50, 90], kind: 'ball' },
  ]

  it('accepts a valid graph and fills defaults', () => {
    const g = normalizeGraph({ nodes, edges: [{ from: 'a', to: 'b', label: 'x', conditional: true }], routes: [{ name: 'r', path: ['a', 'b'] }] })
    expect(g.warnings).toEqual([])
    expect(g.nodes[0]).toMatchObject({ kind: 'ring', wideLabel: 'below', tallLabel: 'right' })
    expect(g.nodes[1].kind).toBe('ball')
    expect(g.edges[0]).toMatchObject({ conditional: true, bend: 0, label: 'x' })
  })

  it('drops edges to unknown nodes, duplicates and self loops, and says so', () => {
    const g = normalizeGraph({
      nodes,
      edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'b' }, { from: 'a', to: 'zzz' }, { from: 'b', to: 'b' }],
      routes: [{ name: 'r', path: ['a', 'b'] }],
    })
    expect(g.edges).toHaveLength(1)
    expect(g.warnings).toHaveLength(3)
  })

  it('drops routes that use a step with no edge', () => {
    const g = normalizeGraph({ nodes, edges: [{ from: 'a', to: 'b' }], routes: [{ name: 'ok', path: ['a', 'b'] }, { name: 'backwards', path: ['b', 'a'] }, { name: 'short', path: ['a'] }] })
    expect(g.routes.map((r) => r.name)).toEqual(['ok'])
    expect(g.warnings.join()).toMatch(/backwards/)
  })

  it('clamps positions into 0..100 and rejects a graph with fewer than two nodes', () => {
    const g = normalizeGraph({ nodes: [{ ...nodes[0], wide: [-20, 400] }, nodes[1]], edges: [], routes: [] })
    expect(g.nodes[0].wide).toEqual([0, 100])
    expect(g.warnings.join()).toMatch(/no valid routes/)
    expect(normalizeGraph({ nodes: [nodes[0]] })).toBeUndefined()
    expect(normalizeGraph(undefined)).toBeUndefined()
  })

  it('warns about a node with no layout positions', () => {
    const g = normalizeGraph({ nodes: [{ id: 'a', label: 'A' }, nodes[1]], edges: [], routes: [] })
    expect(g.warnings.join()).toMatch(/needs wide and tall/)
  })
})

describe('graphFromPipeline (legacy chain + loop)', () => {
  const g = graphFromPipeline({ nodes: ['Diff', 'Generate', 'Critic', 'Commit'], loop: { from: 2, to: 1, label: 'rejected' } })

  it('keeps the chain and adds the loop as a conditional edge', () => {
    expect(g.warnings).toEqual([])
    expect(g.nodes.map((n) => n.label)).toEqual(['Diff', 'Generate', 'Critic', 'Commit'])
    expect(g.edges.at(-1)).toMatchObject({ from: 'n2', to: 'n1', label: 'rejected', conditional: true })
  })

  it('runs one packet route end to end and one that goes round the loop', () => {
    expect(g.routes[0].path).toEqual(['n0', 'n1', 'n2', 'n3'])
    expect(g.routes[1]).toEqual({ name: 'rejected', path: ['n0', 'n1', 'n2', 'n1', 'n2', 'n3'] })
  })

  it('stacks the tall layout in one column', () => {
    expect(new Set(g.nodes.map((n) => n.tall[0]))).toEqual(new Set([50]))
    const ys = g.nodes.map((n) => n.tall[1])
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
  })

  it('is what every existing project page gets', () => {
    const gitcommit = d.projects.find((p) => p.slug === 'gitcommit-ai')
    expect(gitcommit.graph.nodes).toHaveLength(7)
    expect(gitcommit.graph.warnings).toEqual([])
  })
})

describe('portfolio.json flagship graphs', () => {
  it('are valid: no warnings, unique ids, every route follows real edges', () => {
    for (const p of d.flagships) {
      expect(p.graph.warnings, p.title).toEqual([])
      const ids = p.graph.nodes.map((n) => n.id)
      expect(new Set(ids).size, p.title).toBe(ids.length)
      expect(p.graph.routes.length, p.title).toBeGreaterThan(0)
    }
  })

  it('keep every node inside the plot area in both layouts', () => {
    for (const p of d.flagships) for (const n of p.graph.nodes) for (const [x, y] of [n.wide, n.tall]) {
      expect(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${p.title}/${n.id}`).toBe(true)
    }
  })

  it('keep nodes from sitting on top of each other', () => {
    for (const p of d.flagships) {
      for (const layout of ['wide', 'tall']) {
        const ns = p.graph.nodes
        for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
          const dist = Math.hypot(ns[i][layout][0] - ns[j][layout][0], ns[i][layout][1] - ns[j][layout][1])
          expect(dist, `${p.title} ${layout}: ${ns[i].id}/${ns[j].id}`).toBeGreaterThan(6)
        }
      }
    }
  })

  // The diagrams must only show what the repos' code does (checked against their READMEs and source).
  it('Blog Writing Agent: router → optional research → orchestrator → parallel workers via Send → reducer, no loop', () => {
    const g = flagship('Blog Writing Agent').graph
    const labels = g.nodes.map((n) => n.id)
    expect(labels).toEqual(expect.arrayContaining(['router', 'research', 'orchestrator', 'worker1', 'worker2', 'workerN', 'reducer']))
    // the parallel workers are drawn as separate nodes, all fed by the orchestrator through Send and all feeding `images`
    for (const w of ['worker1', 'worker2', 'workerN']) {
      expect(g.edges.find((e) => e.from === 'orchestrator' && e.to === w), w).toMatchObject({ conditional: true })
      expect(g.edges.some((e) => e.from === w && e.to === 'images'), w).toBe(true)
    }
    expect(g.edges.find((e) => e.from === 'orchestrator' && e.to === 'worker2').label).toMatch(/Send/)
    expect(g.edges.find((e) => e.from === 'router' && e.to === 'orchestrator')).toMatchObject({ label: 'closed_book' })
    for (const r of g.routes) expect(new Set(r.path).size, r.name).toBe(r.path.length) // acyclic: no node twice
    expect(g.routes.map((r) => r.name)).toEqual(['closed book', 'with research'])
  })

  it('Self-RAG: the four reflection checks, bounded revise/rewrite loops, and NO web fallback', () => {
    const p = flagship('Self-RAG')
    const g = p.graph
    expect(g.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(['decide', 'isrel', 'issup', 'isuse', 'revise', 'rewrite', 'limited']))
    expect(g.nodes.some((n) => /web|tavily/i.test(n.id + n.label + (n.sub ?? '')))).toBe(false)
    expect(p.tags).not.toContain('Tavily')
    expect(g.edges.some((e) => e.from === 'revise' && e.to === 'issup')).toBe(true)
    expect(g.edges.some((e) => e.from === 'rewrite' && e.to === 'retrieve')).toBe(true)
    // loops are bounded at 2: the longest route rewrites exactly twice, then gives up
    const giveUp = g.routes.find((r) => r.name === 'give up').path
    expect(giveUp.filter((id) => id === 'rewrite')).toHaveLength(2)
    expect(giveUp.at(-2)).toBe('limited')
    expect(p.facts.map((f) => f.value)).toEqual(['11', '4', '≤ 2'])
  })

  it('Corrective RAG: one CORRECT / INCORRECT / AMBIGUOUS branch with a web detour, and no retry loop', () => {
    const g = flagship('Corrective RAG').graph
    expect(g.routes.map((r) => r.name)).toEqual(['CORRECT', 'INCORRECT', 'AMBIGUOUS'])
    expect(g.routes[0].path).not.toContain('web')
    expect(g.routes[1].path).toEqual(expect.arrayContaining(['rewrite', 'web', 'refine']))
    for (const r of g.routes) expect(new Set(r.path).size, r.name).toBe(r.path.length)
    expect(g.nodes).toHaveLength(7) // 6 graph nodes + END
  })
})

describe('graphSummary', () => {
  it('turns routes into readable lines for the terminal and ask', () => {
    const lines = graphSummary(flagship('Corrective RAG').graph)
    expect(lines[0]).toEqual({ name: 'CORRECT', steps: ['retrieve', 'evaluator', 'refine', 'generate', 'END'] })
    expect(graphSummary(undefined)).toEqual([])
  })
})
