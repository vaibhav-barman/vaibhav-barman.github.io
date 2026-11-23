/**
 * Pipeline diagrams are SMIL animations inside inline SVG. They cost nothing
 * until they are running, so this only runs each diagram's clock while it is
 * on screen, the tab is visible and its layout is the one being shown (a wide
 * and a tall SVG are both in the page; CSS displays one). With reduced motion
 * a diagram freezes on a frame where a packet is mid-route.
 */
import { state } from './bus.js'

const FROZEN_AT = 2.2 // seconds into the cycle: the first packet is a couple of hops in

export function initFx() {
  const figs = [...document.querySelectorAll('[data-fx]')]
  if (!figs.length) return
  // The wide layout is only shown for the stacked card (768-1179); phones and the side-by-side card use the tall one.
  const wide = matchMedia('(min-width: 768px) and (max-width: 1179px)')
  const inView = new Map()

  const sync = (fig) => {
    const shown = fig.querySelector(wide.matches ? '.fx-wide' : '.fx-tall')
    for (const svg of fig.querySelectorAll('.fx-svg')) {
      if (typeof svg.pauseAnimations !== 'function') continue
      const run = svg === shown && inView.get(fig) && !document.hidden && !state.reducedMotion
      if (run) svg.unpauseAnimations()
      else {
        if (svg === shown && state.reducedMotion) svg.setCurrentTime(FROZEN_AT)
        svg.pauseAnimations()
      }
    }
  }

  // Start paused: don't run anything that is not visible yet.
  figs.forEach((fig) => {
    inView.set(fig, false)
    sync(fig)
  })
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        inView.set(e.target, e.isIntersecting)
        sync(e.target)
      }
    },
    { rootMargin: '120px 0px' },
  )
  figs.forEach((fig) => io.observe(fig))
  const all = () => figs.forEach(sync)
  wide.addEventListener?.('change', all)
  document.addEventListener('visibilitychange', all)
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
    state.reducedMotion = e.matches
    all()
  })
}
