/**
 * "Ask my portfolio": retrieval over portfolio.json, fully in the browser.
 *
 *  - createOfflineProvider: keyword retrieval, instant, no downloads. Also the
 *    fallback whenever the embedding model can't load.
 *  - createSemanticProvider: hybrid retrieval. Every project, highlight and
 *    section is embedded with a small sentence-embedding model
 *    (all-MiniLM-L6-v2, ~23 MB, run locally with transformers.js and cached by
 *    the browser after the first question) and ranked by cosine similarity,
 *    blended with the keyword score. Nothing is sent to a server.
 *
 * A provider is any object with `ask(question) -> Promise<{ text, sources, evidence?, via }>`.
 */
import { aboutMd, contactTxt, interestsMd, projectMd, skillsTxt, timelineMd } from '../data/text.js'

const STOP = new Set(
  'a an the is are was were do does did can could what which who whom how why when where of to in on for with and or his her their your you he she it this that about tell me any has have had i my vaibhav barman'.split(' '),
)

function tokens(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .map((x) => x.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((x) => x.length > 1 && !STOP.has(x))
}

function buildDocs(d) {
  const docs = [
    { id: 'about.md', title: 'About', text: aboutMd(d), answer: d.summary, boost: ['who', 'about', 'background', 'bio', 'summary', 'intro'] },
    {
      id: 'contact.txt',
      title: 'Contact',
      text: contactTxt(d),
      answer: `You can reach ${d.firstName} at ${d.email ?? 'the links below'}.${d.socials.length ? ` Also on ${d.socials.map((s) => s.label).join(', ')}.` : ''}`,
      boost: ['contact', 'email', 'reach', 'hire', 'linkedin', 'github', 'mail'],
    },
    {
      id: 'skills.txt',
      title: 'Skills',
      text: skillsTxt(d),
      answer: d.skillGroups.map((g) => `${g.name}: ${g.skills.map((s) => s.name).join(', ')}`).join('. ') + '.',
      boost: ['skills', 'stack', 'tech', 'technologies', 'languages', 'know', 'tools'],
    },
    {
      id: 'education.md',
      title: 'Education',
      text: timelineMd(d, 'education'),
      answer: timelineMd(d, 'education').replace(/^## /gm, '').replace(/\n- /g, ', ').replace(/\n/g, '. '),
      boost: ['education', 'study', 'degree', 'university', 'college', 'gpa', 'cgpa', 'bits', 'graduate', 'graduation'],
    },
    {
      id: 'experience.md',
      title: 'Experience',
      text: timelineMd(d, 'work') + ` status ${d.status} available open roles remote`,
      answer: d.roles.length
        ? timelineMd(d, 'work').replace(/^## /gm, '').replace(/\n/g, '. ')
        : `No professional roles are listed yet; ${d.firstName} is currently ${d.status}.`,
      boost: ['experience', 'work', 'job', 'jobs', 'role', 'roles', 'available', 'open', 'remote', 'status'],
    },
    {
      id: 'interests.md',
      title: 'Interests',
      text: interestsMd(d),
      answer: `Outside work: ${d.interests.map((i) => i.name).join(', ')}.${d.achievements.length ? ` Medals: ${d.achievements.map((a) => a.title).join('; ')}.` : ''}`,
      boost: ['hobbies', 'interests', 'fun', 'running', 'marathon', 'gym', 'piano', 'books'],
    },
  ]
  for (const p of d.projects) {
    docs.push({
      id: `projects/${p.slug}.md`,
      title: p.title,
      text: projectMd(p) + ' project ' + p.slug,
      answer: `${p.title}: ${p.summary}${p.repoUrl ? ` (${p.repoUrl})` : ''}`,
      boost: [p.slug, ...tokens(p.title), ...p.tags.map((x) => x.toLowerCase())],
    })
  }
  return docs
}

export function createOfflineProvider(d) {
  const docs = buildDocs(d).map((doc) => ({ ...doc, toks: new Set(tokens(doc.text)), boost: new Set(doc.boost ?? []) }))
  return {
    name: 'offline · keyword retrieval over portfolio.json',
    async ask(question) {
      const q = tokens(question)
      if (!q.length) return { text: 'Ask me about projects, skills, education, or how to get in touch.', sources: [] }

      const scored = docs
        .map((doc) => {
          let score = 0
          for (const w of q) {
            if (doc.boost.has(w)) score += 3
            if (doc.toks.has(w)) score += 1
            else if (w.length > 3 && [...doc.toks].some((x) => x.startsWith(w))) score += 0.5
          }
          return { doc, score }
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)

      const asksProjects = q.some((w) => ['project', 'projects', 'built', 'build', 'portfolio', 'work'].includes(w))
      const projectHits = scored.filter((x) => x.doc.id.startsWith('projects/'))
      if (asksProjects && projectHits.length > 1 && (scored[0]?.doc.id.startsWith('projects/') || q.length <= 2)) {
        const top = projectHits.slice(0, 3)
        return { text: `Relevant projects: ${top.map((x) => x.doc.title).join(', ')}. ${top[0].doc.answer}`, sources: top.map((x) => x.doc.id) }
      }
      if (!scored.length) {
        return {
          text: `I couldn't find that in the portfolio. Try asking about projects, skills, education or contact. Or email ${d.email ?? d.firstName} directly.`,
          sources: [],
        }
      }
      return { text: scored[0].doc.answer, sources: scored.slice(0, 2).map((x) => x.doc.id) }
    },
  }
}

/** Hosted on a CDN and imported only on the first `ask`, so it never adds to the site's bundle. */
export const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm'
export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBED_MODEL_LABEL = 'all-MiniLM-L6-v2'

/** Browser loader: returns embed(texts) -> unit vectors. */
export async function loadBrowserEmbedder() {
  const { pipeline, env } = await import(/* @vite-ignore */ TRANSFORMERS_URL)
  env.allowLocalModels = false
  const extractor = await pipeline('feature-extraction', EMBED_MODEL, { dtype: 'q8' })
  return async (texts) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist()
}

const dot = (a, b) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/** Passages to embed: one per document plus one per project highlight and skill group. */
export function buildChunks(d) {
  const docs = buildDocs(d)
  const chunks = docs.map((doc) => ({ docId: doc.id, text: `${doc.title}. ${doc.answer}` }))
  for (const p of d.projects) {
    for (const h of p.highlights) chunks.push({ docId: `projects/${p.slug}.md`, text: `${p.title}: ${h}`, evidence: h })
    if (p.pipeline) chunks.push({ docId: `projects/${p.slug}.md`, text: `${p.title} works like this: ${p.pipeline.nodes.join(', then ')}.` })
  }
  for (const g of d.skillGroups) chunks.push({ docId: 'skills.txt', text: `${g.name}: ${g.skills.map((s) => s.name).join(', ')}`, evidence: `${g.name}: ${g.skills.map((s) => s.name).join(', ')}` })
  for (const f of d.focusAreas ?? []) chunks.push({ docId: 'interests.md', text: `Focus area: ${f.name}. ${f.summary ?? ''}` })
  return { docs, chunks }
}

/**
 * Hybrid retrieval. `loadEmbedder` is async () => embed(texts); without one
 * (tests, or when the model can't load) every question goes to `fallback`.
 */
export function createSemanticProvider(d, { loadEmbedder, fallback = createOfflineProvider(d), timeoutMs = 45000, weights = { semantic: 0.7, keyword: 0.3 } } = {}) {
  const { docs, chunks } = buildChunks(d)
  const keyword = docs.map((doc) => ({ ...doc, toks: new Set(tokens(doc.text)), boostSet: new Set(doc.boost ?? []) }))
  let ready = null
  let failed = false
  let done = false

  const prepare = () =>
    (ready ??= (async () => {
      const embed = await loadEmbedder()
      const vectors = await embed(chunks.map((c) => c.text))
      done = true
      return { embed, vectors }
    })().catch((err) => {
      failed = true
      throw err
    }))

  const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))])

  const keywordScores = (q) =>
    keyword.map((doc) => {
      let score = 0
      for (const w of q) {
        if (doc.boostSet.has(w)) score += 3
        if (doc.toks.has(w)) score += 1
      }
      return score
    })

  async function fallbackAnswer(question, note) {
    const a = await fallback.ask(question)
    return { ...a, via: 'keyword', note }
  }

  return {
    name: `semantic · ${EMBED_MODEL_LABEL} in your browser + keyword`,
    /** True once the model and the passage vectors are ready. */
    get loaded() {
      return done
    },
    /** Start loading the model early (e.g. while the question is being typed). */
    warm() {
      if (loadEmbedder && !failed) prepare().catch(() => {})
    },
    async ask(question) {
      const q = tokens(question)
      if (!q.length) return { text: 'Ask me about projects, skills, education, or how to get in touch.', sources: [], via: 'none' }
      if (!loadEmbedder || failed) return fallbackAnswer(question)
      let model
      try {
        model = await withTimeout(prepare())
      } catch (err) {
        return fallbackAnswer(question, err?.message === 'timeout' ? 'the embedding model is still loading; ask again in a moment for semantic search' : 'the embedding model could not load, so this used keyword search')
      }
      const [qv] = await model.embed([question])
      const sem = new Map()
      const best = new Map()
      model.vectors.forEach((v, i) => {
        const s = dot(qv, v)
        const id = chunks[i].docId
        if (s > (sem.get(id) ?? -1)) {
          sem.set(id, s)
          best.set(id, chunks[i])
        }
      })
      const kw = keywordScores(q)
      const kwMax = Math.max(1, ...kw)
      const ranked = docs
        .map((doc, i) => ({ doc, sem: sem.get(doc.id) ?? 0, score: weights.semantic * (sem.get(doc.id) ?? 0) + weights.keyword * (kw[i] / kwMax) }))
        .sort((a, b) => b.score - a.score)

      const top = ranked[0]
      if (!top || (top.sem < 0.2 && kw.every((k) => k === 0))) {
        return {
          text: `I couldn't find that in the portfolio. Try asking about projects, skills, education or contact. Or email ${d.email ?? d.firstName} directly.`,
          sources: [],
          via: 'semantic',
        }
      }
      const asksProjects = q.some((w) => ['project', 'projects', 'built', 'build', 'portfolio', 'work'].includes(w))
      const projectHits = ranked.filter((x) => x.doc.id.startsWith('projects/'))
      if (asksProjects && projectHits.length > 1 && top.doc.id.startsWith('projects/') && projectHits[1].score > top.score * 0.7) {
        const hits = projectHits.slice(0, 3)
        return {
          text: `Relevant projects: ${hits.map((x) => x.doc.title).join(', ')}. ${hits[0].doc.answer}`,
          sources: hits.map((x) => x.doc.id),
          evidence: best.get(hits[0].doc.id)?.evidence,
          via: 'semantic',
        }
      }
      return { text: top.doc.answer, sources: ranked.slice(0, 2).map((x) => x.doc.id), evidence: best.get(top.doc.id)?.evidence, via: 'semantic' }
    },
  }
}
