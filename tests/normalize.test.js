import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { monthLabel, normalize, slugify } from '../src/data/normalize.js'

describe('normalize', () => {
  const d = normalize(raw)

  it('lists featured projects first and numbers them from 1', () => {
    const firstNonFeatured = d.projects.findIndex((p) => !p.featured)
    expect(d.projects.slice(firstNonFeatured).every((p) => !p.featured)).toBe(true)
    expect(d.projects.map((p) => p.index)).toEqual(d.projects.map((_, i) => i + 1))
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
    expect(d.roles).toEqual([])
    expect(d.education[0].org).toBe('BITS Pilani')
    const months = d.builds.map((b) => b.when)
    expect(months).toEqual(['Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'])
    expect(d.builds.flatMap((b) => b.projects)).toHaveLength(d.projects.length)
    expect(d.timeline.at(-1).kind).toBe('build')
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
  const BANNED = /\b(react|typescript|vite|tailwind(\s*css)?|javascript)\b/i

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
    expect(d.skills).toHaveLength(34)
    expect(JSON.stringify(raw.skills)).not.toMatch(/proficiency/)
  })
})
