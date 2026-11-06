/**
 * The three.js scene behind the page. Loaded lazily by src/main.js only when
 * WebGL works and the visitor hasn't asked for reduced motion.
 *
 *   await startScene({ mobile }) -> { setEnabled(on), dispose() }
 *
 * Start-up is split across several frames, and shaders compile
 * asynchronously where the browser supports it, so loading the scene never
 * freezes the page for long.
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
import { createFloor } from './floor.js'
import { createNeuralField, mouseState } from './neural.js'
import { createPipelines } from './pipeline.js'
import { createSkillCluster } from './skills.js'
import { placeInStage } from './stage.js'
import { STATE_INTENSITY, STATES, sectionBlend, stateWeights } from './story.js'
import { damp, MAX_MASKS } from './util.js'

/** Page elements the network dims behind, so text stays readable. */
const MASK_SELECTOR = '.hero-copy, .section-intro-text, .stage, .about-main, .contact, .timeline'

// Let the browser paint/handle input between start-up steps.
const yieldToBrowser = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

export async function startScene({ mobile = false } = {}) {
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
    secondary: theme.secondary,
    mouse,
    narrow: innerWidth < innerHeight,
  })
  field.uniforms.uPush.value = cfg.mouse.push
  scene.add(field.group)
  const floor = createFloor({ accent, secondary: theme.secondary, mobile, pixelRatio: renderer.getPixelRatio() })
  scene.add(floor.mesh)
  await yieldToBrowser()

  // Objects that live inside the page's framed .stage windows.
  const pipelines = createPipelines({ projects: portfolio.projects, accent, secondary: theme.secondary })
  const skills = createSkillCluster({ groups: portfolio.skillGroups, projects: portfolio.projects, accent, secondary: theme.secondary })
  // Drawn after bloom so labels stay crisp.
  const overlay = new Scene()
  overlay.add(pipelines.group, skills.group)
  const stages = [
    { obj: pipelines, el: document.querySelector('[data-stage="projects"]') },
    { obj: skills, el: document.querySelector('[data-stage="skills"]') },
  ].filter((x) => x.el)
  // Labels are drawn with the web fonts, so redraw them once the fonts are loaded.
  document.fonts?.ready.then(() => {
    pipelines.refreshText()
    skills.refreshText()
  })

  // The scroll story: which sections are on screen decides the network's shape.
  const sectionEls = [...document.querySelectorAll('main > section[id]')]
  const sectionIds = sectionEls.map((el) => el.id)
  const weights = Float32Array.from(STATES, (s) => (s === 'cloud' ? 1 : 0))
  const maskEls = [...document.querySelectorAll(MASK_SELECTOR)]
  await yieldToBrowser()
  if (renderer.compileAsync) {
    await renderer.compileAsync(scene, camera)
    await renderer.compileAsync(overlay, camera)
  }
  await yieldToBrowser()

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
  const drawSize = new Vector2()
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
    field.setResolution(...renderer.getDrawingBufferSize(drawSize).toArray())
    if (composer) {
      composer.setSize(w, h)
      // Bloom at half resolution: looks the same, a quarter of the cost.
      bloom.resolution.set(w / 2, h / 2)
    }
  }
  resize()
  addEventListener('resize', resize)

  // Text rectangles in NDC, for the shader to dim the network behind.
  const masks = []
  function updateMasks() {
    masks.length = 0
    const vw = innerWidth
    const vh = innerHeight
    const pad = 12
    for (const el of maskEls) {
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > vh || r.width === 0) continue
      masks.push([((r.left - pad) / vw) * 2 - 1, -(((r.bottom + pad) / vh) * 2 - 1), ((r.right + pad) / vw) * 2 - 1, -(((r.top - pad) / vh) * 2 - 1)])
      if (masks.length === MAX_MASKS) break
    }
    field.setMasks(masks)
  }

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
      floor.setAccent(c)
      pipelines.setAccent(c)
      skills.setAccent(c)
    }),
    bus.on('focus-project', (slug) => {
      pipelines.focus(slug)
      skills.hoverProject(slug)
    }),
    // Each terminal command sends a ripple through the network from the terminal.
    bus.on('command', () => {
      const r = document.getElementById('terminal')?.getBoundingClientRect()
      if (!r || r.bottom < 0 || r.top > innerHeight) return
      field.burst({ x: ((r.left + r.width / 2) / innerWidth) * 2 - 1, y: -(((r.top + r.height / 2) / innerHeight) * 2 - 1) })
    }),
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
  // Adaptive quality: if frames are slow for a couple of seconds, drop
  // bloom first, then the pixel ratio, to stay close to 60fps.
  let slowFrames = 0
  let sampled = 0
  let quality = 2
  function adapt(dt) {
    sampled++
    if (dt > 1 / 45) slowFrames++
    if (sampled < 120) return
    if (slowFrames > 60 && quality > 0) {
      quality--
      if (quality === 1 && composer) {
        composer.dispose()
        composer = null
      } else if (quality === 0) {
        renderer.setPixelRatio(1)
        floor.setPixelRatio(1)
        width = 0
        resize()
      }
    }
    sampled = 0
    slowFrames = 0
  }
  const parallax = new Vector2()
  function frame(now) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    time += dt
    adapt(dt)
    mouse.on += (mouse.target - mouse.on) * damp(4, dt)
    parallax.x += (mouse.ndc.x * mouse.on - parallax.x) * damp(2, dt)
    parallax.y += (mouse.ndc.y * mouse.on - parallax.y) * damp(2, dt)

    scrollNow += (scrollTarget - scrollNow) * damp(cfg.cameraEase, dt)
    const k = scrollNow
    look.set(Math.sin(k * Math.PI * 2) * cfg.travel.sway, -k * cfg.travel.drop, -k * cfg.travel.depth)
    camera.position.set(look.x + offset.x + parallax.x * cfg.parallax, look.y + offset.y + parallax.y * cfg.parallax * 0.6, look.z + offset.z)
    camera.lookAt(look)
    camera.updateMatrixWorld()

    // Blend the network toward the shape of the section(s) on screen.
    const target = stateWeights(sectionIds, sectionBlend(sectionEls.map((el) => el.getBoundingClientRect().top), innerHeight))
    const kw = damp(2.5, dt)
    let intensity = 0
    for (let i = 0; i < STATES.length; i++) {
      weights[i] += (target[i] - weights[i]) * kw
      intensity += weights[i] * STATE_INTENSITY[STATES[i]]
    }
    field.uniforms.uIntensity.value = intensity
    updateMasks()
    field.update(dt, { aspect: camera.aspect, mouseOn: mouse.on, weights, anchor: look })
    floor.update(dt)
    for (const s of stages) {
      if (!placeInStage(s.obj.group, s.el, camera, { fitHeight: s.obj.fitHeight, fitWidth: s.obj.fitWidth })) continue
      if (s.obj === pipelines) pipelines.update(dt, time)
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
    get quality() {
      return quality
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
      floor.dispose()
      pipelines.dispose()
      skills.dispose()
      composer?.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
