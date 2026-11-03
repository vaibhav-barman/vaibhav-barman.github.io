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
import { portfolio } from '../data/portfolio.js'
import { createProjectCards } from './cards.js'
import { createGrid } from './grid.js'
import { createNeuralField, mouseState } from './neural.js'
import { createSkillCluster } from './skills.js'
import { placeInStage } from './stage.js'
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

  // Objects that live inside the page's framed .stage windows.
  const cards = createProjectCards({ projects: portfolio.projects, accent })
  const skills = createSkillCluster({ groups: portfolio.skillGroups, accent })
  // Drawn after bloom so card text and labels stay crisp.
  const overlay = new Scene()
  overlay.add(cards.group, skills.group)
  const stages = [
    { obj: cards, el: document.querySelector('[data-stage="projects"]') },
    { obj: skills, el: document.querySelector('[data-stage="skills"]') },
  ].filter((x) => x.el)
  // Card faces are drawn with the web fonts, so redraw once they're loaded.
  document.fonts?.ready.then(() => cards.setAccent(state.accent ?? theme.accent))

  // Bloom on desktop only; phones render straight to the screen.
  let composer = null
  let bloom = null
  if (!mobile) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new Vector2(256, 256), cfg.bloom.strength, cfg.bloom.radius, cfg.bloom.threshold)
    composer.addPass(bloom)
    const overlayPass = new RenderPass(overlay, camera)
    overlayPass.clear = false
    overlayPass.clearDepth = true
    composer.addPass(overlayPass)
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

  const offs = [
    bus.on('accent', (c) => {
      field.setAccent(c)
      grid.setAccent(c)
      cards.setAccent(c)
      skills.setAccent(c)
    }),
    bus.on('focus-project', (slug) => cards.focus(slug)),
    bus.on('hover-skill', (slug) => skills.hoverSkill(slug)),
    bus.on('highlight', (h) => skills.highlightGroup(h?.kind === 'skills' ? (h.group ?? null) : null)),
  ]

  // Scroll drives a dolly down the corridor: forward along -z and slightly down.
  let scrollTarget = 0
  let scrollNow = 0
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollTarget = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
  }
  onScroll()
  scrollNow = scrollTarget
  addEventListener('scroll', onScroll, { passive: true })

  let enabled = true
  let raf = 0
  let last = performance.now()
  let time = 0
  const parallax = new Vector2()
  function frame(now) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    time += dt
    mouse.on += (mouse.target - mouse.on) * damp(4, dt)
    parallax.x += (mouse.ndc.x * mouse.on - parallax.x) * damp(2, dt)
    parallax.y += (mouse.ndc.y * mouse.on - parallax.y) * damp(2, dt)

    scrollNow += (scrollTarget - scrollNow) * damp(cfg.cameraEase, dt)
    const k = scrollNow
    look.set(Math.sin(k * Math.PI * 2) * cfg.travel.sway, -k * cfg.travel.drop, -k * cfg.travel.depth)
    camera.position.set(look.x + offset.x + parallax.x * cfg.parallax, look.y + offset.y + parallax.y * cfg.parallax * 0.6, look.z + offset.z)
    camera.lookAt(look)
    camera.updateMatrixWorld()

    field.update(dt, { aspect: camera.aspect, mouseOn: mouse.on })
    grid.update(dt)
    for (const s of stages) {
      if (!placeInStage(s.obj.group, s.el, camera, { fitHeight: s.obj.fitHeight })) continue
      const size = s.obj.group.userData.stageSize
      if (s.obj === cards) cards.update(dt, time, size.w / size.h)
      else skills.update(dt, time, parallax)
    }
    if (composer) composer.render(dt)
    else {
      renderer.autoClear = true
      renderer.render(scene, camera)
      renderer.autoClear = false
      renderer.clearDepth()
      renderer.render(overlay, camera)
    }
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
      offs.forEach((off) => off())
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', resize)
      removeEventListener('pointermove', onPointer)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      field.dispose()
      grid.dispose()
      cards.dispose()
      skills.dispose()
      composer?.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
