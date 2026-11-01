import { describe, expect, it } from 'vitest'
import raw from '../../portfolio.json'
import { normalize, slugify } from './normalize'
import type { RawPortfolio } from './types'

describe('normalize', () => {
  const d = normalize(raw as RawPortfolio)

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

  it('groups skills by category', () => {
    expect(d.skillGroups.flatMap((g) => g.skills)).toHaveLength(d.skills.length)
  })
})
