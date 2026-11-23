/**
 * THE colour + font config for the whole site: black, white and liquid-silver
 * chrome. There is no accent colour; everything is a grey.
 *
 * Everything reads from here: CSS variables (injected into every HTML page at
 * build time), the three.js scene, the terminal, the favicon, the app icons
 * and the resume. tests/monochrome.test.js fails if any colour with a hue
 * appears anywhere in the source or in the build output.
 *
 * Tokens come from the profile README's design (docs/index.html and
 * scripts/generate_assets.py in github.com/vaibhav-barman/vaibhav-barman).
 */
export const theme = {
  /** Page background. Also `theme-color` and the PWA background. */
  background: '#000000',
  /** Raised panels (cards, nav, the terminal window). */
  surface: '#050505',
  /** Hairlines. */
  line: '#1a1a1a',
  /** Panel frames and chip borders. */
  line2: '#2a2a2a',
  /** Control borders (buttons, link boxes), as in the reference page. */
  lineHi: '#333333',
  /** Corner crop marks, as in the reference page. */
  crop: '#3d3d3d',
  /**
   * Dim text. Only ~3.9:1 on black, so it is for decorative labels (indices,
   * separators, metadata) and never for anything a reader has to read.
   */
  dim: '#6b6b6b',
  /** Secondary text (8.3:1 on black). */
  mid: '#a3a3a3',
  /** Body text (16:1). */
  text: '#ededed',
  /** Highlight. */
  white: '#ffffff',

  /** Chrome text: clipped to the glyphs, with a slow light sweep (see .chrome in main.css). */
  chrome: 'linear-gradient(100deg, #6f6f6f 0%, #ffffff 22%, #9c9c9c 45%, #f2f2f2 62%, #6a6a6a 80%, #d9d9d9 100%)',

  fonts: {
    sans: "'Helvetica Neue', Helvetica, 'Inter Variable', Inter, 'Segoe UI', Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  },
}

/** CSS custom properties, injected as `:root{...}` into every page. */
export function cssVariables() {
  return [
    `--bg:${theme.background}`,
    `--panel:${theme.surface}`,
    `--line:${theme.line}`,
    `--line2:${theme.line2}`,
    `--line-hi:${theme.lineHi}`,
    `--crop:${theme.crop}`,
    `--dim:${theme.dim}`,
    `--mid:${theme.mid}`,
    `--text:${theme.text}`,
    `--white:${theme.white}`,
    `--chrome:${theme.chrome}`,
    `--font-sans:${theme.fonts.sans}`,
    `--font-mono:${theme.fonts.mono}`,
  ].join(';')
}

/**
 * A chrome ball as three stacked circles (the reference's `ball()`): a
 * vertical studio gradient, a soft white highlight, and a dark rim.
 */
export function chromeBall(cx, cy, r, id) {
  return `<defs>
<linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafafa"/><stop offset=".28" stop-color="#d4d4d4"/><stop offset=".46" stop-color="#5c5c5c"/><stop offset=".5" stop-color="#0b0b0b"/><stop offset=".6" stop-color="#2e2e2e"/><stop offset=".82" stop-color="#bdbdbd"/><stop offset="1" stop-color="#6e6e6e"/></linearGradient>
<radialGradient id="${id}s" cx=".34" cy=".26" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".18" stop-color="#fff" stop-opacity=".25"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}r" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset=".9" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></radialGradient>
</defs>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}l)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}s)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}r)"/>`
}

/** The favicon: a chrome ball on black. */
export function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${theme.background}"/>${chromeBall(32, 32, 20, 'fv')}</svg>`
}

/**
 * The app icon (PWA / home screen): the same ball on a full-bleed background,
 * so the OS can round or mask it. `scale` sizes the ball: 1 keeps it inside
 * the maskable safe zone (centre 80%), larger fills "any" icons.
 */
export function appIconSvg(scale = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${theme.background}"/>${chromeBall(32, 32, 20 * scale, 'ic')}</svg>`
}
