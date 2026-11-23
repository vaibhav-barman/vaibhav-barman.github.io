#!/usr/bin/env node
/**
 * Layout QA in real headless Chrome (needs a build: `npm run build`).
 *
 *   node scripts/qa.mjs [--out DIR] [--widths 360,375,...] [--path /index.html] [--shots] [--scene]
 *
 * For every width it loads the built site, then reports horizontal overflow,
 * small tap targets and the smallest rendered text inside the SVG diagrams.
 * With --shots it also saves screenshots of each section. Exit code 1 if any
 * viewport has horizontal overflow.
 */
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { launch, serve } from './lib/cdp.mjs'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true
}
const out = resolve(opt('out', 'qa-shots'))
const path = opt('path', '/')
const shots = opt('shots', false)
const scene = opt('scene', false)
// width x height (typical phones, tablets and desktops)
const SIZES = { 360: 740, 375: 667, 390: 844, 414: 896, 768: 1024, 1024: 768, 1440: 900 }
const widths = String(opt('widths', Object.keys(SIZES).join(','))).split(',').map(Number)

const measure = () => {
  const vw = document.documentElement.clientWidth
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
  }
  const name = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
  const overflowing = [...document.querySelectorAll('body *')]
    .filter((el) => {
      if (!visible(el) || el.closest('svg, .hero-stage')) return false
      const r = el.getBoundingClientRect()
      return r.right > vw + 1 || r.left < -1
    })
    .map(name)
  const targets = [...document.querySelectorAll('a[href], button, summary')]
    .filter((el) => visible(el) && !el.closest('.hero-stage') && !el.matches('.skip'))
    .filter((el) => !(el.closest('p, li, dd') && getComputedStyle(el).display === 'inline')) // inline text links
    .map((el) => ({ el: name(el) + `"${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18)}"`, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))
    .filter((t) => t.h < 40 || t.w < 40)
  const svgText = [...document.querySelectorAll('.fx-svg')]
    .filter(visible)
    .map((svg) => {
      const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
      const sizes = [...svg.querySelectorAll('text')].map((t) => parseFloat(getComputedStyle(t).fontSize) * k)
      return { svg: svg.className.baseVal, scale: +k.toFixed(2), minPx: +Math.min(...sizes).toFixed(1) }
    })
  return {
    vw,
    scrollWidth: document.documentElement.scrollWidth,
    docHeight: document.documentElement.scrollHeight,
    overflowing: [...new Set(overflowing)].slice(0, 12),
    smallTargets: targets.slice(0, 14),
    svgText,
  }
}

const site = await serve('dist')
const chrome = await launch()
let failed = false
try {
  mkdirSync(out, { recursive: true })
  for (const w of widths) {
    const h = SIZES[w] ?? 800
    const mobile = w < 768
    const page = await chrome.newPage()
    await page.viewport(w, h, { dpr: mobile ? 2 : 1, mobile })
    await page.goto(site.url + path, { settle: 1500 })
    const m = await page.eval(`(${measure})()`)
    const bad = m.scrollWidth > m.vw || m.overflowing.length
    if (bad) failed = true
    console.log(`\n── ${w}×${h} ${bad ? '✗ OVERFLOW' : '✓'}  doc ${m.vw}→${m.scrollWidth}px wide, ${m.docHeight}px tall`)
    if (m.overflowing.length) console.log('   overflowing:', m.overflowing.join(', '))
    if (m.smallTargets.length) console.log('   small targets:', m.smallTargets.map((t) => `${t.el} ${t.w}×${t.h}`).join(' | '))
    if (m.svgText.length) console.log('   diagram text:', m.svgText.map((t) => `${t.svg} ×${t.scale} min ${t.minPx}px`).join(' | '))

    if (shots) {
      const dir = join(out, String(w))
      mkdirSync(dir, { recursive: true })
      const targets = await page.eval(`[...document.querySelectorAll('#hero, #about, #projects .flagship, #builds, #skills, #journey, #contact, .footer')].map((el, i) => ({ i, id: el.id || el.className.split(' ')[0] + '-' + i, y: el.getBoundingClientRect().top + scrollY, h: el.getBoundingClientRect().height }))`)
      for (const t of targets) {
        await page.scrollTo(Math.max(0, t.y - (t.id === 'hero' ? 0 : 70)))
        await new Promise((r) => setTimeout(r, 600))
        await page.shot(join(dir, `${String(t.i).padStart(2, '0')}-${t.id.replace(/[^\w-]/g, '')}.png`))
      }
      console.log(`   screenshots → ${dir}`)
    }
    page.close()
  }
} finally {
  chrome.close()
  site.close()
}
if (scene) console.log('\n(--scene checks are added in scripts/qa-scene.mjs)')
process.exit(failed ? 1 : 0)
