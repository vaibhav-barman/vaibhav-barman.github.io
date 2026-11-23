#!/usr/bin/env node
/**
 * Behaviour QA for the 3D hero, in real headless Chrome (needs a build first).
 *
 *   npm run build && node scripts/qa-scene.mjs
 *
 * Headless Chrome renders WebGL in software (SwiftShader), so the page is loaded
 * with ?scene=force. Frame times printed here are NOT representative of a phone's
 * GPU; the assertions are about structure and budgets: pixel-ratio cap, triangle
 * counts, bloom/dust tiers, tap and hover behaviour, and pausing.
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

async function open(w, h, { dpr = 1, mobile = false, query = '?scene=force', reducedMotion = false } = {}) {
  const page = await chrome.newPage()
  const errors = []
  page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text))
  page.on('Runtime.consoleAPICalled', (e) => e.type === 'error' && errors.push(e.args.map((a) => a.value ?? a.description).join(' ')))
  await page.send('Runtime.enable')
  await page.viewport(w, h, { dpr, mobile })
  if (reducedMotion) await page.media([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(site.url + '/' + query, { settle: 500 })
  page.errors = errors
  return page
}
async function untilHero(page, ms = 30000) {
  for (let t = 0; t < ms; t += 250) {
    if (await page.eval(`typeof window.__hero === 'object'`)) return true
    await sleep(250)
  }
  return false
}
const info = (page) => page.eval(`window.__hero.info()`)
const stubOpen = (page) => page.eval(`window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null }; true`)
/** A front-facing node that is on screen: { i, x, y }. */
async function frontNode(page, ring) {
  return page.eval(`(() => {
    const ring = ${JSON.stringify(ring ?? null)}
    const info = window.__hero.info()
    for (let i = 0; i < info.nodes.length; i++) {
      if (ring !== null && info.nodes[i].ring !== ring) continue
      const p = window.__hero.project(i)
      if (!p.back && p.x > 20 && p.x < innerWidth - 20 && p.y > 90 && p.y < innerHeight - 20) return { i, x: p.x, y: p.y, r: p.r }
    }
    return null
  })()`)
}

