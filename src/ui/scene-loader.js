/**
 * Starts the 3D hero (src/scene/hero.js), loaded lazily so three.js never
 * competes with the first paint.
 *
 *  - No WebGL2, or a software renderer → the SVG chrome sphere stays (it turns
 *    by itself, so the hero is never a still frame)
 *  - Everyone else, phones included    → starts right after first paint, from an
 *    idle callback (not on first touch: the animation has to be there when the
 *    page opens)
 *  - prefers-reduced-motion            → the same scene, but slow and calm
 *
 * Debug: ?scene=off  never start it     ?scene=lite   force the phone tier
 *        ?scene=force  start even on a software renderer (headless QA); also
 *        exposes window.__hero (info(), project(i)).
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
    /* storage blocked: the preference just isn't remembered */
  }
}

let probed
function webglUsable(force) {
  if (force) return true
  if (probed !== undefined) return probed
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!gl) return (probed = false)
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    // Software rendering would be slower than the SVG sphere.
    probed = !/swiftshader|llvmpipe|software/i.test(renderer)
  } catch {
    probed = false
  }
  return probed
}

/** After first paint, when the browser is idle (or soon after, if it never is). */
function whenIdle(fn) {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 250))
  if (document.readyState === 'complete') requestAnimationFrame(() => requestAnimationFrame(go))
  else addEventListener('load', () => requestAnimationFrame(go), { once: true })
}

export function initScene() {
  const mode = new URLSearchParams(location.search).get('scene')
  const host = document.querySelector('.hero-stage')
  const toggle = document.getElementById('toggle-3d')
  state.threeD = { enabled: false, available: mode !== 'off' && Boolean(host) }
  if (mode === 'off' || !host) return

  const mobile = mode === 'lite' || matchMedia('(pointer: coarse)').matches || innerWidth < 768
  const pref = readPref()
  state.threeD.enabled = pref ? pref === 'on' : true

  let scene = null
  let loading = null
  const sync = () => {
    document.documentElement.classList.toggle('has-3d', state.threeD.enabled && Boolean(scene))
    if (toggle && state.threeD.available && (scene || loading)) {
      toggle.hidden = false
      toggle.textContent = `3D: ${state.threeD.enabled ? 'on' : 'off'}`
      toggle.setAttribute('aria-pressed', String(state.threeD.enabled))
    }
  }
  const unavailable = (err) => {
    if (err) console.warn('3D hero failed to start; keeping the chrome sphere.', err)
    scene = null
    state.threeD = { enabled: false, available: false }
    if (toggle) toggle.hidden = true
    document.documentElement.classList.remove('has-3d')
  }
  const load = () => {
    if (!webglUsable(mode === 'force')) return Promise.resolve(unavailable())
    loading ??= import('../scene/hero.js')
      .then(({ startHero }) => startHero({ host, mobile, debug: mode === 'force' || mode === 'lite', onLost: () => unavailable() }))
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
  if (state.threeD.enabled) whenIdle(load)
  else if (toggle && webglUsable(mode === 'force')) {
    toggle.hidden = false
    toggle.textContent = '3D: off'
    toggle.setAttribute('aria-pressed', 'false')
  }
}
