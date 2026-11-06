import { describe, expect, it } from 'vitest'
import { theme } from '../src/theme.js'

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

describe('theme', () => {
  it('uses a single accent colour', () => {
    expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/i)
    expect(theme.presets.blue).toBe('#3b82f6')
    expect(theme.secondary).toMatch(/^#[0-9a-f]{6}$/i)
    expect(theme.secondary.toLowerCase()).not.toBe(theme.accent.toLowerCase())
  })

  it('keeps every text colour at WCAG AA (4.5:1) or better', () => {
    for (const bg of [theme.background, theme.surface]) {
      expect(contrast(theme.text, bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.muted, bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.error, bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.secondary, bg), `secondary on ${bg}`).toBeGreaterThanOrEqual(4.5)
      for (const accent of [theme.accent, ...Object.values(theme.presets)]) {
        expect(contrast(accent, bg), `${accent} on ${bg}`).toBeGreaterThanOrEqual(4.5)
        // dark text on accent buttons
        expect(contrast(theme.background, accent)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
