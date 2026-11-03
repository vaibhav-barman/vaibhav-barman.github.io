/**
 * Decides whether and how to run the 3D scene, and loads it lazily so
 * three.js never delays the first paint.
 *
 *  - No WebGL2, or a software renderer      → static CSS background (.bg)
 *  - prefers-reduced-motion                 → static background (opt in with `3d on`)
 *  - Phones / touch                         → lighter scene, no bloom, loaded on first touch or scroll
 *  - Desktop                                → full scene, loaded when the browser is idle
 *
 * Debug: add ?scene=lite to force the phone version, ?scene=off to disable it.
 */
import { bus, state } from './bus.js'

const PREF_KEY = 'portfolio-3d'

function readPref() {
  try {
    return localStorage.getItem(PREF_KEY)
  } catch {
    return null
  }
}
function writePref(v) {
  try {
    localStorage.setItem(PREF_KEY, v)
  } catch {
    /* storage blocked: preference just isn't remembered */
  }
}

function probeWebGL() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!gl) return false
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    // Software rendering would be slower than no 3D at all.
    return !/swiftshader|llvmpipe|software/i.test(renderer)
  } catch {
    return false
  }
}

export function initScene() {
  const params = new URLSearchParams(location.search)
  const mode = params.get('scene')
  const mobile = mode === 'lite' || matchMedia('(pointer: coarse)').matches || innerWidth < 768
  const available = mode !== 'off' && probeWebGL()
  state.threeD = { enabled: false, available }
  const toggle = document.getElementById('toggle-3d')
  if (!available) return

  // Reduced motion → off unless the visitor explicitly turned it on.
  const pref = readPref()
  const wanted = pref ? pref === 'on' : !state.reducedMotion

  let scene = null
  let loading = null
  const sync = () => {
    document.documentElement.classList.toggle('has-3d', state.threeD.enabled)
    if (toggle) {
      toggle.hidden = false
      toggle.textContent = `3D: ${state.threeD.enabled ? 'on' : 'off'}`
      toggle.setAttribute('aria-pressed', String(state.threeD.enabled))
    }
  }
  const load = () => {
    loading ??= import('../scene/index.js')
      .then(({ startScene }) => {
        scene = startScene({ mobile })
        scene.setEnabled(state.threeD.enabled)
      })
      .catch((err) => {
        console.warn('3D scene failed to start; using the static background.', err)
        state.threeD = { enabled: false, available: false }
        sync()
        if (toggle) toggle.hidden = true
      })
    return loading
  }
  const set = (on, remember = true) => {
    state.threeD.enabled = on
    if (remember) writePref(on ? 'on' : 'off')
    if (on) load()
    scene?.setEnabled(on)
    sync()
  }

  bus.on('3d', (on) => set(on))
  toggle?.addEventListener('click', () => set(!state.threeD.enabled))
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
    state.reducedMotion = e.matches
    if (!readPref()) set(!e.matches, false)
  })

  state.threeD.enabled = wanted
  sync()
  if (!wanted) return
  document.documentElement.classList.remove('has-3d') // fade in when the canvas is ready

  const start = () => {
    load().then(() => scene && document.documentElement.classList.add('has-3d'))
  }
  if (mobile) {
    // Phones: wait for the first interaction so the page is usable first.
    const events = ['pointerdown', 'touchstart', 'scroll', 'keydown']
    const go = () => {
      events.forEach((e) => removeEventListener(e, go))
      start()
    }
    events.forEach((e) => addEventListener(e, go, { passive: true, once: true }))
  } else {
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 300))
    const kick = () => idle(start, { timeout: 2500 })
    if (document.readyState === 'complete') kick()
    else addEventListener('load', kick, { once: true })
  }
}
