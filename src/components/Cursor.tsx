import { useEffect, useRef } from 'react'
import { useFinePointer, useReducedMotion } from '../hooks/useMedia'

/** Glowing dot + trailing ring. Desktop (fine pointer) only, off for reduced motion. */
export function Cursor() {
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const enabled = fine && !reduce

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('custom-cursor')
    const pos = { x: -100, y: -100 }
    const lag = { x: -100, y: -100 }
    let big = false
    let down = false
    let visible = false
    let raf = 0

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
      const t = e.target as HTMLElement | null
      big = Boolean(t?.closest('a, button, [role="button"], summary, label, input, textarea')) || root.dataset.hover3d === 'true'
      if (!visible) {
        visible = true
        lag.x = pos.x
        lag.y = pos.y
      }
    }
    const onDown = () => (down = true)
    const onUp = () => (down = false)
    const onLeave = () => (visible = false)

    const tick = () => {
      lag.x += (pos.x - lag.x) * 0.2
      lag.y += (pos.y - lag.y) * 0.2
      const o = visible ? '1' : '0'
      if (dot.current) {
        dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`
        dot.current.style.opacity = o
      }
      if (ring.current) {
        const s = (big ? 1.8 : 1) * (down ? 0.8 : 1)
        ring.current.style.transform = `translate3d(${lag.x}px, ${lag.y}px, 0) translate(-50%, -50%) scale(${s})`
        ring.current.style.opacity = visible ? (big ? '0.9' : '0.55') : '0'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      root.classList.remove('custom-cursor')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80]">
      <div ref={dot} className="absolute top-0 left-0 h-1.5 w-1.5 rounded-full bg-accent opacity-0 shadow-[0_0_10px_2px_var(--accent)]" />
      <div
        ref={ring}
        className="absolute top-0 left-0 h-8 w-8 rounded-full border border-accent opacity-0 shadow-[0_0_18px_-2px_var(--accent),inset_0_0_12px_-4px_var(--hot)] transition-[opacity] duration-200"
      />
    </div>
  )
}
