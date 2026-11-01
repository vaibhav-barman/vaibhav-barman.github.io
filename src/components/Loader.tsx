import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useState } from 'react'
import { portfolio as d } from '../data/portfolio'
import { useReducedMotion } from '../hooks/useMedia'
import { useApp } from '../store/useApp'

/**
 * Styled loading screen shown while the 3D scene streams in. It never blocks
 * for long: it lifts as soon as the first frame renders, when 3D is off, or
 * after a short timeout. Click or press any key to skip.
 */
export function Loader() {
  const sceneReady = useApp((s) => s.sceneReady)
  const threeD = useApp((s) => s.threeD)
  const webgl = useApp((s) => s.webgl)
  const deferred = useApp((s) => s.sceneDeferred)
  const reduce = useReducedMotion()
  const [show, setShow] = useState(true)
  const [pct, setPct] = useState(0)

  const noScene = webgl === 'failed' || (webgl === 'ok' && !threeD) || deferred

  // Hand over from the static boot screen painted by index.html.
  useEffect(() => {
    document.getElementById('boot')?.remove()
  }, [])

  useEffect(() => {
    if (sceneReady || noScene) {
      const id = setTimeout(() => setShow(false), noScene ? 250 : 350)
      return () => clearTimeout(id)
    }
    const max = setTimeout(() => setShow(false), 4000)
    return () => clearTimeout(max)
  }, [sceneReady, noScene])

  useEffect(() => {
    if (!show) return
    const id = setInterval(() => setPct((p) => (sceneReady ? 100 : Math.min(94, p + Math.max(1, (94 - p) * 0.12)))), 60)
    const skip = () => setShow(false)
    window.addEventListener('keydown', skip, { once: true })
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', skip)
    }
  }, [show, sceneReady])

  return (
    <AnimatePresence>
      {show && (
        <m.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.6 }}
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-bg"
          role="status"
          aria-label="Loading 3D scene"
        >
          <div className="w-[min(360px,80vw)] font-mono text-xs">
            <p className="text-accent">
              <span aria-hidden="true">&gt; </span>booting {d.handle}.sh
            </p>
            <p className="mt-2 text-muted">compiling shaders · sampling latent space</p>
            <div className="mt-4 h-px w-full bg-white/10">
              <div className="h-px bg-accent shadow-[0_0_12px_var(--accent)] transition-[width] duration-150" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-muted">
              <span>{String(Math.round(pct)).padStart(3, '0')}%</span>
              <span>click to skip</span>
            </p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
