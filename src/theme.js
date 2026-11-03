/**
 * THE colour + font config for the whole site.
 *
 * Everything reads from here: CSS variables (injected into every HTML page at
 * build time), the three.js scene, the terminal, the favicon and the resume.
 *
 * To switch the accent colour, change ONE value:
 *     accent: '#39ff88'   →   accent: '#3b82f6'   (electric blue)
 */
export const theme = {
  /** The one accent colour: 3D scene, links, borders, glows, terminal, highlights. */
  accent: '#39ff88',

  /** Near-black page background. */
  background: '#05070a',
  /** Raised panels (cards, nav, terminal window). */
  surface: '#0b0f14',
  /** Body text and nav links (15.9:1 on the background). */
  text: '#e6edf3',
  /** Secondary text. Kept at 8:1 on the background so it passes WCAG AA everywhere. */
  muted: '#a3adba',
  /** Hairlines and borders. */
  line: 'rgba(230, 237, 243, 0.12)',
  /** Error messages in the terminal. */
  error: '#ff6b6b',

  fonts: {
    sans: "'Space Grotesk Variable', 'Space Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  /** Accents a visitor can try with the `theme` terminal command (not saved to the site). */
  presets: {
    green: '#39ff88',
    blue: '#3b82f6',
  },
}

/** CSS custom properties for a given accent (defaults to theme.accent). */
export function cssVariables(accent = theme.accent) {
  return [
    `--accent:${accent}`,
    `--bg:${theme.background}`,
    `--surface:${theme.surface}`,
    `--text:${theme.text}`,
    `--muted:${theme.muted}`,
    `--line:${theme.line}`,
    `--error:${theme.error}`,
    `--font-sans:${theme.fonts.sans}`,
    `--font-mono:${theme.fonts.mono}`,
  ].join(';')
}

/** The favicon, drawn in the accent colour. */
export function faviconSvg(accent = theme.accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${theme.background}"/><path d="M14 20l12 12-12 12" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 44h18" stroke="${theme.text}" stroke-width="5" stroke-linecap="round"/></svg>`
}
