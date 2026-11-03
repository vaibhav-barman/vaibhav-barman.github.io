/**
 * The three.js scene behind the page. Loaded lazily by src/main.js only when
 * WebGL works and the visitor hasn't asked for reduced motion.
 *
 *   startScene({ mobile }) -> { setEnabled(on), dispose() }
 */
import { Color, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { config } from '../config.js'
import { theme } from '../theme.js'
import { bus, state } from '../ui/bus.js'
import { createGrid } from './grid.js'
import { createNeuralField, mouseState } from './neural.js'
import { damp } from './util.js'

export function startScene({ mobile = false } = {}) {
  const cfg = config.scene
  const accent = state.accent ?? theme.accent

  const canvas = document.createElement('canvas')
  canvas.className = 'scene'
  canvas.setAttribute('aria-hidden', 'true')
  // Right after the static background, so it paints over it.
  const bg = document.querySelector('.bg')
  if (bg) bg.after(canvas)
  else document.body.prepend(canvas)

  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' })
  const dprCap = mobile ? cfg.maxDpr.mobile : cfg.maxDpr.desktop
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap))
  const scene = new Scene()
  // scene.background (not setClearColor) so the colour is right with and without bloom.
  scene.background = new Color(theme.background)
  const camera = new PerspectiveCamera(55, 1, 0.1, 140)
  const offset = new Vector3(...cfg.cameraOffset)
  camera.position.copy(offset)
  const look = new Vector3(0, 0, 0)

  const mouse = mouseState()
  const field = createNeuralField({
    count: mobile ? cfg.nodes.mobile : cfg.nodes.desktop,
    linksPerNode: cfg.linksPerNode,
    linkDistance: cfg.linkDistance,
    accent,
    mouse,
  })
  field.uniforms.uPush.value = cfg.mouse.push
  scene.add(field.group)
  const grid = createGrid({ accent })
  scene.add(grid.mesh)

  // Bloom on desktop only; phones render straight to the screen.
  let composer = null
  let bloom = null
  if (!mobile) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new Vector2(256, 256), cfg.bloom.strength, cfg.bloom.radius, cfg.bloom.threshold)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
  }

  let width = 0
  let height = 0
  function resize() {
    const w = innerWidth
    const h = innerHeight
    // Ignore small height changes from mobile browser toolbars.
    if (w === width && Math.abs(h - height) < 120) return
    width = w
    height = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Keep the hero cloud filling the width on portrait screens.
    camera.fov = w < h ? 70 : 55
    camera.updateProjectionMatrix()
    if (composer) {
      composer.setSize(w, h)
      // Bloom at half resolution: looks the same, a quarter of the cost.
      bloom.resolution.set(w / 2, h / 2)
    }
  }
  resize()
  addEventListener('resize', resize)

  const onPointer = (e) => {
    if (e.pointerType === 'touch') return
    mouse.ndc.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    mouse.target = 1
  }
  const onLeave = () => (mouse.target = 0)
  addEventListener('pointermove', onPointer, { passive: true })
  document.addEventListener('pointerleave', onLeave)

  const offAccent = bus.on('accent', (c) => {
    field.setAccent(c)
    grid.setAccent(c)
  })

  let enabled = true
  let raf = 0
  let last = performance.now()
  const parallax = new Vector2()
  function frame(now) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    mouse.on += (mouse.target - mouse.on) * damp(4, dt)
    parallax.x += (mouse.ndc.x * mouse.on - parallax.x) * damp(2, dt)
    parallax.y += (mouse.ndc.y * mouse.on - parallax.y) * damp(2, dt)

    camera.position.set(look.x + offset.x + parallax.x * cfg.parallax, look.y + offset.y + parallax.y * cfg.parallax * 0.6, look.z + offset.z)
    camera.lookAt(look)

    field.update(dt, { aspect: camera.aspect, mouseOn: mouse.on })
    grid.update(dt)
    if (composer) composer.render(dt)
    else renderer.render(scene, camera)
  }

  function start() {
    if (raf || !enabled || document.hidden) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }
  const onVisibility = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibility)

  start()
  requestAnimationFrame(() => canvas.classList.add('ready'))

  return {
    setEnabled(on) {
      enabled = on
      canvas.classList.toggle('ready', on)
      if (on) start()
      else stop()
    },
    dispose() {
      stop()
      offAccent()
      removeEventListener('resize', resize)
      removeEventListener('pointermove', onPointer)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      field.dispose()
      grid.dispose()
      composer?.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
