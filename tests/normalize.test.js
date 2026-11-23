import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { monthLabel, normalize, slugify } from '../src/data/normalize.js'

describe('normalize', () => {
  const d = normalize(raw)

  it('lists the home-page projects first, in the page\'s order, and numbers all projects from 1', () => {
    expect(d.projects.map((p) => p.index)).toEqual(d.projects.map((_, i) => i + 1))
    const shown = d.projects.filter((p) => p.showcase)
    expect(d.projects.slice(0, shown.length)).toEqual(shown)
    // so `projects 2` in the terminal is "P / 02" on the page
    for (const p of shown) expect(p.index).toBe(p.slot)
    // the rest: featured first, then by category
    const rest = d.projects.slice(shown.length)
    const firstPlain = rest.findIndex((p) => !p.featured)
    expect(firstPlain === -1 || rest.slice(firstPlain).every((p) => !p.featured)).toBe(true)
  })

  it('without a showcase flag (older JSON) falls back to featured first, then category', () => {
    const old = normalize({
      name: 'A',
      summary: '',
      projects: [
        { title: 'Plain', summary: '', category: 'web' },
        { title: 'Star', summary: '', category: 'web', featured: true },
        { title: 'Agent', summary: '', category: 'agentic' },
      ],
    })
    expect(old.projects.map((p) => p.title)).toEqual(['Star', 'Agent', 'Plain'])
    expect(old.flagships).toEqual([])
  })

  it('derives unique slugs', () => {
    const slugs = d.projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugify('Recovery : AI Payment')).toBe('recovery-ai-payment')
  })

  it('falls back to url when repo_url is missing (backward compatible)', () => {
    const legacy = normalize({ name: 'A B', label: 'x', contact: {}, summary: 's', projects: [{ title: 'P', summary: 's', url: 'https://r' }] })
    expect(legacy.projects[0].repoUrl).toBe('https://r')
    expect(legacy.tagline).toBe('x')
    expect(legacy.skillGroups).toEqual([])
  })

  it('accepts flat (legacy) and grouped skills', () => {
    const flat = normalize({ name: 'A', label: 'x', summary: '', skills: [{ name: 'Python', category: 'Lang' }] })
    expect(flat.skillGroups[0]).toMatchObject({ name: 'Lang', skills: [{ name: 'Python' }] })
    const grouped = normalize({
      name: 'A',
      label: 'x',
      summary: '',
      skills: [{ category: 'Backend', note: 'n', items: ['FastAPI', { name: 'Alembic', note: 'migrations' }] }],
    })
    expect(grouped.skillGroups[0].note).toBe('n')
    expect(grouped.skills.map((s) => s.name)).toEqual(['FastAPI', 'Alembic'])
    expect(grouped.skills[1].note).toBe('migrations')
  })

  it('reads facts, ship month and pipeline for projects', () => {
    const g = d.projects.find((p) => p.slug === 'gitcommit-ai')
    expect(g.facts.length).toBeGreaterThan(0)
    expect(g.shippedLabel).toBe('Oct 2026')
    expect(g.pipeline.nodes[0]).toBeTruthy()
    expect(g.pipeline.loop).toMatchObject({ from: 4, to: 3 })
    expect(monthLabel('2026-13')).toBeUndefined()
    // an out-of-range loop is dropped, the chain is kept
    const bad = normalize({ name: 'A', summary: '', projects: [{ title: 'P', summary: '', pipeline: { nodes: ['a', 'b'], loop: { from: 0, to: 9 } } }] })
    expect(bad.projects[0].pipeline).toEqual({ nodes: ['a', 'b'], loop: undefined })
  })

  it('builds the journey from roles, education and ship months', () => {
    expect(d.roles).toHaveLength(1)
    expect(d.roles[0]).toMatchObject({ title: 'AI/ML Intern', org: 'Elevate Labs', when: '' })
    expect(d.education[0].org).toBe('BITS Pilani')
    const months = d.builds.map((b) => b.when)
    expect(months).toEqual(['Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'])
    // only projects with a known ship month appear (the newer showcase repos have none: no invented dates)
    expect(d.builds.flatMap((b) => b.projects)).toHaveLength(d.projects.filter((p) => p.shipped).length)
    expect(d.timeline.at(-1).kind).toBe('build')
  })

  it('splits the home page into flagships and more builds, in the author\'s order', () => {
    expect(d.flagships.map((p) => p.title)).toEqual(['Blog Writing Agent', 'Self-RAG', 'Corrective RAG'])
    expect(d.moreBuilds.map((p) => p.title)).toEqual(['GitCommit AI', 'LocalForge-AI', 'Glossa', 'AI Payment Recovery Agent', 'GNews MCP Server', 'Odyssey RAG'])
    expect([...d.flagships, ...d.moreBuilds].map((p) => p.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(d.flagships.every((p) => p.graph && p.pagePath)).toBe(true)
    // every showcased build has a wireframe solid; the rest stay out of the home page but in the model
    expect(d.moreBuilds.every((p) => p.solid)).toBe(true)
    const hidden = d.projects.filter((p) => !p.showcase).map((p) => p.title)
    expect(hidden).toEqual(expect.arrayContaining(['PromptRoute', 'Local YouTube Video Summarizer', 'ApplyIQ', 'Gemini Website Summarizer', 'Spendly']))
    expect(hidden).toHaveLength(5)
  })

  it('links to the real repos (canonical URLs)', () => {
    const url = (t) => d.projects.find((p) => p.title === t).repoUrl
    expect(url('Blog Writing Agent')).toBe('https://github.com/vaibhav-barman/blog-wriring-agent')
    expect(url('Self-RAG')).toBe('https://github.com/vaibhav-barman/self-rag')
    expect(url('Corrective RAG')).toBe('https://github.com/vaibhav-barman/corrective-rag')
    expect(url('Glossa')).toBe('https://github.com/vaibhav-barman/Glossa')
  })

  it('reads the hero and whoami copy from the JSON', () => {
    expect(d.subtitle).toBe('AI ENGINEER / AGENTS / RAG / MCP')
    expect(d.status).toBe('open to remote AI engineering roles')
    expect(d.taglines.length).toBeGreaterThanOrEqual(3)
    expect(d.manifest.map((r) => r.key)).toEqual(['name', 'role', 'builds', 'stack', 'principle', 'studying', 'status'])
    expect(d.manifest.find((r) => r.key === 'principle').value).toBe('checks over model opinion')
    expect(d.manifest.find((r) => r.key === 'studying').value).toBe('B.S. Computer Science @ BITS Pilani')
  })

  it('falls back sensibly when the new hero fields are missing', () => {
    const bare = normalize({ name: 'A B', label: 'AI Engineer | x', tagline: 't', summary: '' })
    expect(bare.taglines).toEqual(['t'])
    expect(bare.subtitle).toBe('AI Engineer')
    expect(bare.flagships).toEqual([])
    expect(bare.certifications).toEqual([])
    expect(bare.manifest.map((r) => r.key)).toEqual(['name', 'role', 'status'])
  })

  it('lists the five certifications, with an issuer only where one is known', () => {
    expect(d.certifications.map((c) => c.name)).toEqual([
      'AI Engineer Bootcamp 2026',
      'Complete MCP Developer Guide',
      'Mastering Ollama',
      'Docker & Kubernetes Fundamentals',
      'Deloitte Australia Data Analytics simulation',
    ])
    expect(d.certifications.map((c) => c.issuer)).toEqual([undefined, undefined, undefined, 'Scaler Academy', 'Forage'])
  })

  it('links skills to the projects that use them', () => {
    expect(d.skills.find((s) => s.slug === 'langgraph').projects).toEqual(expect.arrayContaining(['gitcommit-ai', 'localforge-ai']))
  })

  it('splits focus areas from off-screen interests', () => {
    expect(d.focusAreas.map((f) => f.name)).toContain('Local-First AI')
    expect(d.interests.map((f) => f.name)).not.toContain('Local-First AI')
  })

  it('groups skills by category', () => {
    expect(d.skillGroups.flatMap((g) => g.skills)).toHaveLength(d.skills.length)
  })
})

describe('portfolio.json content rules', () => {
  const d = normalize(raw)
  const BANNED = /\b(react|typescript|vite|tailwind(\s*css)?|javascript|scikit-learn|sklearn|seaborn)\b/i

  it('never lists React, TypeScript, Vite, Tailwind CSS or JavaScript as skills or tags', () => {
    for (const s of d.skills) expect(s.name).not.toMatch(BANNED)
    for (const p of d.projects) for (const tag of p.tags) expect(tag, p.title).not.toMatch(BANNED)
    for (const p of d.projects) for (const h of [p.summary, ...p.highlights]) expect(h, p.title).not.toMatch(BANNED)
    for (const tag of d.techTags) expect(tag).not.toMatch(BANNED)
  })

  it('keeps BeautifulSoup and "Structured output" out of the "also used" chips', () => {
    expect(d.techTags).not.toContain('BeautifulSoup')
    expect(d.techTags).not.toContain('Structured output')
  })

  it('has the expected skill groups, without proficiency numbers', () => {
    expect(d.skillGroups.map((g) => g.name)).toEqual([
      'Languages & Databases',
      'LLM & Agent Frameworks',
      'LLM Providers',
      'Vector DB & Cache',
      'Backend',
      'Cloud & DevOps',
      'Tools',
    ])
    expect(d.skills).toHaveLength(35)
    expect(JSON.stringify(raw.skills)).not.toMatch(/proficiency/)
  })

  it('lists exactly the stack from the brief', () => {
    const names = d.skills.map((s) => s.name)
    for (const want of [
      'Python', 'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'Neo4j / Cypher', 'LangGraph', 'LangChain', 'MCP', 'FastMCP', 'RAG', 'Ollama',
      'Claude Code', 'Anthropic', 'OpenAI', 'Gemini', 'Groq', 'NVIDIA', 'FastAPI', 'Pydantic', 'SQLAlchemy', 'Alembic', 'ChromaDB',
      'Pinecone', 'Redis', 'AWS S3', 'EC2', 'Lambda', 'Boto3', 'Docker', 'Nginx', 'Ubuntu', 'Git', 'GitHub',
    ]) {
      expect(names, want).toContain(want)
    }
    expect(names).not.toContain('Local LLMs')
    expect(names).not.toContain('SlowAPI')
  })
})
