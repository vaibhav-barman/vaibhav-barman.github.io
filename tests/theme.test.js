import { describe, expect, it } from 'vitest'
import { appIconSvg, cssVariables, faviconSvg, theme } from '../src/theme.js'

// WCAG 2.x relative luminance / contrast ratio
const lum = (hex) => {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const GREYS = ['background', 'surface', 'line', 'line2', 'lineHi', 'crop', 'dim', 'mid', 'text', 'white']

describe('theme tokens', () => {
  it('are exactly the profile README design tokens', () => {
    expect(theme).toMatchObject({
      background: '#000000',
      surface: '#050505',
      line: '#1a1a1a',
      line2: '#2a2a2a',
      dim: '#6b6b6b',
      mid: '#a3a3a3',
      text: '#ededed',
      white: '#ffffff',
    })
  })

  it('are all pure greys (r = g = b)', () => {
    for (const k of GREYS) {
      const [r, g, b] = theme[k].replace('#', '').match(/../g)
      expect(r === g && g === b, `${k} ${theme[k]}`).toBe(true)
    }
  })

  it('has no accent, secondary, error or presets', () => {
    for (const k of ['accent', 'secondary', 'error', 'presets', 'muted']) expect(theme[k]).toBeUndefined()
  })

  it('keeps readable text at WCAG AA (4.5:1) on the background and on panels', () => {
    for (const bg of [theme.background, theme.surface]) {
      expect(contrast(theme.text, bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.mid, bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.white, bg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps dim text decorative: at least 3:1 (UI/large) but documented as below AA for small text', () => {
    expect(contrast(theme.dim, theme.background)).toBeGreaterThanOrEqual(3)
    expect(contrast(theme.dim, theme.background)).toBeLessThan(4.5)
  })

  it('uses the reference chrome gradient', () => {
    expect(theme.chrome).toBe('linear-gradient(100deg, #6f6f6f 0%, #ffffff 22%, #9c9c9c 45%, #f2f2f2 62%, #6a6a6a 80%, #d9d9d9 100%)')
  })

  it('uses Helvetica Neue / Inter / system sans and a system mono stack', () => {
    expect(theme.fonts.sans.startsWith("'Helvetica Neue'")).toBe(true)
    expect(theme.fonts.sans).toContain('Inter')
    expect(theme.fonts.mono.startsWith('ui-monospace')).toBe(true)
    expect(theme.fonts.mono).toContain('Menlo')
  })

  it('emits every token as a CSS variable', () => {
    const vars = cssVariables()
    for (const v of ['--bg', '--panel', '--line', '--line2', '--dim', '--mid', '--text', '--white', '--chrome', '--font-sans', '--font-mono']) {
      expect(vars).toContain(v + ':')
    }
    expect(vars).not.toContain('--accent')
  })

  it('draws the favicon and app icon as a chrome ball on black', () => {
    for (const svg of [faviconSvg(), appIconSvg(1.4)]) {
      expect(svg).toContain('<circle')
      expect(svg).toContain('fill="#000000"')
      expect(svg).toContain('linearGradient')
    }
  })
})
