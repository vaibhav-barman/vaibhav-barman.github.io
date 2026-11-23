#!/usr/bin/env node
/**
 * Regenerates public/og-image.png (1200×630) from portfolio.json using a
 * locally installed Chrome/Chromium in headless mode. Run: npm run og
 * Set CHROME_PATH if Chrome isn't in a standard location.
 *
 * Black, white and chrome only (tokens from src/theme.js): the name in chrome
 * type, a chrome sphere, a perspective floor grid, the subtitle and status.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { normalize } from '../src/data/normalize.js'
import { chromeSphereSvg } from '../src/site/chrome-svg.js'
import { cssVariables, theme } from '../src/theme.js'

const root = resolve(import.meta.dirname, '..')
const d = normalize(JSON.parse(readFileSync(join(root, 'portfolio.json'), 'utf8')))
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

// A static perspective floor: lines converging on a vanishing point, rows bunching up toward the horizon.
const W = 1200
const H = 630
const top = 330
const rows = Array.from({ length: 11 }, (_, i) => top + (H - top) * (i / 11) ** 2.4)
const spokes = Array.from({ length: 41 }, (_, i) => i - 20)
const floor = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="${top}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".34"/></linearGradient></defs>
<path d="${spokes.map((k) => `M${W * 0.62} ${top}L${W * 0.62 + k * 90} ${H}`).join('')}" stroke="url(#g)" fill="none"/>
${rows.map((y) => `<path d="M0 ${y.toFixed(1)}H${W}" stroke="url(#g)" fill="none"/>`).join('')}</svg>`

const tail = (d.manifest.find((r) => r.key === 'role')?.value ?? '').split('·')[1]?.trim()
const initials = d.name.split(/\s+/).map((w) => w[0]).join('')
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root{${cssVariables()}}
  *{box-sizing:border-box}
  body{margin:0;width:${W}px;height:${H}px;background:${theme.background};color:${theme.text};font-family:${theme.fonts.sans};overflow:hidden;position:relative}
  .floor{position:absolute;inset:0}
  .halo{position:absolute;left:640px;top:70px;width:560px;height:500px;background:radial-gradient(closest-side,rgba(255,255,255,.10),transparent)}
  .orb{position:absolute;left:760px;top:120px;width:360px}
  .orb svg{display:block;width:100%;height:auto}
  .c{position:absolute;left:72px;top:64px;width:640px}
  .mono{font-family:${theme.fonts.mono}}
  .meta{font-size:15px;letter-spacing:.28em;text-transform:uppercase;color:${theme.dim}}
  .meta b{color:${theme.text};font-weight:400}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;margin-right:10px}
  h1{margin:56px 0 0;font-weight:200;font-size:104px;line-height:.95;letter-spacing:.14em;text-transform:uppercase;background:${theme.chrome};-webkit-background-clip:text;background-clip:text;color:transparent}
  h1 strong{display:block;font-weight:800;letter-spacing:.06em}
  .sub{margin-top:30px;font-size:20px;letter-spacing:.3em;text-transform:uppercase;color:${theme.mid}}
  .rule{width:460px;height:1px;background:${theme.lineHi};margin-top:26px;position:relative}
  .rule::after{content:"";position:absolute;left:0;top:0;width:60px;height:1px;background:#fff}
  .term{margin-top:26px;font-size:20px;color:${theme.text}}
  .term::before{content:"› ";color:${theme.dim}}
  .term i{display:inline-block;width:10px;height:20px;background:#fff;vertical-align:-3px;margin-left:3px}
  .u{position:absolute;left:72px;bottom:44px;font-size:16px;letter-spacing:.2em;color:${theme.mid};text-transform:uppercase}
  .cm{position:absolute;width:22px;height:22px;border:0 solid ${theme.crop}}
  .tl{top:24px;left:24px;border-width:1px 0 0 1px}.tr{top:24px;right:24px;border-width:1px 1px 0 0}.bl{bottom:24px;left:24px;border-width:0 0 1px 1px}.br{bottom:24px;right:24px;border-width:0 1px 1px 0}
</style></head><body>
<div class="floor">${floor}</div><div class="halo"></div>
<div class="orb">${chromeSphereSvg({ id: 'og' })}</div>
<div class="cm tl"></div><div class="cm tr"></div><div class="cm bl"></div><div class="cm br"></div>
<div class="c">
  <div class="meta mono">${esc(initials)} — ${new Date().getFullYear()}${tail ? ` · ${esc(tail)}` : ''}</div>
  <h1>${esc(d.firstName)}<strong>${esc(d.lastName)}</strong></h1>
  <div class="sub mono">${esc(d.subtitle)}</div>
  <div class="rule"></div>
  <div class="term mono">${esc(d.taglines.at(-1))}<i></i></div>
</div>
<div class="u mono"><span class="dot"></span>${esc(d.status)} · ${esc((d.baseUrl || '').replace(/^https?:\/\//, ''))}</div>
</body></html>`

const dir = mkdtempSync(join(tmpdir(), 'og-'))
const file = join(dir, 'og.html')
writeFileSync(file, html)
const out = join(root, 'public', 'og-image.png')
execFileSync(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--screenshot=${out}`, `--window-size=${W},${H}`, `file://${file}`], { stdio: 'inherit' })
console.log(`wrote ${out}`)
