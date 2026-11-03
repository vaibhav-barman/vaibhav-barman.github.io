/**
 * Build-time entry used by vite.config.js: turns portfolio.json into the
 * HTML that goes into index.html and resume.html.
 */
import { normalize } from '../data/normalize.js'
import { cssVariables, theme } from '../theme.js'
import { page } from './page.js'
import { resumeContent } from './resume.js'
import { seoHead } from './seo.js'

export function renderHtml(template, raw, { isResume = false } = {}) {
  const d = normalize(raw)
  return template
    .replace('<!--theme-->', `<meta name="theme-color" content="${theme.background}">\n    <style>:root{${cssVariables()}}</style>`)
    .replace('<!--seo-->', seoHead(d, isResume ? { path: 'resume.html', title: `${d.name} · Resume` } : {}))
    .replace('<!--app-->', page(d))
    .replace('<!--resume-->', resumeContent(d))
}
