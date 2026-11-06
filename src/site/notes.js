/**
 * Notes: one Markdown file per note in /notes, with front matter:
 *
 *   ---
 *   title: How I evaluate my RAG pipeline
 *   date: 2026-11-06
 *   summary: One sentence for the card on the home page.
 *   draft: true        # drafts are not published
 *   ---
 *
 * Read at build time only (Node). Published notes get a card in the Notes
 * section and a page at /notes/<file-name>.html.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { slugify } from '../data/normalize.js'
import { parseFrontMatter, renderMarkdown } from './markdown.js'

const dateLabel = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Parses one note file. Exported for tests. */
export function parseNote(fileName, src) {
  const { meta, body } = parseFrontMatter(src)
  const slug = slugify(fileName.replace(/\.md$/, ''))
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(meta.date ?? '')) ? meta.date : ''
  return {
    slug,
    path: `notes/${slug}.html`,
    title: meta.title || slug,
    date,
    dateLabel: date ? dateLabel(date) : '',
    summary: meta.summary || '',
    draft: meta.draft === true,
    html: renderMarkdown(body),
  }
}

/** Published notes, newest first. `includeDrafts` is for local previews. */
export function loadNotes(dir, { includeDrafts = false } = {}) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md')
    .map((f) => parseNote(f, readFileSync(join(dir, f), 'utf8')))
    .filter((n) => includeDrafts || !n.draft)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}
