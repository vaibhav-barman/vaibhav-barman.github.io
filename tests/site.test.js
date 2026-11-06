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

describe('nav', () => {
  const navHtml = index.slice(index.indexOf('<header class="nav"'), index.indexOf('</header>'))
  it('reads brand | links | CTA, left to right', () => {
    const order = ['class="brand"', 'class="nav-links"', 'nav-cta'].map((k) => navHtml.indexOf(k))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
  it('does not contain the location or a status pill', () => {
    expect(navHtml).not.toContain(d.location)
    expect(navHtml).not.toContain('nav-status')
    expect(navHtml).not.toContain(esc(d.status))
  })
})

describe('hero', () => {
  const hero = index.slice(index.indexOf('<section id="hero"'), index.indexOf('<section id="about"'))
  it('puts the text first and the terminal second (right half on desktop)', () => {
    expect(hero.indexOf('class="hero-copy"')).toBeLessThan(hero.indexOf('class="hero-terminal"'))
    expect(hero).toContain('id="terminal"')
  })
  it('shows the name, title and buttons, with no status pill', () => {
    expect(hero).toContain(d.firstName)
    expect(hero.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')).toContain('AI Engineer | LLM Applications, RAG &amp; AI Agents')
    expect(hero).not.toMatch(/class="(badge|dot|nav-status)"/)
    for (const label of ['Projects', 'Resume', 'GitHub', 'LinkedIn']) expect(hero).toContain(`>${label}`)
  })
  it('prerenders whoami in the terminal so it is never empty', () => {
    expect(hero).toContain('vaibhav@portfolio')
    expect(hero).toContain(esc(d.tagline))
  })
})

describe('skills section', () => {
  const sk = index.slice(index.indexOf('<section id="skills"'), index.indexOf('<section id="journey"'))
  it('shows every skill as a chip, grouped, with no percentages or ratings', () => {
    for (const g of d.skillGroups) expect(sk).toContain(esc(g.name))
    for (const s of d.skills) expect(sk).toMatch(new RegExp(`data-skill="${s.slug}"[^>]*>${esc(s.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    expect(sk).not.toMatch(/\d+%|role="meter"|★/)
  })
  it('never mentions React, TypeScript, Vite, Tailwind or JavaScript', () => {
    const projectsHtml = index.slice(index.indexOf('<section id="projects"'), index.indexOf('<section id="skills"'))
    for (const h of [sk, projectsHtml]) expect(h).not.toMatch(/\b(React|TypeScript|Vite|Tailwind|JavaScript)\b/i)
  })
})

describe('projects section', () => {
  const pr = index.slice(index.indexOf('<section id="projects"'), index.indexOf('<section id="skills"'))
  it('shows facts, ship month, a thumbnail and the first highlights inline', () => {
    const g = d.projects.find((p) => p.slug === 'gitcommit-ai')
    expect(pr).toContain('class="project-facts"')
    expect(pr).toContain(`${g.shippedLabel}</span>`)
    expect(pr).toContain(esc(g.highlights[0]))
    expect(pr).toContain('href="/projects/gitcommit-ai.html"')
  })
})

describe('journey + contact', () => {
  const j = index.slice(index.indexOf('<section id="journey"'), index.indexOf('<section id="contact"'))
  it('lists shipped months with links to the projects', () => {
    for (const b of d.builds) expect(j).toContain(b.when)
    expect(j).toContain('href="#p-gitcommit-ai"')
  })
  it('has a copy-email button that is hidden until JS enables it', () => {
    expect(index).toMatch(/<button type="button" class="btn copy-btn" data-copy="[^"]+" hidden>/)
  })
})
