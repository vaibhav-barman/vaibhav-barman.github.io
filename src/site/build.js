/**
 * Build-time entry used by vite.config.js: turns portfolio.json (and the
 * Markdown notes) into the HTML for index.html, resume.html and the
 * standalone project / note pages.
 */
import { normalize } from '../data/normalize.js'
import { cssVariables, theme } from '../theme.js'
import { pwaHead } from '../pwa/manifest.js'
import { page } from './page.js'
import { allPages } from './pages.js'
import { resumeContent } from './resume.js'
import { seoHead } from './seo.js'

/** The view model: portfolio.json plus the published notes (build time only). */
export function model(raw, { notes = [] } = {}) {
  return { ...normalize(raw), notes }
}

const themeHead = () => `<meta name="theme-color" content="${theme.background}">\n    <style>:root{${cssVariables()}}</style>\n    ${pwaHead()}`

export function renderHtml(template, raw, { isResume = false, notes = [] } = {}) {
  const d = model(raw, { notes })
  return template
    .replace('<!--theme-->', themeHead())
    .replace('<!--seo-->', seoHead(d, isResume ? { path: 'resume.html', title: `${d.name} · Resume` } : {}))
    .replace('<!--app-->', page(d))
    .replace('<!--resume-->', resumeContent(d))
}

/**
 * Fills the page.html template (already processed by Vite, so it has the
 * built CSS) once per standalone page. Returns [{ path, html }].
 */
export function renderPages(template, raw, { notes = [] } = {}) {
  const d = model(raw, { notes })
  return allPages(d).map((p) => ({
    path: p.path,
    html: template
      .replace('<!--theme-->', themeHead())
      .replace('<!--page-seo-->', seoHead(d, { path: p.path, title: p.title, description: p.description, type: 'article' }))
      .replace('<!--page-body-->', p.body),
  }))
}
