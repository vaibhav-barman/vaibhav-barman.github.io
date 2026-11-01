import type { Line, Span, Tone } from './types'

export const t = (text: string, tone?: Tone): Span => (tone ? { text, tone } : text)
export const link = (text: string, href: string): Span => ({ text, href })
/** A clickable span that runs `cmd` in the terminal. */
export const run = (text: string, cmd = text): Span => ({ text, cmd, tone: 'accent' })

export const blank: Line = ['']

export function heading(text: string): Line {
  return [t(`── ${text} `, 'accent2'), t('─'.repeat(Math.max(2, 36 - text.length)), 'dim')]
}

/** "████████░░" style bar; plain characters so it copies cleanly. */
export function bar(value: number, width = 16): string {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

/** Split text into lines no wider than `width` (for narrow screens / ASCII layouts). */
export function wrap(text: string, width: number): string[] {
  const out: string[] = []
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

export const lines = (...ls: (Line | string)[]): Line[] => ls.map((l) => (typeof l === 'string' ? [l] : l))

/** Turn URLs and e-mail addresses inside plain text into link spans. */
export function linkify(text: string, tone?: Tone): Span[] {
  const out: Span[] = []
  const re = /(https?:\/\/[^\s)]+)|([\w.+-]+@[\w-]+\.[\w.-]+)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(t(text.slice(last, m.index), tone))
    out.push(m[1] ? link(m[1], m[1]) : link(m[2], `mailto:${m[2]}`))
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(t(text.slice(last), tone))
  return out.length ? out : ['']
}
