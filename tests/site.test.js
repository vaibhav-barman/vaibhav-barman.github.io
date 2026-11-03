import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { renderHtml } from '../src/site/build.js'
import { normalize } from '../src/data/normalize.js'
import { esc } from '../src/site/util.js'

const d = normalize(raw)
const index = renderHtml(readFileSync('index.html', 'utf8'), raw)
const resume = renderHtml(readFileSync('resume.html', 'utf8'), raw, { isResume: true })

describe('generated HTML', () => {
  it('fills every placeholder', () => {
    for (const h of [index, resume]) expect(h).not.toMatch(/<!--(seo|theme|app|resume)-->/)
  })

  it('has SEO tags from the JSON', () => {
    expect(index).toContain(`<title>${esc(`${d.name} · ${d.role}`)}</title>`)
    expect(index).toContain('application/ld+json')
    expect(resume).toContain('Resume</title>')
  })

  it('renders every project and skill as text (works without JS)', () => {
    for (const p of d.projects) expect(index).toContain(p.title)
    for (const s of d.skills) expect(index).toContain(esc(s.name))
  })
})
