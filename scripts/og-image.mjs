#!/usr/bin/env node
/**
 * Regenerates public/og-image.png (1200×630) from portfolio.json using a
 * locally installed Chrome/Chromium in headless mode. Run: npm run og
 * Set CHROME_PATH if Chrome isn't in a standard location.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { theme } from '../src/theme.js'

const root = resolve(import.meta.dirname, '..')
const data = JSON.parse(readFileSync(join(root, 'portfolio.json'), 'utf8'))
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chrome = candidates.find((p) => existsSync(p))
if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH=/path/to/chrome')
  process.exit(1)
}

const [first, ...rest] = data.name.split(' ')
const role = data.label.split('|')[0].trim()
const tags = [...new Set(data.projects.flatMap((p) => p.tags ?? []))].slice(0, 6)
const A = theme.accent
// accent with alpha, e.g. rgba of #39ff88 at 35%
const hexA = (a) => A + Math.round(a * 255).toString(16).padStart(2, '0')
const nodes = Array.from({ length: 70 }, (_, i) => {
  const a = i * 2.39996
  const r = 120 + ((i * 37) % 90)
  return [880 + Math.cos(a) * r, 300 + Math.sin(a) * r * 0.85]
})
const lines = nodes
  .flatMap((p, i) => nodes.slice(i + 1).filter((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 70).map((q) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`))
  .join('')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;width:1200px;height:630px;background:${theme.background};color:${theme.text};font-family:'Space Grotesk','Helvetica Neue',Arial,sans-serif;overflow:hidden;position:relative}
  .grid{position:absolute;inset:0;background-image:linear-gradient(${hexA(0.08)} 1px,transparent 1px),linear-gradient(90deg,${hexA(0.08)} 1px,transparent 1px);background-size:40px 40px;mask-image:linear-gradient(to bottom,transparent,#000 50%)}
  .glow{position:absolute;right:120px;top:90px;width:520px;height:420px;background:radial-gradient(closest-side,${hexA(0.22)},transparent)}
  svg{position:absolute;inset:0}
  .c{position:absolute;left:72px;top:110px;width:600px}
  .mono{font-family:'JetBrains Mono',Menlo,monospace}
  .k{color:${A};font-size:24px}
  h1{margin:22px 0 0;font-size:96px;line-height:.95;letter-spacing:-2px}
  h1 span{color:${A};text-shadow:0 0 30px ${hexA(0.5)}}
  .r{margin-top:26px;font-size:30px;color:${theme.text}}
  .t{margin-top:30px;display:flex;flex-wrap:wrap;gap:10px}
  .t span{border:1px solid ${hexA(0.35)};color:${theme.text};border-radius:8px;padding:6px 12px;font-size:18px}
  .u{position:absolute;left:72px;bottom:48px;color:${theme.muted};font-size:20px}
</style></head><body>
<div class="grid"></div><div class="glow"></div>
<svg width="1200" height="630"><g stroke="${A}" stroke-opacity=".35">${lines}</g>${nodes.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${2 + (i % 3)}" fill="${i % 4 ? A : theme.text}"/>`).join('')}</svg>
<div class="c"><div class="k mono">&gt;_ ${esc(first.toLowerCase())}@portfolio</div>
<h1>${esc(first)}<br><span>${esc(rest.join(' '))}</span></h1>
<div class="r">${esc(role)}</div>
<div class="t mono">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div></div>
<div class="u mono">${esc((data.base_url || '').replace(/^https?:\/\//, ''))}</div>
</body></html>`

const dir = mkdtempSync(join(tmpdir(), 'og-'))
const file = join(dir, 'og.html')
writeFileSync(file, html)
const out = join(root, 'public', 'og-image.png')
execFileSync(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', `--screenshot=${out}`, '--window-size=1200,630', `file://${file}`], { stdio: 'inherit' })
console.log(`wrote ${out}`)
