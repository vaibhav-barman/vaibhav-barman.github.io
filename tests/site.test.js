import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { renderHtml } from '../src/site/build.js'
import { normalize } from '../src/data/normalize.js'
import { esc } from '../src/site/util.js'

const d = normalize(raw)
const index = renderHtml(readFileSync('index.html', 'utf8'), raw)
const resume = renderHtml(readFileSync('resume.html', 'utf8'), raw, { isResume: true })
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const slice = (from, to) => index.slice(index.indexOf(from), to ? index.indexOf(to) : undefined)
const re = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

describe('generated HTML', () => {
  it('fills every placeholder', () => {
    for (const h of [index, resume]) expect(h).not.toMatch(/<!--(seo|theme|app|resume)-->/)
  })

  it('has SEO tags from the JSON', () => {
    expect(index).toContain(`<title>${esc(`${d.name} · ${d.role}`)}</title>`)
    expect(index).toContain('application/ld+json')
    expect(resume).toContain('Resume</title>')
  })

  it('is black: theme-color, color-scheme and the injected variables', () => {
    expect(index).toContain('<meta name="theme-color" content="#000000">')
    expect(index).toContain('<meta name="color-scheme" content="dark" />')
    expect(index).toContain('--bg:#000000')
    expect(index).not.toContain('--accent')
  })

  it('renders every showcased project and skill as text (works without JS)', () => {
    for (const p of [...d.flagships, ...d.moreBuilds]) expect(index).toContain(esc(p.title))
    for (const s of d.skills) expect(index).toContain(esc(s.name))
  })

  it('has exactly one h1 and no skipped heading levels', () => {
    expect(index.match(/<h1[ >]/g)).toHaveLength(1)
    const levels = [...index.matchAll(/<h([1-4])[ >]/g)].map((m) => Number(m[1]))
    levels.forEach((l, i) => i && expect(l - levels[i - 1], `h${levels[i - 1]} → h${l} at #${i}`).toBeLessThanOrEqual(1))
  })

  it('never reuses an id (many inline SVGs share the page)', () => {
    const ids = [...index.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toEqual([])
    // every url(#...) and aria-labelledby points at something that exists
    for (const m of index.matchAll(/url\(#([^)]+)\)/g)) expect(ids, `url(#${m[1]})`).toContain(m[1])
    for (const m of index.matchAll(/aria-labelledby="([^"]+)"/g)) for (const id of m[1].split(' ')) expect(ids, `aria-labelledby ${id}`).toContain(id)
  })

  it('has no image without alt text and no unlabelled informative svg', () => {
    expect(index).not.toMatch(/<img(?![^>]*\balt=)/)
    for (const m of index.matchAll(/<svg\b([^>]*)>/g)) {
      expect(m[1], m[0].slice(0, 80)).toMatch(/aria-hidden="true"|role="img"/)
    }
  })

  it('lets visitors without JavaScript read everything (no content is hidden by default)', () => {
    // [data-reveal] is only hidden under html.js (added by an inline script), never in the markup
    expect(index).not.toMatch(/data-reveal[^>]*style="[^"]*opacity/)
    expect(index).toContain("document.documentElement.classList.add('js')")
  })
})

describe('nav', () => {
  const navHtml = slice('<header class="nav"', '</header>')
  it('reads brand | links | CTA, left to right', () => {
    const order = ['class="brand"', 'class="nav-links"', 'nav-cta'].map((k) => navHtml.indexOf(k))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
  it('does not contain the location or a status pill', () => {
    expect(navHtml).not.toContain(d.location)
    expect(navHtml).not.toContain(esc(d.status))
  })
  it('links to every numbered section', () => {
    for (const id of ['about', 'projects', 'builds', 'skills', 'journey', 'contact']) expect(navHtml).toContain(`data-nav="${id}"`)
  })
})

describe('hero', () => {
  const hero = slice('<section id="hero"', '<section id="about"')
  it('has the name in chrome type: light first name, heavy last name', () => {
    expect(hero).toMatch(/<h1 id="hero-title" class="hero-name chrome sheen">Vaibhav <strong>Barman<\/strong><\/h1>/)
  })
  it('shows the subtitle and the open-to-work status from the JSON', () => {
    expect(text(hero)).toContain('AI ENGINEER / AGENTS / RAG / MCP')
    expect(text(hero)).toContain('open to remote AI engineering roles')
    expect(hero).toContain('class="dot"') // the blinking dot
  })
  it('has a typed line with a block caret, first tagline prerendered and the rest in data-lines', () => {
    expect(hero).toContain('class="caret"')
    expect(hero).toContain(`>${esc(d.taglines[0])}</span>`)
    const lines = JSON.parse(hero.match(/data-lines="([^"]+)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<'))
    expect(lines).toEqual(d.taglines)
  })
  it('lists all nine showcased builds as links (the 3D nodes are built from these)', () => {
    const links = [...hero.matchAll(/<a href="([^"]+)"[^>]*data-node="([^"]+)" data-ring="(\d)"/g)]
    expect(links).toHaveLength(9)
    expect(links.map((m) => m[3]).join('')).toBe('000111111')
    expect(links[0][1]).toBe('https://github.com/vaibhav-barman/blog-wriring-agent')
    expect(links.map((m) => m[2])).toEqual([...d.flagships, ...d.moreBuilds].map((p) => p.slug))
  })
  it('stands in for 3D with an animated chrome sphere, and has GitHub, LinkedIn and Resume links', () => {
    expect(hero).toContain('class="hero-fallback"')
    expect(hero).toMatch(/<svg class="sphere"[\s\S]*<animate /)
    const links = hero.slice(hero.indexOf('class="hero-links"'))
    for (const l of ['GitHub', 'LinkedIn', 'Resume']) expect(links).toContain(`>${l}`)
  })
  it('no longer prerenders the terminal (it loads on demand from the whoami section)', () => {
    expect(index).not.toContain('id="terminal"')
    expect(index).toContain('id="shell-open"')
  })
})

describe('numbered sections', () => {
  const heads = [...index.matchAll(/<span class="sec-num[^"]*" aria-hidden="true">(\d\d)<\/span>[\s\S]*?<h2 id="([^"]+)" class="sec-label">([^<]+)<\/h2>/g)].map((m) => [m[1], m[3].replace(/&amp;/g, '&')])
  it('reads 01 / WHOAMI through 06 / OPEN A CHANNEL, in order', () => {
    expect(heads).toEqual([
      ['01', 'whoami'],
      ['02', 'flagship builds'],
      ['03', 'more builds'],
      ['04', 'stack'],
      ['05', 'experience & credentials'],
      ['06', 'open a channel'],
    ])
  })
})

describe('01 whoami', () => {
  const who = slice('<section id="about"', '<section id="projects"')
  it('is a terminal-style manifest card with every row from the JSON', () => {
    expect(who).toContain('whoami --verbose')
    const keys = [...who.matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1])
    expect(keys).toEqual(['name', 'role', 'builds', 'stack', 'principle', 'studying', 'status'])
    for (const r of d.manifest) expect(text(who)).toContain(r.value)
    expect(text(who)).toContain('checks over model opinion')
    expect(text(who)).toContain('B.S. Computer Science @ BITS Pilani')
    expect(who).toContain('IDENTITY.LOAD() · OK')
  })
  it('has crop marks, fade-in rows and a rotating wireframe solid', () => {
    expect(who).toContain('class="cm tl"')
    expect((who.match(/class="mrow" data-reveal/g) ?? []).length).toBe(7)
    expect(who).toContain('<canvas class="solid whoami-solid"')
  })
})

describe('02 flagship builds', () => {
  const pr = slice('<section id="projects"', '<section id="builds"')
  const cards = pr.split('<article class="flagship panel"').slice(1)
  it('has one large card per flagship, linking to the real repos', () => {
    expect(cards).toHaveLength(3)
    expect(pr).toContain('href="https://github.com/vaibhav-barman/blog-wriring-agent"')
    expect(pr).toContain('href="https://github.com/vaibhav-barman/self-rag"')
    expect(pr).toContain('href="https://github.com/vaibhav-barman/corrective-rag"')
  })
  it('gives each an animated diagram in both layouts, with glowing packets on every route', () => {
    for (const [i, c] of cards.entries()) {
      const routes = d.flagships[i].graph.routes.length
      expect(c, d.flagships[i].title).toContain('class="fx-svg fx-wide"')
      expect(c).toContain('class="fx-svg fx-tall"')
      // each route is one packet (a glow plus four dots) in each of the two layouts
      expect((c.match(/<g class="fx-packet">/g) ?? []).length).toBe(routes * 2)
      expect(c).toContain('<animateMotion')
      expect(c).toContain('fx-r') // route captions
    }
  })
  it('keeps the diagram accessible: a labelled wide svg, a decorative tall one, a text list of routes', () => {
    for (const c of cards) {
      expect(c).toMatch(/<svg class="fx-svg fx-wide"[^>]*role="img" aria-label="How [^"]+ works"/)
      expect(c).toMatch(/<svg class="fx-svg fx-tall"[^>]*aria-hidden="true"/)
      expect(c).toMatch(/<figcaption class="sr-only">How [^.]+ works\. Routes: /)
    }
  })
  it('shows facts, highlights and stack from the JSON, and nothing the code does not do', () => {
    const [blog, self, crag] = cards
    expect(blog).toContain('Send per section')
    expect(blog).toContain('worker N')
    expect(blog).toContain('Tavily')
    expect(self).toContain('ISREL')
    expect(self).not.toMatch(/Tavily|web search/i) // Self-RAG has no web fallback
    expect(crag).toContain('0.7')
    expect(crag).toContain('Pinecone')
    for (const [i, c] of cards.entries()) for (const f of d.flagships[i].facts) expect(c).toContain(esc(f.label))
  })
})

describe('03 more builds', () => {
  const b = slice('<section id="builds"', '<section id="skills"')
  it('is a grid of six cards in the author order, each with a wireframe solid', () => {
    const titles = [...b.matchAll(/class="build-title">([^<]+)</g)].map((m) => m[1])
    expect(titles).toEqual(['GitCommit AI', 'LocalForge-AI', 'Glossa', 'AI Payment Recovery Agent', 'GNews MCP Server', 'Odyssey RAG'])
    expect((b.match(/<canvas class="solid build-solid" data-solid="[a-z]+"/g) ?? []).length).toBe(6)
    expect(b).toContain('href="https://github.com/vaibhav-barman/Glossa"')
  })
  it('keeps the projects that are not showcased off the page', () => {
    for (const t of ['PromptRoute', 'Local YouTube Video Summarizer', 'ApplyIQ', 'Gemini Website Summarizer', 'Spendly']) expect(index, t).not.toContain(t)
  })
})

describe('04 stack', () => {
  const sk = slice('<section id="skills"', '<section id="journey"')
  it('shows every skill as a monochrome chip, grouped, with no percentages or ratings', () => {
    for (const g of d.skillGroups) expect(sk).toContain(esc(g.name))
    for (const s of d.skills) expect(sk).toMatch(new RegExp(`data-skill="${s.slug}"[^>]*>${re(esc(s.name))}`))
    expect(sk).not.toMatch(/\d+%|role="meter"|★/)
  })
  it('lists the brief\'s stack, including Neo4j / Cypher and Pinecone', () => {
    for (const name of ['Python', 'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'Neo4j / Cypher', 'LangGraph', 'LangChain', 'FastMCP', 'Ollama', 'Claude Code', 'Pinecone', 'Redis', 'Boto3', 'Nginx', 'Ubuntu']) {
      expect(sk, name).toContain(esc(name))
    }
  })
  it('never lists React, TypeScript, scikit-learn, seaborn (or Vite, Tailwind, JavaScript)', () => {
    for (const h of [sk, index.slice(index.indexOf('<section id="projects"'), index.indexOf('<section id="journey"'))]) {
      expect(h).not.toMatch(/\b(React|TypeScript|scikit-learn|sklearn|seaborn|Vite|Tailwind|JavaScript)\b/i)
    }
  })
})

describe('05 experience & credentials', () => {
  const j = slice('<section id="journey"', '<section id="contact"')
  it('has the internship, the degree and every certification', () => {
    expect(text(j)).toContain('AI/ML Intern')
    expect(text(j)).toContain('Elevate Labs')
    expect(text(j)).toContain('BITS Pilani')
    expect(text(j)).toContain('B.S. in Computer Science')
    for (const c of d.certifications) expect(text(j)).toContain(c.name)
    expect(text(j)).toContain('Scaler Academy')
    expect(text(j)).toContain('Forage')
  })
  it('invents no dates for the internship', () => {
    const at = j.indexOf('AI/ML Intern')
    const item = j.slice(j.lastIndexOf('<li class="tl-item">', at), j.indexOf('</li>', at))
    expect(item).toContain('Elevate Labs')
    expect(item).not.toContain('tl-when')
  })
})

describe('06 contact + footer', () => {
  const c = slice('<section id="contact"', '<footer')
  it('has GitHub, LinkedIn, email and the resume', () => {
    expect(c).toContain('https://github.com/vaibhav-barman')
    expect(c).toContain('linkedin.com/in/vaibhavbarman')
    expect(c).toContain('href="mailto:vaibhavbarman2609@gmail.com"')
    expect(c).toContain('href="/resume.html"')
  })
  it('has a copy-email button that is hidden until JS enables it', () => {
    expect(index).toMatch(/<button type="button" class="btn copy-btn" data-copy="[^"]+" hidden>/)
  })
  it('ends with a small chrome sphere and END OF TRANSMISSION', () => {
    const f = index.slice(index.indexOf('<footer'))
    expect(f).toContain('class="sphere sphere-sm"')
    expect(f).toContain('END OF TRANSMISSION')
  })
})
