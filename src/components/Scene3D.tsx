import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { hasWebGL, useIsMobile, useReducedMotion } from '../hooks/useMedia'
import { useApp } from '../store/useApp'

const Experience = lazy(() => import('../scenes/Experience'))

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('3D scene disabled:', err)
    useApp.getState().setWebgl('failed')
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Software renderers (no GPU) can't hold 60fps; default them to the static background. */
function isSoftwareRenderer(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    return /swiftshader|llvmpipe|software|basic render/i.test(name)
  } catch {
    return false
  }
}

/**
 * Decides whether to show the WebGL scene, and lazy-loads it after the page
 * is interactive. The CSS `.fallback-bg` is always underneath.
 */
export function Scene3D() {
  const threeD = useApp((s) => s.threeD)
  const webgl = useApp((s) => s.webgl)
  const mobile = useIsMobile()
  const reduced = useReducedMotion()
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    const s = useApp.getState()
    if (!hasWebGL()) {
      s.setWebgl('failed')
      return
    }
    s.setWebgl('ok')
    let explicit: string | null = null
    try {
      explicit = localStorage.getItem('3d')
    } catch {
      /* ignore */
    }
    if (explicit !== 'on' && isSoftwareRenderer()) useApp.setState({ threeD: false })

    // Start loading the 3D chunk once the main thread is free.
    const start = () => setIdle(true)
    const ric = window.requestIdleCallback
    if (ric) {
      const id = ric(start, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(start, 300)
    return () => window.clearTimeout(id)
  }, [])

  if (!threeD || webgl !== 'ok' || !idle) return null
  return (
    <SceneBoundary>
      <Suspense fallback={null}>
        <Experience mobile={mobile} reduced={reduced} />
      </Suspense>
    </SceneBoundary>
  )
}
