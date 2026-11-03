/**
 * Turns terminal output (lines of spans, see format.js) into HTML.
 * Used by the live terminal in the browser and by the build-time prerender,
 * so both look identical. Clickable commands become <button data-cmd>.
 */
import { config } from '../config.js'

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function spanHtml(span) {
  if (typeof span === 'string') return esc(span)
  const cls = span.tone ? ` class="t-${span.tone}"` : ''
  if (span.href) {
    const external = !span.href.startsWith('mailto:') && !span.href.startsWith('#')
    return `<a href="${esc(span.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(span.text)}</a>`
  }
  if (span.cmd) return `<button type="button" class="t-cmd" data-cmd="${esc(span.cmd)}" title="run: ${esc(span.cmd)}">${esc(span.text)}</button>`
  return `<span${cls}>${esc(span.text)}</span>`
}

export function lineHtml(line) {
  return `<div class="ln">${line.map(spanHtml).join('')}</div>`
}

export function linesHtml(lines) {
  return lines.map(lineHtml).join('')
}

export function promptText(cwd, handle) {
  return config.terminal.prompt
    .replace('{user}', config.terminal.user ?? handle)
    .replace('{host}', config.terminal.host)
    .replace('{cwd}', cwd)
}

/** The prompt with colours: user@host in the accent, the path in white. */
export function promptHtml(cwd, handle) {
  const text = promptText(cwd, handle)
  const m = text.match(/^(.*?)(:)(.*?)(\$)$/)
  if (!m) return `<span class="t-accent">${esc(text)}</span>`
  return `<span class="prompt"><span class="t-accent">${esc(m[1])}</span><span class="t-muted">${esc(m[2])}</span><span class="t-path">${esc(m[3])}</span><span class="t-muted">${esc(m[4])}</span></span>`
}

export function inputLineHtml(cwd, handle, text) {
  return `<div class="ln">${promptHtml(cwd, handle)} <span class="t-input">${esc(text)}</span></div>`
}
