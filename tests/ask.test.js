import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { buildChunks, createOfflineProvider, createSemanticProvider } from '../src/ai/ask.js'
import { normalize } from '../src/data/normalize.js'

const d = normalize(raw)

// A stand-in for the embedding model: bag-of-words vectors over a fixed vocabulary.
function fakeEmbedder() {
  const vocab = new Map()
  const words = (s) => s.toLowerCase().match(/[a-z]+/g) ?? []
  for (const c of buildChunks(d).chunks) for (const w of words(c.text)) if (!vocab.has(w)) vocab.set(w, vocab.size)
  const synonyms = { university: 'bits', college: 'bits', offline: 'local', privately: 'local' }
  return async (texts) =>
    texts.map((t) => {
      const v = new Array(vocab.size).fill(0)
      for (let w of words(t)) {
        w = synonyms[w] ?? w
        if (vocab.has(w)) v[vocab.get(w)] += 1
      }
      const n = Math.hypot(...v) || 1
      return v.map((x) => x / n)
    })
}

describe('ask (semantic)', () => {
  it('falls back to keyword search without a model', async () => {
    const p = createSemanticProvider(d, {})
    const a = await p.ask('where do you study')
    expect(a.text).toMatch(/BITS/)
    expect(a.via).toBe('keyword')
  })

  it('ranks with embeddings and quotes the matching highlight', async () => {
    const p = createSemanticProvider(d, { loadEmbedder: async () => fakeEmbedder() })
    const a = await p.ask('which project has a critic loop that regenerates drafts')
    expect(a.via).toBe('semantic')
    expect(a.sources[0]).toBe('projects/gitcommit-ai.md')
    expect(a.evidence).toMatch(/critic loop/i)
    expect(p.loaded).toBe(true)
  })

  it('reports a failed model load and keeps answering', async () => {
    const p = createSemanticProvider(d, {
      loadEmbedder: async () => {
        throw new Error('offline')
      },
    })
    const a = await p.ask('where do you study')
    expect(a.text).toMatch(/BITS/)
    expect(a.note).toMatch(/could not load/)
    // later questions skip the model straight away
    expect((await p.ask('contact email')).via).toBe('keyword')
  })

  it('times out to keyword search while the model is still loading', async () => {
    const p = createSemanticProvider(d, { loadEmbedder: () => new Promise(() => {}), timeoutMs: 20 })
    const a = await p.ask('where do you study')
    expect(a.note).toMatch(/still loading/)
  })

  it('offline provider still works on its own', async () => {
    expect((await createOfflineProvider(d).ask('email')).text).toContain(d.email)
  })
})

describe('ask warm-up', () => {
  it('reports loaded only after the model is ready', async () => {
    let release
    const p = createSemanticProvider(d, { loadEmbedder: () => new Promise((r) => (release = r)) })
    p.warm()
    expect(p.loaded).toBe(false)
    release(fakeEmbedder())
    await p.ask('email')
    expect(p.loaded).toBe(true)
  })
})
