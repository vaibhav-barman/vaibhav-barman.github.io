/**
 * Shared chrome SVG parts (ported from scripts/generate_assets.py in the
 * profile README repo): the gradients, a ball, and a slowly turning wire
 * sphere with a light sweep. Greys only; animation is SMIL, so it needs no JS
 * and costs nothing on the main thread.
 */
import { chromeBall } from '../theme.js'

const n = (v) => +v.toFixed(2)

/** Gradients used by every chrome element. `p` prefixes the ids so several SVGs can share a page. */
export function chromeDefs(p = '') {
  return `<linearGradient id="${p}chl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafafa"/><stop offset=".28" stop-color="#d4d4d4"/><stop offset=".46" stop-color="#5c5c5c"/><stop offset=".5" stop-color="#0b0b0b"/><stop offset=".6" stop-color="#2e2e2e"/><stop offset=".82" stop-color="#bdbdbd"/><stop offset="1" stop-color="#6e6e6e"/></linearGradient>
<radialGradient id="${p}chs" cx=".34" cy=".26" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".18" stop-color="#fff" stop-opacity=".25"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}chr" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset=".9" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></radialGradient>
<linearGradient id="${p}cht" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a7a7a"/><stop offset=".22" stop-color="#ffffff"/><stop offset=".45" stop-color="#9c9c9c"/><stop offset=".62" stop-color="#f2f2f2"/><stop offset=".8" stop-color="#6a6a6a"/><stop offset="1" stop-color="#d9d9d9"/></linearGradient>
<linearGradient id="${p}shn" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".46" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset=".54" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;1 0" keyTimes="0;.45;1" dur="6s" repeatCount="indefinite"/></linearGradient>
<radialGradient id="${p}glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}shd"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
}

/**
 * A chrome sphere with turning meridians, parallels and a sweeping highlight.
 * Used small in the footer and large as the hero's stand-in while three.js
 * loads (and when WebGL is unavailable), so the page is never a still frame.
 */
export function chromeSphereSvg({ id = 'sp', label = '', className = 'sphere', turn = 16 } = {}) {
  const R = 100
  // A meridian seen edge-on is an ellipse whose rx follows |cos(angle)| as it turns.
  const cos = [1, 0.866, 0.5, 0, 0.5, 0.866, 1].map((c) => n(c * R)).join(';')
  const meridians = [0, 1, 2, 3]
    .map((k) => `<ellipse cx="0" cy="0" rx="${R}" ry="${R}" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="1"><animate attributeName="rx" values="${cos}" dur="${turn}s" begin="-${n((k * turn) / 4)}s" repeatCount="indefinite"/></ellipse>`)
    .join('')
  const parallels = [-60, -30, 0, 30, 60]
    .map((deg) => {
      const y = n(R * Math.sin((deg * Math.PI) / 180))
      const rx = n(R * Math.cos((deg * Math.PI) / 180))
      return `<ellipse cx="0" cy="${y}" rx="${rx}" ry="${n(rx * 0.18)}" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="1"/>`
    })
    .join('')
  return `<svg class="${className}" viewBox="-112 -112 224 224" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>
<defs>${chromeDefs(id)}<clipPath id="${id}c"><circle r="${R}"/></clipPath></defs>
<circle r="${R + 12}" fill="url(#${id}glow)" opacity=".16"/>
<circle r="${R}" fill="url(#${id}chl)"/><circle r="${R}" fill="url(#${id}chs)"/>
<g clip-path="url(#${id}c)">${meridians}${parallels}<rect x="-${R}" y="-${R}" width="${R * 2}" height="${R * 2}" fill="url(#${id}shn)" opacity=".75"/></g>
<circle r="${R}" fill="url(#${id}chr)"/>
</svg>`
}

export { chromeBall }
