/**
 * Helpers for building terminal output.
 *
 * A command returns an array of *lines*; each line is an array of *spans*.
 * A span is a plain string, or an object:
 *   { text, tone?, href?, cmd? }
 *   tone: 'accent' | 'muted' | 'dim' | 'bold' | 'ok' | 'error' | 'heading'
 *   href: renders as a link        cmd: renders as a button that runs `cmd`
 */

export const t = (text, tone) => (tone ? { text, tone } : text)
export const link = (text, href) => ({ text, href })
/** A clickable span that runs `cmd` in the terminal. */
export const run = (text, cmd = text) => ({ text, cmd, tone: 'accent' })

export const blank = ['']

export function heading(text) {
  return [t(`── ${text} `, 'heading'), t('─'.repeat(Math.max(2, 36 - text.length)), 'dim')]
}

export function pad(s, n) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

/** Split text into lines no wider than `width`. */
export function wrap(text, width) {
  const out = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      if (!word) continue
      if ((line + ' ' + word).trim().length > width) {
        if (line) out.push(line)
        line = word
      } else line = line ? `${line} ${word}` : word
    }
    out.push(line)
  }
  return out
}

/** Turn URLs and e-mail addresses inside plain text into link spans. */
export function linkify(text, tone) {
  const out = []
  const re = /(https?:\/\/[^\s)]+)|([\w.+-]+@[\w-]+\.[\w.-]+)/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(t(text.slice(last, m.index), tone))
    out.push(m[1] ? link(m[1], m[1]) : link(m[2], `mailto:${m[2]}`))
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(t(text.slice(last), tone))
  return out.length ? out : ['']
}

/** Plain text of some output lines (used by tests and the no-JS prerender). */
export function toText(lines) {
  return lines.map((l) => l.map((s) => (typeof s === 'string' ? s : s.text)).join('')).join('\n')
}
