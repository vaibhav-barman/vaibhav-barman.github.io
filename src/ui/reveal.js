/**
 * Fades blocks in as they scroll into view. The manifest rows in the whoami card
 * come in one after another. Without IntersectionObserver (or with reduced
 * motion) everything is simply shown; without JS the CSS never hides anything.
 */
import { state } from './bus.js'

export function initReveal() {
  const els = [...document.querySelectorAll('[data-reveal]')]
  if (!els.length) return
  document.querySelectorAll('.manifest').forEach((m) => [...m.children].forEach((row, i) => row.style.setProperty('--d', `${0.12 * i}s`)))
  if (state.reducedMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  )
  els.forEach((el) => io.observe(el))
}