try {
  // ───────────────────────── phone ─────────────────────────
  console.log('\nphone (390×844, device pixel ratio 3, touch)')
  {
    const page = await open(390, 844, { dpr: 3, mobile: true })
    check('3D hero starts on a phone without any interaction', await untilHero(page))
    await sleep(1500)
    const i = await info(page)
    check('pixel ratio is capped at 1.5 (device is 3)', i.pixelRatio <= 1.5, `pixelRatio ${i.pixelRatio}, canvas ${i.canvas.w}×${i.canvas.h}`)
    check('uses the phone tier', i.mobile === true)
    check('blob is low-detail (< 6000 triangles)', i.blobTriangles < 6000, `${i.blobTriangles} triangles`)
    check('dust is 500 points or fewer', i.dust <= 500, `${i.dust}`)
    check('bloom runs at reduced resolution', i.bloomScale > 0 && i.bloomScale <= 0.5, `scale ${i.bloomScale}`)
    check('whole frame stays under 40k triangles and 50 draw calls', i.triangles < 40000 && i.drawCalls < 50, `${i.triangles} tris, ${i.drawCalls} calls`)
    check('nine project nodes orbit (3 flagships + 6 builds)', i.nodes.length === 9 && i.nodes.filter((n) => n.ring === 0).length === 3)
    check('the animation is running', i.running === true, `~${i.frameMs}ms/frame in software GL`)
    check('has-3d class is set (canvas fades in over the SVG sphere)', await page.eval(`document.documentElement.classList.contains('has-3d')`))

    // tap: first tap highlights, second tap opens the repo
    await stubOpen(page)
    const n = await frontNode(page)
    check('a node is on screen to tap', Boolean(n))
    if (n) {
      await page.tap(n.x, n.y)
      await sleep(400)
      let s = await info(page)
      check('first tap highlights the node (and opens nothing)', s.selected === n.i && (await page.eval(`window.__opened.length`)) === 0, `selected ${s.selected}`)
      check('its label is shown', await page.eval(`document.querySelectorAll('.node-label.on').length === 1`))
      const again = await page.eval(`(() => { const p = window.__hero.project(${n.i}); return { x: p.x, y: p.y } })()`)
      await page.tap(again.x, again.y)
      await sleep(400)
      const opened = await page.eval(`window.__opened`)
      check('second tap opens the repository in a new tab', opened.length === 1 && /^https:\/\/github\.com\/vaibhav-barman\//.test(opened[0][0]) && opened[0][1] === '_blank', JSON.stringify(opened[0]?.slice(0, 2)))
      // a tap on empty space clears the highlight
      await page.tap(30, 700)
      await sleep(300)
      s = await info(page)
      check('tapping empty space clears the highlight', s.selected === -1)
    }

    // the page still scrolls: the canvas must not swallow vertical swipes
    check('canvas leaves vertical scrolling to the page (touch-action: pan-y)', (await page.eval(`getComputedStyle(document.querySelector('.hero-canvas')).touchAction`)) === 'pan-y')

    // off-screen: pauses; back on screen: resumes
    await page.scrollTo(2600)
    await sleep(800)
    check('pauses when the hero is scrolled out of view', (await info(page)).running === false)
    await page.scrollTo(0)
    await sleep(800)
    check('resumes when it comes back', (await info(page)).running === true)
    check('no script errors', page.errors.filter((e) => !/KHR_parallel_shader_compile/.test(e)).length === 0, page.errors.join(' | ').slice(0, 200))
    page.close()
  }

  // ───────────────────────── desktop ─────────────────────────
  console.log('\ndesktop (1440×900, mouse)')
  {
    const page = await open(1440, 900, { dpr: 2 })
    check('3D hero starts', await untilHero(page))
    await sleep(1500)
    const i = await info(page)
    check('pixel ratio is capped at 2', i.pixelRatio <= 2, `${i.pixelRatio}`)
    check('uses the desktop tier', i.mobile === false && i.blobTriangles > 10000, `${i.blobTriangles} triangles`)
    check('bloom is full resolution', i.bloomScale === 1)
    await stubOpen(page)
    const n = await frontNode(page, 0)
    check('a flagship node is on screen', Boolean(n))
    if (n) {
      await page.move(n.x, n.y)
      await sleep(500)
      const s = await info(page)
      check('hovering a node highlights it', s.focus >= 0, `focus ${s.focus}`)
      check('its label is highlighted', await page.eval(`document.querySelectorAll('.node-label.on').length === 1`))
      const p = await page.eval(`(() => { const q = window.__hero.project(${s.focus}); return { x: q.x, y: q.y } })()`)
      await page.move(p.x, p.y)
      await page.click(p.x, p.y)
      await sleep(300)
      const opened = await page.eval(`window.__opened`)
      check('clicking a node opens the repo directly', opened.length === 1 && /github\.com\/vaibhav-barman/.test(opened[0][0]), opened[0]?.[0])
      await page.move(5, 600)
      await sleep(400)
      check('moving away clears the highlight', (await info(page)).focus === -1)
    }
    const flagshipLabels = await page.eval(`[...document.querySelectorAll('.node-label.main')].map((l) => l.style.transform !== '').length`)
    check('the three flagship labels are always shown on desktop', flagshipLabels === 3, `${flagshipLabels}`)
    check('no script errors', page.errors.filter((e) => !/KHR_parallel_shader_compile/.test(e)).length === 0, page.errors.join(' | ').slice(0, 200))
    page.close()
  }

  // ───────────────────────── reduced motion ─────────────────────────
  console.log('\nprefers-reduced-motion')
  {
    const page = await open(390, 844, { dpr: 2, mobile: true, reducedMotion: true })
    check('the scene is still shown (calm, not switched off)', await untilHero(page))
    await sleep(1200)
    check('and it is running', (await info(page)).running === true)
    check('CSS sheen/blink animations are off', (await page.eval(`getComputedStyle(document.querySelector('.hero-name')).animationName`)) === 'none')
    page.close()
  }

  // ───────────────────────── no WebGL ─────────────────────────
  console.log('\n?scene=off (stand-in for no WebGL)')
  {
    const page = await open(390, 844, { dpr: 2, mobile: true, query: '?scene=off' })
    await sleep(1500)
    check('no 3D canvas, no has-3d class', (await page.eval(`!document.querySelector('.hero-canvas') && !document.documentElement.classList.contains('has-3d')`)) === true)
    check('the SVG chrome sphere is visible and animated (SMIL)', (await page.eval(`(() => { const s = document.querySelector('.hero-fallback svg'); return !!s && s.querySelectorAll('animate').length > 3 && getComputedStyle(s.parentElement).opacity === '1' })()`)) === true)
    check('hero text and links are all present', (await page.eval(`document.querySelectorAll('.hero-links a').length === 3 && !!document.querySelector('.hero-name')`)) === true)
    page.close()
  }
} finally {
  chrome.close()
  site.close()
}

const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
