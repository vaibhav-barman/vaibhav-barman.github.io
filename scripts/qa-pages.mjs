#!/usr/bin/env node
/**
 * Rendered-output QA in real headless Chrome (needs a build: `npm run build`).
 *
 *   node scripts/qa-pages.mjs
 *
 *  1. Greyscale, for real: every computed colour on every element (and ::before /
 *     ::after) and every pixel of a full-page screenshot, WebGL canvas included.
 *  2. The resume in print: white paper, no overflow.
 *  3. JavaScript disabled: nothing is hidden.
 *  4. Offline: the service worker serves the site again after a reload.
 */
import { launch, serve } from './lib/cdp.mjs'

const site = await serve('dist')
const chrome = await launch()
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Runs in the page: every computed colour that has a hue. */
const scanStyles = () => {
  const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor', 'caretColor', 'fill', 'stroke', 'stopColor', 'columnRuleColor']
  const SHADOW = ['boxShadow', 'textShadow']
  const bad = new Map()
  const grey = (v) => {
    if (!v || v === 'none' || v === 'auto' || v === 'currentcolor') return true
    const colours = v.match(/rgba?\([^)]+\)|color\([^)]+\)|oklch\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]{3,8}/gi) ?? []
    return colours.every((c) => {
      const n = c.match(/[\d.]+/g)?.map(Number) ?? []
      if (!/^rgba?/i.test(c)) return false
      return n[0] === n[1] && n[1] === n[2]
    })
  }
  const note = (el, pseudo, prop, v) => {
    const key = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}${pseudo} ${prop}: ${v}`
    bad.set(key, (bad.get(key) ?? 0) + 1)
  }
  let n = 0
  for (const el of document.querySelectorAll('*')) {
    for (const pseudo of ['', '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo || null)
      if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue
      n++
      for (const p of PROPS) if (!grey(cs[p])) note(el, pseudo, p, cs[p])
      for (const p of SHADOW) if (!grey(cs[p])) note(el, pseudo, p, cs[p])
    }
  }
  return { checked: n, bad: [...bad].slice(0, 10) }
}

/** Runs in the page: the biggest channel difference across all pixels of a PNG. */
const scanPixels = (b64) =>
  new Promise((ok) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = Math.min(img.height, 16000)
      const x = c.getContext('2d', { willReadFrequently: true })
      x.drawImage(img, 0, 0)
      const d = x.getImageData(0, 0, c.width, c.height).data
      let max = 0
      let over = 0
      for (let i = 0; i < d.length; i += 4) {
        const s = Math.max(Math.abs(d[i] - d[i + 1]), Math.abs(d[i + 1] - d[i + 2]), Math.abs(d[i] - d[i + 2]))
        if (s > max) max = s
        if (s > 6) over++
      }
      ok({ w: c.width, h: c.height, max, over })
    }
    img.src = 'data:image/png;base64,' + b64
  })

async function open(w, h, path, { mobile = false, dpr = 1, media } = {}) {
  const page = await chrome.newPage()
  await page.send('Runtime.enable')
  await page.viewport(w, h, { dpr, mobile })
  if (media) await page.media(media)
  await page.goto(site.url + path, { settle: 500 })
  return page
}
async function untilHero(page) {
  for (let t = 0; t < 30000; t += 250) {
    if (await page.eval(`typeof window.__hero === 'object'`)) return true
    await sleep(250)
  }
  return false
}
async function pixels(page) {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  return page.eval(`(${scanPixels})(${JSON.stringify(data)})`)
}

try {
  console.log('\n1. greyscale in the rendered page')
  for (const [label, w, h, path, mobile, dpr] of [
    ['home (phone, 3D running)', 390, 844, '/?scene=force', true, 2],
    ['home (desktop, 3D running)', 1440, 900, '/?scene=force', false, 1],
    ['resume', 1024, 800, '/resume.html', false, 1],
    ['project page', 390, 844, '/projects/self-rag.html', true, 2],
    ['project page (legacy chain + loop)', 1024, 800, '/projects/gitcommit-ai.html', false, 1],
  ]) {
    const page = await open(w, h, path, { mobile, dpr })
    if (path.includes('scene=force')) {
      await untilHero(page)
      await sleep(1500)
    }
    // scroll through once so lazily-revealed content is in its final state
    const height = await page.eval(`document.documentElement.scrollHeight`)
    for (let y = 0; y < height; y += 700) await page.scrollTo(y)
    await page.scrollTo(0)
    await sleep(800)
    const s = await page.eval(`(${scanStyles})()`)
    check(`${label}: all ${s.checked} computed colours are grey`, s.bad.length === 0, s.bad.map((b) => b[0]).join(' | ').slice(0, 220))
    const p = await pixels(page)
    check(`${label}: every pixel of the ${p.w}×${p.h} screenshot is grey`, p.max <= 6, `max channel difference ${p.max}, pixels over 6: ${p.over}`)
    page.close()
  }

  console.log('\n2. resume, printed')
  {
    const page = await open(820, 1100, '/resume.html', { media: [{ name: 'prefers-color-scheme', value: 'dark' }] })
    await page.send('Emulation.setEmulatedMedia', { media: 'print' })
    await sleep(300)
    const r = await page.eval(`(() => ({ bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color, h1: getComputedStyle(document.querySelector('h1')).color, toolbar: getComputedStyle(document.querySelector('.toolbar')).display, over: document.documentElement.scrollWidth > innerWidth }))()`)
    check('print: white paper, dark text', r.bg === 'rgb(255, 255, 255)' && r.fg === 'rgb(17, 17, 17)', `${r.bg} on ${r.fg}`)
    check('print: the toolbar is hidden and the name is plain black', r.toolbar === 'none' && r.h1 === 'rgb(0, 0, 0)', `toolbar ${r.toolbar}, h1 ${r.h1}`)
    check('print: no horizontal overflow', r.over === false)
    page.close()
  }

  console.log('\n3. JavaScript disabled')
  {
    const page = await chrome.newPage()
    await page.send('Runtime.enable')
    await page.viewport(390, 844, { dpr: 2, mobile: true })
    await page.send('Emulation.setScriptExecutionDisabled', { value: true })
    await page.goto(site.url + '/', { settle: 800 })
    const r = await page.eval(`(() => {
      const hidden = [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1')
      return { total: document.querySelectorAll('[data-reveal]').length, hidden: hidden.length, name: !!document.querySelector('.hero-name'), flagships: document.querySelectorAll('.flagship').length, fallback: getComputedStyle(document.querySelector('.hero-fallback')).opacity, shell: getComputedStyle(document.getElementById('shell-open')).display }
    })()`).catch(() => null)
    // With scripts disabled Runtime.evaluate still works through CDP.
    check('nothing is hidden by the reveal animation', r && r.total > 0 && r.hidden === 0, r && `${r.hidden}/${r.total} hidden`)
    check('name, three flagships and the chrome sphere are all there', r && r.name && r.flagships === 3 && r.fallback === '1')
    check('the shell button stays hidden (it needs JS)', r && r.shell === 'none', r && r.shell)
    page.close()
  }

  console.log('\n4. offline (service worker)')
  {
    const page = await open(1024, 800, '/')
    // wait for the worker to install and take control
    let controlled = false
    for (let i = 0; i < 40 && !controlled; i++) {
      controlled = await page.eval(`navigator.serviceWorker?.controller ? true : navigator.serviceWorker?.ready.then(() => !!navigator.serviceWorker.controller)`).catch(() => false)
      if (!controlled) await sleep(300)
    }
    if (!controlled) {
      await page.eval(`location.reload()`)
      await sleep(1500)
      controlled = await page.eval(`!!navigator.serviceWorker?.controller`)
    }
    check('the service worker is active', controlled)
    await page.send('Network.enable')
    await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await page.send('Page.reload')
    await sleep(2500)
    const r = await page.eval(`({ title: document.title, name: document.querySelector('.hero-name')?.textContent?.trim().replace(/\\s+/g, ' '), flagships: document.querySelectorAll('.flagship').length })`)
    check('offline reload still shows the whole portfolio', r.name === 'Vaibhav Barman' && r.flagships === 3, `${r.title}`)
    page.close()
  }

  console.log('\n5. the shell (opened on demand)')
  for (const [label, w, h, mobile, dpr] of [['phone', 390, 844, true, 2], ['desktop', 1440, 900, false, 1]]) {
    const page = await open(w, h, '/?scene=off', { mobile, dpr })
    const errors = []
    page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text))
    await page.send('Runtime.enable')
    const before = await page.eval(`({ terminal: !!document.getElementById('terminal'), button: !document.getElementById('shell-open').hidden })`)
    check(`${label}: no terminal in the page until it is opened; the button is shown`, before.terminal === false && before.button === true)
    const jsBefore = await page.eval(`performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /terminal|portfolio/.test(n)).length`)
    await page.eval(`document.getElementById('shell-open').click()`)
    for (let i = 0; i < 40 && !(await page.eval(`!!document.getElementById('term-input')`)); i++) await sleep(150)
    check(`${label}: opening it loads and mounts the terminal`, await page.eval(`!!document.getElementById('term-input') && document.getElementById('shell-open').getAttribute('aria-expanded') === 'true'`), `${jsBefore} terminal chunks fetched before opening`)
    await sleep(2500) // boot lines + the auto-typed whoami
    const out = await page.eval(`document.querySelector('.term-log')?.textContent ?? ''`)
    check(`${label}: it boots and prints the manifest, principle included`, /IDENTITY\.LOAD\(\)/.test(out) && /checks over model opinion/.test(out), out.replace(/\s+/g, ' ').slice(0, 90))
    await page.eval(`(() => { const i = document.getElementById('term-input'); i.value = 'projects 2'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })()`)
    await sleep(600)
    check(`${label}: commands run (projects 2 → Self-RAG)`, /Self-RAG/.test(await page.eval(`document.querySelector('.term-log').textContent`)))
    await page.eval(`(() => { const i = document.getElementById('term-input'); i.value = 'theme blue'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })()`)
    await sleep(500)
    check(`${label}: the old green/blue theme command is gone`, /not found|unknown|did you mean/i.test(await page.eval(`document.querySelector('.term-log').textContent`)))
    const grey = await page.eval(`(${scanStyles})()`)
    check(`${label}: the open shell is still all grey (${grey.checked} computed colours)`, grey.bad.length === 0, grey.bad.map((b) => b[0]).join(' | ').slice(0, 200))
    check(`${label}: no overflow with the shell open`, await page.eval(`document.documentElement.scrollWidth <= innerWidth`))
    check(`${label}: no script errors`, errors.length === 0, errors.join(' | ').slice(0, 200))
    await page.eval(`document.getElementById('terminal').scrollIntoView({ block: 'center' })`)
    await sleep(400)
    await page.shot(process.env.QA_SHELL_SHOT ? process.env.QA_SHELL_SHOT.replace('.png', `-${label}.png`) : '/dev/null')
    page.close()
  }

  console.log('\n6. text contrast (WCAG AA 4.5:1) against the real background')
  /** Runs in the page: elements with their own text whose colour is under 4.5:1. */
  const scanContrast = () => {
    const lum = ([r, g, b]) => {
      const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const parse = (c) => (c.match(/[\d.]+/g) ?? [0, 0, 0, 0]).map(Number)
    const bgOf = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const [r, g, b, a = 1] = parse(getComputedStyle(e).backgroundColor)
        if (a > 0.5) return [r, g, b]
      }
      return [0, 0, 0] // the page is black
    }
    const out = new Map()
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg, canvas, .hero-stage, script, style, .sr-only')) continue
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
      if (!own) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.getBoundingClientRect().width === 0) continue
      const [r, g, b, a = 1] = parse(cs.color)
      if (cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || cs.color === 'rgba(0, 0, 0, 0)') continue // chrome text: a gradient, checked by eye
      const bg = bgOf(el)
      const fg = [r, g, b].map((c, i) => c * a + bg[i] * (1 - a))
      const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x)
      const ratio = (hi + 0.05) / (lo + 0.05)
      if (ratio < 4.5) {
        const key = el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '')
        out.set(key, { ratio: +ratio.toFixed(2), n: (out.get(key)?.n ?? 0) + 1, sample: el.textContent.trim().slice(0, 28) })
      }
    }
    return [...out].map(([k, v]) => ({ k, ...v }))
  }
  // Decorative labels only: indices, separators, hints and decoration the page repeats in readable text elsewhere.
  const DECORATIVE = new Set(['span.hm-l', 'span.hm-r', 'i.', 'em.', 'p.hero-hint', 'span.prompt-sign', 'span.stack-index', 'p.eyebrow', 'span.project-index', 'span.idx-n', 'span.idx'])
  for (const [label, w, h, mobile, dpr, path] of [['phone', 390, 844, true, 2, '/?scene=off'], ['desktop', 1440, 900, false, 1, '/?scene=off'], ['project page', 390, 844, true, 2, '/projects/corrective-rag.html']]) {
    const page = await open(w, h, path, { mobile, dpr })
    const height = await page.eval(`document.documentElement.scrollHeight`)
    for (let y = 0; y < height; y += 700) await page.scrollTo(y)
    await sleep(500)
    const low = await page.eval(`(${scanContrast})()`)
    const offenders = low.filter((x) => !DECORATIVE.has(x.k))
    check(`${label}: every readable text element is at least 4.5:1`, offenders.length === 0, offenders.map((o) => `${o.k} ${o.ratio}:1 "${o.sample}"`).join(' | ').slice(0, 300))
    console.log(`     (decorative, allowed below AA: ${low.filter((x) => DECORATIVE.has(x.k)).map((x) => x.k).join(', ') || 'none'})`)
    page.close()
  }
} finally {
  chrome.close()
  site.close()
}
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
