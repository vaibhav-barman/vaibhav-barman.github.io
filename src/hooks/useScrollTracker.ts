import { useEffect } from 'react'
import { config, type SectionId } from '../config'
import { scrollState, useApp } from '../store/useApp'

/**
 * Tracks scroll position against the page sections:
 *  - scrollState.index / .t drive the 3D camera (no re-renders)
 *  - activeSection / progress feed the HUD
 */
export function useScrollTracker() {
  useEffect(() => {
    const ids = config.sections.map((s) => s.id)
    let raf = 0

    const measure = () => {
      raf = 0
      const els = ids.map((id) => document.getElementById(id))
      const viewportMid = window.scrollY + window.innerHeight / 2
      const tops = els.map((el) => (el ? el.getBoundingClientRect().top + window.scrollY : Infinity))
      const centers = els.map((el, i) => (el ? tops[i] + el.offsetHeight / 2 : Infinity))

      let index = 0
      for (let i = 0; i < centers.length; i++) if (centers[i] <= viewportMid) index = i
      const a = centers[index]
      const b = centers[index + 1]
      const t = viewportMid < centers[0] || b === undefined || !isFinite(b) ? 0 : Math.min(1, Math.max(0, (viewportMid - a) / (b - a)))
      scrollState.index = index
      scrollState.t = t

      // Active section = the one containing the viewport centre.
      let active: SectionId = ids[0]
      els.forEach((el, i) => {
        if (el && tops[i] <= viewportMid) active = ids[i]
      })
      const max = document.documentElement.scrollHeight - window.innerHeight
      const s = useApp.getState()
      s.setSection(active)
      s.setProgress(max > 0 ? window.scrollY / max : 0)
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    const onPointer = (e: PointerEvent) => {
      scrollState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('pointermove', onPointer, { passive: true })
    const ro = new ResizeObserver(schedule)
    ro.observe(document.body)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pointermove', onPointer)
      ro.disconnect()
    }
  }, [])
}

export function scrollToSection(id: SectionId) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
