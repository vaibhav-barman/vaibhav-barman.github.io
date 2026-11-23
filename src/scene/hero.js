/**
 * The hero: a liquid-chrome core with the projects orbiting it as chrome nodes
 * on dashed rings, white packets flowing from the core to the nodes, dust, a
 * floor grid and a touch of bloom. Ported from docs/index.html in the profile
 * README repo, then rebuilt to be cheap enough for phones:
 *
 *   tier      desktop                       phones / touch / narrow
 *   pixels    DPR <= 2                      DPR <= 1.5
 *   blob      detail 28, clearcoat          detail 14, plain metal
 *   dust      1400 points                   500 points
 *   bloom     full resolution, 4x MSAA      half resolution, no MSAA
 *
 * Also: the surface deforms on the GPU; no OrbitControls (it would swallow
 * vertical swipes, so a phone could not scroll past the hero); nodes are picked
 * by screen distance (fat-finger friendly, no raycasting); quality steps down
 * when frames run slow but never switches the scene off; everything pauses when
 * the hero is off-screen or the tab is hidden; reduced motion renders a calm,
 * slow version rather than nothing.
 *
 * The node list is read from the prerendered `.hero-projects a[data-node]`
 * links, so the content still comes from portfolio.json.
 */
import {
  ACESFilmicToneMapping,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  EdgesGeometry,
  Euler,
  Float32BufferAttribute,
  Fog,
  GridHelper,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { state } from '../ui/bus.js'
import { createBlob } from './blob.js'
import { studioEnvironment } from './env.js'

const TIERS = {
  desktop: { dpr: 2, detail: 28, dust: 1400, physical: true, bloomScale: 1, msaa: 4, antialias: true, dash: 1 },
  mobile: { dpr: 1.5, detail: 14, dust: 500, physical: false, bloomScale: 0.5, msaa: 0, antialias: false, dash: 1.5 },
}
const FOV = 38
const RINGS = [
  { r: 2.7, tilt: new Euler(0.32, 0, -0.22), speed: 0.16 },
  { r: 3.75, tilt: new Euler(-0.18, 0, 0.3), speed: 0.09 },
]
const NODE_RADIUS = 0.15
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const damp = (rate, dt) => 1 - Math.exp(-rate * dt)

/** The nodes, from the prerendered hero list (see hero() in site/page.js). */
export function readNodes(root = document) {
  return [...root.querySelectorAll('.hero-projects a[data-node]')].map((a) => ({
    slug: a.dataset.node,
    ring: Number(a.dataset.ring) === 0 ? 0 : 1,
    url: a.getAttribute('href'),
    id: a.dataset.id ?? '',
    name: a.dataset.name ?? a.textContent.trim(),
    tag: a.dataset.tag ?? '',
    link: a,
  }))
}

/**
 * Starts the hero scene inside `host` (the .hero-stage element).
 * Resolves to a controller: { setEnabled, dispose, info, project }.
 */
export async function startHero({ host, mobile = false, debug = false, onLost = () => {} }) {
  const tier = mobile ? TIERS.mobile : TIERS.desktop
  const hero = host.closest('.hero') ?? host
  const nodes = readNodes(hero.ownerDocument)
  if (!nodes.length) throw new Error('hero: no nodes found')

  const canvas = document.createElement('canvas')
  canvas.className = 'hero-canvas'
  const renderer = new WebGLRenderer({ canvas, antialias: tier.antialias, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tier.dpr))
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.info.autoReset = false
  host.prepend(canvas)

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    stop()
    onLost()
  })

  const scene = new Scene()
  scene.background = new Color(0x000000)
  scene.fog = new Fog(0x000000, 9, 26)
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  const env = studioEnvironment(renderer)
  scene.environment = env.texture

  // stage (positioned for the layout) > rig (spins / parallax) > core, shell, rings
  const stage = new Group()
  const rig = new Group()
  const ringsRoot = new Group() // scaled on narrow screens so the rings fit
  scene.add(stage)
  stage.add(rig)
  rig.add(ringsRoot)

  const blob = createBlob({ detail: tier.detail, physical: tier.physical })
  rig.add(blob.mesh)
  const shell = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(1.95, 1)), new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 }))
  rig.add(shell)

  // dashed orbit rings
  const ringGroups = RINGS.map((cfg) => {
    const g = new Group()
    g.rotation.copy(cfg.tilt)
    g.updateMatrix()
    ringsRoot.add(g)
    const pts = []
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2
      pts.push(new Vector3(Math.cos(a) * cfg.r, 0, Math.sin(a) * cfg.r))
    }
    const line = new Line(new BufferGeometry().setFromPoints(pts), new LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, dashSize: 0.06 * tier.dash, gapSize: 0.08 * tier.dash }))
    line.computeLineDistances()
    g.add(line)
    return g
  })

  // chrome project nodes (one shared material: highlighting is scale + label)
  const nodeMaterial = tier.physical
    ? new MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05 })
    : new MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06 })
  const nodeGeometry = new SphereGeometry(NODE_RADIUS, mobile ? 28 : 48, mobile ? 28 : 48)
  const perRing = [0, 1].map((r) => nodes.filter((n) => n.ring === r))
  nodes.forEach((n, i) => {
    const peers = perRing[n.ring]
    n.index = i
    n.phase = (peers.indexOf(n) / peers.length) * Math.PI * 2
    n.base = n.ring === 0 ? 1.25 : 0.9
    n.mesh = new Mesh(nodeGeometry, nodeMaterial)
    n.mesh.scale.setScalar(n.base)
    ringGroups[n.ring].add(n.mesh)
    n.local = new Vector3()
    n.screen = { x: -999, y: -999, r: 0, dist: 0, back: false }
  })

  // packets: one instanced mesh, each packet flies from the core to a node
  const PACKETS = 14
  const packetMesh = new InstancedMesh(new SphereGeometry(0.03, 12, 12), new MeshBasicMaterial({ color: 0xffffff }), PACKETS)
  packetMesh.instanceMatrix.setUsage(DynamicDrawUsage)
  packetMesh.frustumCulled = false
  ringsRoot.add(packetMesh)
  const packets = Array.from({ length: PACKETS }, (_, i) => ({ t: (i * 0.37) % 1, target: i % nodes.length }))

  // dust
  const dust = new Float32Array(tier.dust * 3)
  for (let i = 0; i < tier.dust; i++) {
    const r = 3.6 + Math.random() * 4.6
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    dust[i * 3] = r * Math.sin(ph) * Math.cos(th)
    dust[i * 3 + 1] = r * Math.cos(ph) * 0.6
    dust[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
  }
  const dustGeometry = new BufferGeometry()
  dustGeometry.setAttribute('position', new Float32BufferAttribute(dust, 3))
  const dustMaterial = new PointsMaterial({ color: 0xffffff, size: 0.018, transparent: true, opacity: 0.5, sizeAttenuation: true })
  const dustPoints = new Points(dustGeometry, dustMaterial)
  stage.add(dustPoints)

  // floor: grid + soft glow disc
  const grid = new GridHelper(60, 120, 0x2a2a2a, 0x141414)
  grid.position.y = -3.1
  stage.add(grid)
  const glow = document.createElement('canvas')
  glow.width = glow.height = 128
  const gctx = glow.getContext('2d')
  const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,.10)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  gctx.fillStyle = grad
  gctx.fillRect(0, 0, 128, 128)
  const disc = new Mesh(new PlaneGeometry(5, 5), new MeshBasicMaterial({ map: new CanvasTexture(glow), transparent: true, depthWrite: false }))
  disc.rotation.x = -Math.PI / 2
  disc.position.y = -3.09
  stage.add(disc)

  // labels (DOM, pinned to the nodes; created once)
  const labels = nodes.map((n) => {
    const el = document.createElement('div')
    el.className = 'node-label'
    el.innerHTML = `${n.id} &nbsp;${escapeHtml(n.name)}<small>${escapeHtml(n.tag)}</small>`
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      open(n)
    })
    host.appendChild(el)
    return { el, w: 0, h: 0, x: NaN, y: NaN }
  })

  // ---- post-processing (bloom) -------------------------------------------------
  let composer = null
  let bloom = null
  function buildComposer() {
    composer = new EffectComposer(renderer)
    if (tier.msaa) composer.renderTarget1.samples = composer.renderTarget2.samples = tier.msaa
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new Vector2(256, 256), 0.32, 0.5, 0.9)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
  }
  buildComposer()

  // ---- layout ------------------------------------------------------------------
  const view = { w: 0, h: 0, projScale: 1, dist: 10.5 }
  const tanHalf = Math.tan((FOV * Math.PI) / 360)
  function layout() {
    const aspect = view.w / view.h
    let D = 10.5
    let ringScale = 1
    let ox = 0
    let oy = 0
    let lift = 0.155
    if (aspect >= 1) {
      ringScale = clamp(aspect / 1.6, 0.72, 1)
      const visH = 2 * D * tanHalf
      const visW = visH * aspect
      if (view.w >= 900) {
        ox = 0.196 * visW // the sphere sits right of the name, as in the reference page
        oy = 0.02 * visH
      } else oy = 0.12 * visH
    } else {
      // portrait: fit the outer ring to the width, sphere in the upper part of the hero
      ringScale = 0.82
      const outer = RINGS[1].r * ringScale + 0.55
      D = Math.max(10.5, (2 * outer * 1.04) / (2 * tanHalf * aspect))
      oy = 0.2 * (2 * D * tanHalf)
      lift = 0.22
    }
    view.dist = D
    view.projScale = view.h / (2 * tanHalf)
    camera.aspect = aspect
    camera.position.set(0, D * lift, D * Math.sqrt(1 - lift * lift))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    stage.position.set(ox, oy, 0)
    ringsRoot.scale.setScalar(ringScale)
    scene.fog.near = D * 0.86
    scene.fog.far = D * 2.5
    // dust is sub-pixel at long range: keep its on-screen size steady
    dustMaterial.size = 0.018 * (D / 10.5) * (mobile ? 1.7 : 1)
  }

  function resize() {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    // Phones: the address bar growing/shrinking changes the height a little; ignore it.
    if (view.w === w && Math.abs(h - view.h) < 120) return
    view.w = w
    view.h = h
    renderer.setSize(w, h, false)
    applyComposerSize()
    layout()
    // The three flagship labels stay on only where they have room (wide landscape screens);
    // on phones and portrait tablets only the highlighted node shows its label.
    const roomy = !mobile && view.w >= 900 && view.w / view.h >= 1.15
    nodes.forEach((n, i) => labels[i].el.classList.toggle('main', roomy && n.ring === 0))
    for (const l of labels) {
      l.w = l.el.offsetWidth
      l.h = l.el.offsetHeight
      l.x = l.y = NaN
    }
  }
  function applyComposerSize() {
    if (!composer) return
    composer.setPixelRatio(renderer.getPixelRatio())
    composer.setSize(view.w, view.h)
    if (tier.bloomScale !== 1) bloom.setSize(Math.round(view.w * renderer.getPixelRatio() * tier.bloomScale), Math.round(view.h * renderer.getPixelRatio() * tier.bloomScale))
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  // compile now, off the first frame, so the first frames don't hitch
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera)
  await new Promise((r) => requestAnimationFrame(() => r()))

  // ---- interaction: hover (mouse), tap-to-highlight / tap-again-to-open (touch) ---
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, inside: false }
  let hovered = -1
  let selected = -1
  let listHover = -1
  let focus = -2
  let down = null

  const open = (n) => {
    if (/^https?:/.test(n.url)) window.open(n.url, '_blank', 'noopener,noreferrer')
    else if (n.url.startsWith('#')) location.hash = n.url
  }
  /** Nearest node to a screen point, with a generous radius for fingers; front-most wins. */
  function pick(px, py, touch) {
    let best = -1
    let bestDist = Infinity
    for (const n of nodes) {
      const s = n.screen
      const reach = Math.max(s.r * 1.6 + 6, touch ? 24 : 14)
      if (Math.hypot(s.x - px, s.y - py) <= reach && s.dist < bestDist) {
        best = n.index
        bestDist = s.dist
      }
    }
    return best
  }
  const local = (e) => {
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const [x, y] = local(e)
    pointer.x = x
    pointer.y = y
    pointer.nx = clamp((x / view.w) * 2 - 1, -1, 1)
    pointer.ny = clamp((y / view.h) * 2 - 1, -1, 1)
    pointer.inside = true
  }
  const onLeave = () => (pointer.inside = false)
  const onDown = (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() }
  }
  const onUp = (e) => {
    const d = down
    down = null
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600) return // a swipe or a long press, not a tap
    if (e.target.closest('a, button, .node-label')) return
    const touch = e.pointerType !== 'mouse'
    const [x, y] = local(e)
    const i = pick(x, y, touch)
    if (!touch) {
      if (i >= 0) open(nodes[i])
    } else if (i < 0) selected = -1
    else if (selected === i) open(nodes[i])
    else selected = i
  }
  const onAway = (e) => {
    if (!hero.contains(e.target)) selected = -1
  }
  hero.addEventListener('pointermove', onMove, { passive: true })
  hero.addEventListener('pointerleave', onLeave)
  hero.addEventListener('pointerdown', onDown, { passive: true })
  hero.addEventListener('pointerup', onUp)
  hero.addEventListener('pointercancel', () => (down = null))
  document.addEventListener('pointerdown', onAway, { passive: true })
  const listLinks = nodes.map((n, i) => {
    const on = () => (listHover = i)
    const off = () => listHover === i && (listHover = -1)
    n.link.addEventListener('pointerenter', on)
    n.link.addEventListener('pointerleave', off)
    n.link.addEventListener('focus', on)
    n.link.addEventListener('blur', off)
    return { on, off }
  })

  function applyFocus(i) {
    focus = i
    nodes.forEach((n, k) => {
      labels[k].el.classList.toggle('on', k === i)
      n.link.classList.toggle('on', k === i)
    })
  }

  // ---- the loop ----------------------------------------------------------------
  const tmp = new Vector3()
  const coreWorld = new Vector3()
  const mat = new Matrix4()
  const parallax = new Vector2()
  let heroVisible = true
  let enabled = true
  let raf = 0
  let last = 0
  let time = 0
  let acc = 0
  let quality = 3 // 3 full, 2 no bloom, 1 pixel ratio 1, 0 fewer dust points
  let ema = 16.7
  let frames = 0
  const calm = () => state.reducedMotion

  function adapt(dtMs) {
    ema = ema * 0.95 + dtMs * 0.05
    frames++
    if (frames < 90 || frames % 90 || ema < 24 || quality === 0) return
    quality--
    if (quality === 2) {
      composer?.dispose()
      composer = null
    } else if (quality === 1) {
      renderer.setPixelRatio(1)
      renderer.setSize(view.w, view.h, false)
    } else dustGeometry.setDrawRange(0, Math.floor(tier.dust * 0.4))
  }

  function frame(now) {
    raf = requestAnimationFrame(frame)
    let dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (calm()) {
      // reduced motion: slow the world down and draw ~20 times a second
      acc += dt
      if (acc < 1 / 20) return
      dt = acc * 0.15
      acc = 0
    }
    time += dt
    adapt(dt * 1000)

    const parallaxOn = pointer.inside && !calm()
    parallax.x += ((parallaxOn ? pointer.nx : 0) - parallax.x) * damp(2, dt)
    parallax.y += ((parallaxOn ? pointer.ny : 0) - parallax.y) * damp(2, dt)

    blob.uniforms.uTime.value = time * 0.9
    blob.mesh.rotation.y = time * 0.12
    shell.rotation.y = -time * 0.05
    shell.rotation.x = time * 0.03
    rig.rotation.y = time * 0.0367 + parallax.x * 0.35
    rig.rotation.x = parallax.y * 0.08
    dustPoints.rotation.y = time * 0.01

    // orbit the nodes, ease their scale toward the highlight
    const target = focus
    for (const n of nodes) {
      const ring = RINGS[n.ring]
      const a = n.phase + time * ring.speed
      n.mesh.position.set(Math.cos(a) * ring.r, Math.sin(time * 0.8 + n.index) * 0.06, Math.sin(a) * ring.r)
      const s = n.base * (n.index === target ? 1.6 : 1)
      n.mesh.scale.x += (s - n.mesh.scale.x) * 0.12
      n.mesh.scale.setScalar(n.mesh.scale.x)
    }
    scene.updateMatrixWorld()

    // project the nodes to screen pixels (labels, hover and tap all use this)
    coreWorld.setFromMatrixPosition(blob.mesh.matrixWorld)
    const coreDist = camera.position.distanceTo(coreWorld)
    for (const n of nodes) {
      tmp.setFromMatrixPosition(n.mesh.matrixWorld)
      const dist = camera.position.distanceTo(tmp)
      const sc = n.screen
      sc.dist = dist
      sc.back = dist > coreDist + 0.4
      sc.r = (NODE_RADIUS * n.mesh.scale.x * ringsRoot.scale.x * view.projScale) / dist
      tmp.project(camera)
      sc.x = (tmp.x * 0.5 + 0.5) * view.w
      sc.y = (-tmp.y * 0.5 + 0.5) * view.h
    }

    // hover (mouse): which node is under the pointer
    const h = pointer.inside ? pick(pointer.x, pointer.y, false) : -1
    if (h !== hovered) {
      hovered = h
      hero.style.cursor = h >= 0 ? 'pointer' : ''
    }
    const want = hovered >= 0 ? hovered : listHover >= 0 ? listHover : selected
    if (want !== focus) applyFocus(want)

    // packets: core -> node
    for (let i = 0; i < PACKETS; i++) {
      const pk = packets[i]
      pk.t += dt * 0.36
      if (pk.t > 1) {
        pk.t = 0
        pk.target = Math.floor(Math.random() * nodes.length)
      }
      const n = nodes[pk.target]
      tmp.copy(n.mesh.position).applyMatrix4(ringGroups[n.ring].matrix).multiplyScalar(pk.t)
      const s = Math.sin(pk.t * Math.PI)
      mat.makeScale(s, s, s).setPosition(tmp)
      packetMesh.setMatrixAt(i, mat)
    }
    packetMesh.instanceMatrix.needsUpdate = true

    // labels: pinned to their nodes (only the visible ones are touched)
    for (let i = 0; i < nodes.length; i++) {
      const l = labels[i]
      const show = i === focus || l.el.classList.contains('main')
      l.el.classList.toggle('back', nodes[i].screen.back)
      if (!show) continue
      const sc = nodes[i].screen
      let x = sc.x + sc.r + 12
      if (x + l.w > view.w - 8) x = sc.x - sc.r - 12 - l.w // no room on the right: flip to the left
      x = clamp(x, 8, Math.max(8, view.w - l.w - 8))
      const y = clamp(sc.y - l.h / 2, 8, view.h - l.h - 8)
      // (written so that the initial NaN counts as "moved")
      if (!(Math.abs(x - l.x) <= 0.4 && Math.abs(y - l.y) <= 0.4)) {
        l.x = x
        l.y = y
        l.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`
      }
    }

    renderer.info.reset()
    if (composer) composer.render()
    else renderer.render(scene, camera)
  }

  const shouldRun = () => enabled && heroVisible && !document.hidden
  function start() {
    if (raf || !shouldRun()) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }
  const sync = () => (shouldRun() ? start() : stop())
  const io = new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting
    if (!heroVisible) selected = -1
    sync()
  })
  io.observe(hero)
  document.addEventListener('visibilitychange', sync)
  start()

  const controller = {
    setEnabled(on) {
      enabled = on
      sync()
    },
    /** Client-space centre of a node (for tests and tooling). */
    project(i) {
      const rect = canvas.getBoundingClientRect()
      const s = nodes[i].screen
      return { x: rect.left + s.x, y: rect.top + s.y, r: s.r, back: s.back }
    },
    info() {
      const r = renderer.info.render
      return {
        running: Boolean(raf),
        pixelRatio: renderer.getPixelRatio(),
        quality,
        frameMs: +ema.toFixed(1),
        triangles: r.triangles,
        drawCalls: r.calls,
        blobTriangles: blob.triangles,
        dust: tier.dust,
        bloomScale: composer ? tier.bloomScale : 0,
        programs: renderer.info.programs?.length ?? 0,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        nodes: nodes.map((n) => ({ slug: n.slug, ring: n.ring })),
        focus,
        selected,
        mobile,
        canvas: { w: canvas.width, h: canvas.height },
      }
    },
    dispose() {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      document.removeEventListener('pointerdown', onAway)
      hero.removeEventListener('pointermove', onMove)
      hero.removeEventListener('pointerleave', onLeave)
      hero.removeEventListener('pointerdown', onDown)
      hero.removeEventListener('pointerup', onUp)
      nodes.forEach((n, i) => {
        n.link.removeEventListener('pointerenter', listLinks[i].on)
        n.link.removeEventListener('pointerleave', listLinks[i].off)
        n.link.removeEventListener('focus', listLinks[i].on)
        n.link.removeEventListener('blur', listLinks[i].off)
        n.link.classList.remove('on')
      })
      labels.forEach((l) => l.el.remove())
      composer?.dispose()
      scene.traverse((o) => {
        o.geometry?.dispose()
        const m = o.material
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.map?.dispose(), x.dispose()))
      })
      env.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
  if (debug) window.__hero = controller
  return controller
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
