import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { model, renderHtml, renderPages } from '../src/site/build.js'
import { parseFrontMatter, renderMarkdown } from '../src/site/markdown.js'
import { loadNotes, parseNote } from '../src/site/notes.js'
import { sitemapXml } from '../src/site/pages.js'

const note = parseNote(
  'how-i-eval.md',
  `---
title: How I evaluate
date: 2026-11-01
summary: Recall@K and MRR.
---
# Why
Some **bold** and \`code\` and [a link](https://example.com).

- one
- two

\`\`\`py
print("<hi>")
\`\`\`
`,
)

describe('markdown + notes', () => {
  it('parses front matter', () => {
    expect(parseFrontMatter('---\ntitle: A\ndraft: true\n---\nbody')).toEqual({ meta: { title: 'A', draft: true }, body: 'body' })
  })
  it('renders the supported subset and escapes HTML', () => {
    const h = renderMarkdown('# T\n\n<script>x</script> **b** *i* `c` [l](javascript:alert(1))\n\n1. a\n2. b')
    expect(h).toContain('<h2>T</h2>')
    expect(h).toContain('&lt;script&gt;')
    expect(h).toContain('<strong>b</strong>')
    expect(h).toContain('<em>i</em>')
    expect(h).toContain('<code>c</code>')
    expect(h).toContain('href="#"') // unsafe URL neutralised
    expect(h).toContain('<ol><li>a</li><li>b</li></ol>')
  })
  it('turns a note file into a page model', () => {
    expect(note).toMatchObject({ slug: 'how-i-eval', path: 'notes/how-i-eval.html', title: 'How I evaluate', dateLabel: '1 Nov 2026', draft: false })
    expect(note.html).toContain('<pre><code class="language-py">print(&quot;&lt;hi&gt;&quot;)</code></pre>')
  })
  it('does not publish drafts from notes/', () => {
    for (const n of loadNotes('notes')) expect(n.draft).toBe(false)
    expect(loadNotes('notes', { includeDrafts: true }).length).toBeGreaterThanOrEqual(loadNotes('notes').length)
  })
})

describe('standalone pages', () => {
  const template = readFileSync('page.html', 'utf8')
  const pages = renderPages(template, raw, { notes: [note] })
  const d = model(raw, { notes: [note] })

  it('builds one page per featured project and per note', () => {
    const featured = d.projects.filter((p) => p.featured).map((p) => p.pagePath)
    expect(pages.map((p) => p.path)).toEqual([...featured, 'notes/how-i-eval.html'])
    for (const p of pages) expect(p.html).not.toMatch(/<!--(theme|page-seo|page-body)-->/)
  })

  it('project pages show facts, the pipeline diagram and its text version', () => {
    const g = pages.find((p) => p.path === 'projects/gitcommit-ai.html').html
    expect(g).toContain('<h1 id="page-title" class="page-title">GitCommit AI</h1>')
    expect(g).toContain('class="project-facts"')
    expect(g).toMatch(/<svg class="pipeline"[^>]*role="img"/)
    expect(g).toContain('class="pipeline-steps"')
    expect(g).toContain('<link rel="canonical" href="https://vaibhav-barman.github.io/projects/gitcommit-ai.html">')
    expect(g).toContain('og:type" content="article"')
  })

  it('shows the Notes section and nav link only when there are notes', () => {
    const withNotes = renderHtml(readFileSync('index.html', 'utf8'), raw, { notes: [note] })
    const without = renderHtml(readFileSync('index.html', 'utf8'), raw)
    expect(withNotes).toContain('id="notes"')
    expect(withNotes).toContain('data-nav="notes"')
    expect(without).not.toContain('id="notes"')
    expect(without).not.toContain('data-nav="notes"')
  })

  it('lists every page in the sitemap', () => {
    const xml = sitemapXml(d)
    for (const p of pages) expect(xml).toContain(`${d.baseUrl}/${p.path}`)
  })
})
