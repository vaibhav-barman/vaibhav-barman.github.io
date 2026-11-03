/**
 * Decides whether to run the 3D scene and loads it lazily, so three.js
 * never delays the first paint. Without WebGL, or with reduced motion, the
 * static CSS background (.bg in the page) stays.
 */
import { bus, state } from './bus.js'

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    return Boolean(gl)
  } catch {
    return false
  }
}

export function initScene() {
  state.threeD = { enabled: false, available: webglAvailable() }
  if (!state.threeD.available) return

  let scene = null
  let loading = null
  const load = () => {
    loading ??= import('../scene/index.js').then(({ startScene }) => {
      scene = startScene({ mobile: new URLSearchParams(location.search).get('scene') === 'lite' })
      state.threeD.enabled = true
      document.documentElement.classList.add('has-3d')
    })
    return loading
  }

  bus.on('3d', (on) => {
    state.threeD.enabled = on
    if (on && !scene) load()
    scene?.setEnabled(on)
    document.documentElement.classList.toggle('has-3d', on)
  })

  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 200))
  if (document.readyState === 'complete') idle(load)
  else addEventListener('load', () => idle(load), { once: true })
}
