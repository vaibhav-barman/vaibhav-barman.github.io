/**
 * Types the hero's taglines (data-lines on .typed) one after another with a
 * block caret, like a terminal. Pauses while the hero is off-screen or the tab
 * is hidden. With reduced motion (or one line) the first line just stays.
 */
import { state } from './bus.js'

const TYPE_MS = 34
const HOLD_MS = 1900

export function initTyped() {
  const el = document.querySelector('.typed[data-lines]')
  if (!el) return
  let lines
  try {
    lines = JSON.parse(el.dataset.lines)
  } catch {
    return
  }
  if (!Array.isArray(lines) || lines.length < 2 || state.reducedMotion) return

  let onScreen = true
  const hero = document.getElementById('hero')
  if (hero && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(hero)

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const idle = async () => {
    while (!onScreen || document.hidden) await sleep(400)
  }
  ;(async () => {
    for (let k = 1; ; k = (k + 1) % lines.length) {
      await sleep(HOLD_MS)
      const line = lines[k]
      for (let i = 0; i <= line.length; i++) {
        await idle()
        el.textContent = line.slice(0, i)
        await sleep(TYPE_MS)
      }
    }
  })()
}
