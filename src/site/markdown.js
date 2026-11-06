/**
 * A deliberately small Markdown renderer for notes/*.md (build time only).
 * Supports: # headings, paragraphs, - / 1. lists, > quotes, ``` code fences,
 * `code`, **bold**, *italic*, [links](url) and --- rules. Everything is
 * escaped first, so raw HTML in a note is shown as text, never executed.
 */
import { esc } from './util.js'

function inline(text) {
  const codes = []
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`)
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const safe = /^(https?:|mailto:|\/|#)/.test(url) ? url : '#'
      const ext = /^https?:/.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${safe}"${ext}>${label}</a>`
    })
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`)
}

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let i = 0
  const isBlockStart = (l) => /^(#{1,4}\s|```|>\s?|[-*]\s|\d+\.\s|---\s*$)/.test(l)
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    let m
    if ((m = /^```(\w*)\s*$/.exec(line))) {
      const body = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++])
      i++
      out.push(`<pre><code${m[1] ? ` class="language-${esc(m[1])}"` : ''}>${esc(body.join('\n'))}</code></pre>`)
    } else if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
      // A note's own title is the page <h1>, so # in the body becomes <h2>.
      const level = Math.min(4, m[1].length + 1)
      out.push(`<h${level}>${inline(m[2])}</h${level}>`)
      i++
    } else if (/^---\s*$/.test(line)) {
      out.push('<hr>')
      i++
    } else if (/^>\s?/.test(line)) {
      const body = []
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''))
      out.push(`<blockquote>${renderMarkdown(body.join('\n'))}</blockquote>`)
    } else if (/^([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\d+\./.test(line)
      const items = []
      while (i < lines.length && /^([-*]|\d+\.)\s/.test(lines[i])) {
        let item = lines[i++].replace(/^([-*]|\d+\.)\s+/, '')
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(`<li>${inline(item)}</li>`)
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`)
    } else {
      const body = []
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) body.push(lines[i++].trim())
      out.push(`<p>${inline(body.join(' '))}</p>`)
    }
  }
  return out.join('\n')
}

/**
 * Splits "---\nkey: value\n---\nbody" into { meta, body }. Values are strings;
 * `true` / `false` become booleans.
 */
export function parseFrontMatter(src) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src.replace(/\r\n?/g, '\n'))
  if (!m) return { meta: {}, body: src }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line)
    if (!kv) continue
    let v = kv[2].trim().replace(/^(['"])(.*)\1$/, '$2')
    if (v === 'true') v = true
    else if (v === 'false') v = false
    meta[kv[1]] = v
  }
  return { meta, body: m[2] }
}
