/**
 * Decides whether and how to run the 3D scene, and loads it lazily so
 * three.js never competes with the first paint or the first interaction.
 *
 *  - No WebGL2, or a software renderer      → static CSS background (.bg)
 *  - prefers-reduced-motion                 → static background (opt in with `3d on` or the footer toggle)
 *  - Phones / touch                         → lighter scene, no bloom, starts on the first touch or scroll
 *  - Desktop                                → full scene, starts on the first mouse move / scroll / key,
 *                                             or by itself a few seconds after load
 *
 * Debug: add ?scene=lite to force the phone version, ?scene=off to disable it.
 */
import { bus, state } from './bus.js'

const PREF_KEY = 'portfolio-3d'
const AUTO_START_MS = 5000

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

let probed
function webglUsable() {
  if (probed !== undefined) return probed
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!gl) return (probed = false)
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    // Software rendering would be slower than no 3D at all.
    probed = !/swiftshader|llvmpipe|software/i.test(renderer)
  } catch {
    probed = false
  }
  return probed
}

/** Runs `fn` once, on the first sign of a real visitor (or after `timeout` ms). */
function onFirstInteraction(fn, timeout) {
  const events = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown', 'wheel']
  let timer
  const go = () => {
    events.forEach((e) => removeEventListener(e, go))
    clearTimeout(timer)
    fn()
  }
  events.forEach((e) => addEventListener(e, go, { passive: true, once: true }))
  if (timeout) timer = setTimeout(go, timeout)
}

export function initScene() {
  const params = new URLSearchParams(location.search)
  const mode = params.get('scene')
  const mobile = mode === 'lite' || matchMedia('(pointer: coarse)').matches || innerWidth < 768
  const toggle = document.getElementById('toggle-3d')
  // Assume available until probed (the probe itself is deferred: creating a GL context isn't free).
  state.threeD = { enabled: false, available: mode !== 'off' }
  if (mode === 'off') return

  const pref = readPref()
  const wanted = pref ? pref === 'on' : !state.reducedMotion

  let scene = null
  let loading = null
  const sync = () => {
    const on = state.threeD.enabled && Boolean(scene)
    document.documentElement.classList.toggle('has-3d', on)
    if (toggle && state.threeD.available && probed !== undefined) {
      toggle.hidden = false
      toggle.textContent = `3D: ${state.threeD.enabled ? 'on' : 'off'}`
      toggle.setAttribute('aria-pressed', String(state.threeD.enabled))
    }
  }
  const unavailable = (err) => {
    if (err) console.warn('3D scene failed to start; using the static background.', err)
    state.threeD = { enabled: false, available: false }
    if (toggle) toggle.hidden = true
    document.documentElement.classList.remove('has-3d')
  }
  const load = () => {
    if (!webglUsable()) return Promise.resolve(unavailable())
    loading ??= import('../scene/index.js')
      .then(({ startScene }) => startScene({ mobile }))
      .then((s) => {
        scene = s
        scene.setEnabled(state.threeD.enabled)
        sync()
      })
      .catch(unavailable)
    return loading
  }
  const set = (on, remember = true) => {
    if (!state.threeD.available) return
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
  onFirstInteraction(
    () => {
      if (!webglUsable()) return unavailable()
      if (wanted) load()
      sync()
    },
    mobile || !wanted ? 0 : AUTO_START_MS,
  )
}
