/**
 * The site is black, white and grey. This guard fails on ANY colour with a hue:
 * hex, rgb(), hsl(), lab/lch/oklab/oklch, color-mix, 0xRRGGBB (three.js) and
 * named colours, in the source, the templates, the build scripts and in the HTML,
 * manifest and icons that the build produces.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { webManifest } from '../src/pwa/manifest.js'
import { model, renderHtml, renderPages } from '../src/site/build.js'
import { appIconSvg, cssVariables, faviconSvg } from '../src/theme.js'

const root = resolve(import.meta.dirname, '..')

const NAMED = [
  'red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'orange', 'purple', 'violet', 'pink', 'lime', 'teal', 'navy',
  'aqua', 'fuchsia', 'maroon', 'olive', 'indigo', 'gold', 'brown', 'coral', 'crimson', 'salmon', 'turquoise', 'tomato',
  'orchid', 'plum', 'khaki', 'lavender', 'beige', 'azure', 'chartreuse', 'emerald', 'neon', 'mint', 'rose', 'amber',
]

const isGreyRgb = (r, g, b) => r === g && g === b

/** Returns every offending colour token found in `text`. */
export function findColour(text) {
  const bad = []
  // #rgb #rgba #rrggbb #rrggbbaa (not followed by more word characters, so ids like #hero are ignored)
  for (const m of text.matchAll(/#([0-9a-fA-F]{3,8})(?![\w-])/g)) {
    let h = m[1]
    if (![3, 4, 6, 8].includes(h.length)) continue
    if (h.length <= 4) h = [...h].map((c) => c + c).join('')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
    if (!isGreyRgb(r, g, b)) bad.push(m[0])
  }
  // rgb()/rgba(): channels must be equal (numbers or percentages)
  for (const m of text.matchAll(/rgba?\(\s*([^)]+)\)/gi)) {
    const nums = m[1].replace(/[,/]/g, ' ').trim().split(/\s+/).slice(0, 3)
    if (nums.length < 3 || nums.some((n) => !/^[\d.]+%?$/.test(n))) {
      if (!/var\(/.test(m[1])) bad.push(m[0])
      continue
    }
    const [r, g, b] = nums.map(parseFloat)
    if (!isGreyRgb(r, g, b)) bad.push(m[0])
  }
  // Colour spaces and mixing that can hide a hue.
  for (const m of text.matchAll(/\b(hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/gi)) {
    // `color(` also matches words like "ctx.color(" in JS; only flag CSS-ish uses.
    if (m[1].toLowerCase() === 'color' && !/color\(\s*(srgb|display-p3|xyz|rec2020)/i.test(text.slice(m.index, m.index + 24))) continue
    bad.push(m[0])
  }
  // three.js: 0xRRGGBB
  for (const m of text.matchAll(/\b0x([0-9a-fA-F]{6})\b/g)) {
    const h = m[1]
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
    if (!isGreyRgb(r, g, b)) bad.push(m[0])
  }
  return bad
}

/** Named colours only count inside CSS declaration values / inline style / svg attributes. */
export function findNamedColour(text) {
  const bad = []
  const names = NAMED.join('|')
  const patterns = [
    new RegExp(`(?:color|background(?:-color)?|border(?:-[a-z]+)?(?:-color)?|outline(?:-color)?|fill|stroke|stop-color|caret-color|accent-color|scrollbar-color|text-shadow|box-shadow)\\s*[:=]\\s*["']?[^;}"'\\n]*\\b(${names})\\b`, 'gi'),
  ]
  for (const re of patterns) for (const m of text.matchAll(re)) bad.push(m[0].trim().slice(0, 60))
  return bad
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git'])
function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, exts, out)
    else if (exts.includes(extname(p))) out.push(p)
  }
  return out
}

const sources = [
  ...walk(join(root, 'src'), ['.js', '.css', '.html', '.svg']),
  ...walk(join(root, 'scripts'), ['.mjs', '.js']),
  join(root, 'index.html'),
  join(root, 'page.html'),
  join(root, 'resume.html'),
].filter(existsSync)

describe('monochrome guard (helpers)', () => {
  it('accepts greys, black and white', () => {
    expect(findColour('color:#000;background:#050505;border:1px solid #2a2a2a;fill:#FFF;x:rgba(255,255,255,.4) 0xffffff')).toEqual([])
  })
  it('rejects anything with a hue', () => {
    expect(findColour('#39ff88')).toEqual(['#39ff88'])
    expect(findColour('#3b82f6 #05070a')).toHaveLength(2)
    expect(findColour('rgba(230, 237, 243, 0.12)')).toHaveLength(1)
    expect(findColour('hsl(150 100% 50%)')).toHaveLength(1)
    expect(findColour('color-mix(in srgb, var(--a) 40%, transparent)')).toHaveLength(1)
    expect(findColour('new Color(0x39ff88)')).toEqual(['0x39ff88'])
    expect(findNamedColour('a{color: green}')).toHaveLength(1)
  })
  it('ignores element ids that merely look like hex', () => {
    expect(findColour('#hero #nav #main #feed-title')).toEqual([])
  })
})

describe('monochrome guard (source tree)', () => {
  for (const file of sources) {
    const rel = file.slice(root.length + 1)
    it(rel, () => {
      const text = readFileSync(file, 'utf8')
      expect(findColour(text), `${rel} has a coloured literal`).toEqual([])
      if (/\.(css|svg|html)$/.test(file)) expect(findNamedColour(text), `${rel} has a named colour`).toEqual([])
    })
  }
})

describe('monochrome guard (build output)', () => {
  const d = model(raw)
  const outputs = {
    'index.html': renderHtml(readFileSync(join(root, 'index.html'), 'utf8'), raw),
    'resume.html': renderHtml(readFileSync(join(root, 'resume.html'), 'utf8'), raw, { isResume: true }),
    'site.webmanifest': JSON.stringify(webManifest('/')),
    'favicon.svg': faviconSvg(),
    'app-icon.svg': appIconSvg(),
    'css variables': cssVariables(),
  }
  for (const p of renderPages(readFileSync(join(root, 'page.html'), 'utf8'), raw)) outputs[p.path] = p.html

  for (const [name, text] of Object.entries(outputs)) {
    it(`${name} is greyscale`, () => {
      expect(findColour(text), name).toEqual([])
      expect(findNamedColour(text), name).toEqual([])
    })
  }

  it('theme-color and manifest colours are black', () => {
    expect(outputs['index.html']).toContain('<meta name="theme-color" content="#000000">')
    const m = webManifest('/')
    expect(m.theme_color).toBe('#000000')
    expect(m.background_color).toBe('#000000')
  })

  it('renders at least the home page and one project page', () => {
    expect(Object.keys(outputs).some((k) => k.startsWith('projects/'))).toBe(true)
    expect(d.projects.length).toBeGreaterThan(0)
  })
})
