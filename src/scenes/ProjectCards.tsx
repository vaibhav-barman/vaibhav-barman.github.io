import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { easing } from 'maath'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, Group, LineBasicMaterial, Mesh, MeshBasicMaterial, SRGBColorSpace, Vector3 } from 'three'
import { config } from '../config'
import { portfolio, type Project } from '../data/portfolio'
import { useApp } from '../store/useApp'
import { allowSceneEvent } from './events'
import { palette } from './palette'

const W = 2.5
const H = 1.56

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      out.push(line)
      line = w
      if (out.length === maxLines) break
    } else line = test
  }
  if (out.length < maxLines && line) out.push(line)
  if (out.length === maxLines && words.join(' ') !== out.join(' ')) out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S*$/, '…')
  return out
}

/** Draws a card face from project data onto a canvas (so text is generated from the JSON). */
function drawCard(p: Project, accent: string, accent2: string): CanvasTexture {
  const S = 2 // supersample
  const c = document.createElement('canvas')
  c.width = 512 * S
  c.height = 320 * S
  const g = c.getContext('2d')!
  g.scale(S, S)
  const grad = g.createLinearGradient(0, 0, 512, 320)
  grad.addColorStop(0, 'rgba(18, 26, 46, 0.92)')
  grad.addColorStop(1, 'rgba(6, 9, 18, 0.88)')
  g.fillStyle = grad
  g.beginPath()
  g.roundRect(2, 2, 508, 316, 22)
  g.fill()
  g.strokeStyle = accent + '66'
  g.lineWidth = 2
  g.stroke()
  // scanline sheen
  g.fillStyle = 'rgba(255,255,255,0.025)'
  for (let y = 8; y < 316; y += 4) g.fillRect(4, y, 504, 1)

  const mono = "'JetBrains Mono Variable', ui-monospace, monospace"
  const sans = "'Space Grotesk Variable', system-ui, sans-serif"
  g.font = `500 15px ${mono}`
  g.fillStyle = accent
  g.fillText(`${String(p.index).padStart(2, '0')} // ${p.categoryLabel.toUpperCase()}`, 28, 42)
  if (p.featured) {
    g.fillStyle = '#ff2bd6'
    g.fillText('★ FEATURED', 512 - 28 - g.measureText('★ FEATURED').width, 42)
  }
  g.fillStyle = '#eef6ff'
  g.font = `700 34px ${sans}`
  const title = wrapText(g, p.title, 456, 2)
  title.forEach((l, i) => g.fillText(l, 28, 92 + i * 38))
  const y0 = 92 + title.length * 38 + 6
  g.fillStyle = '#a3afc4'
  g.font = `400 16px ${sans}`
  wrapText(g, p.summary, 456, title.length > 1 ? 3 : 4).forEach((l, i) => g.fillText(l, 28, y0 + i * 23))
  // tags
  g.font = `500 13px ${mono}`
  let x = 28
  for (const t of p.tags.slice(0, 4)) {
    const w = g.measureText(t).width + 18
    if (x + w > 484) break
    g.strokeStyle = accent2 + '99'
    g.lineWidth = 1.5
    g.beginPath()
    g.roundRect(x, 272, w, 26, 7)
    g.stroke()
    g.fillStyle = '#cdd6e6'
    g.fillText(t, x + 9, 290)
    x += w + 8
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function Card({ project, angle, radius, interactive }: { project: Project; angle: number; radius: number; interactive: boolean }) {
  const theme = useApp((s) => s.theme)
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])
  const texture = useMemo(() => {
    const p = config.themes[theme]
    return drawCard(project, p.accent, p.accent2)
  }, [project, theme, fontsReady])
  useEffect(() => () => texture.dispose(), [texture])

  const tilt = useRef<Group>(null)
  const face = useRef<Mesh>(null)
  const frame = useRef<LineBasicMaterial>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  const hovered = useRef(false)
  const pointerUv = useRef({ x: 0.5, y: 0.5 })
  const world = useMemo(() => new Vector3(), [])
  const center = useMemo(() => new Vector3(), [])

  const frameGeom = useMemo(() => {
    const hw = W / 2 + 0.03
    const hh = H / 2 + 0.03
    return new Float32Array([-hw, -hh, 0, hw, -hh, 0, hw, -hh, 0, hw, hh, 0, hw, hh, 0, -hw, hh, 0, -hw, hh, 0, -hw, -hh, 0])
  }, [])

  useFrame((_, dt) => {
    const s = useApp.getState()
    const focused = s.focusProject === project.slug
    const active = focused || hovered.current
    // `projects` command: a short wave of light across every card.
    const since = s.highlight?.kind === 'projects' && !s.highlight.slug ? (performance.now() - s.highlightAt) / 1000 : 99
    const wave = since < 2 ? Math.max(0, 1 - Math.abs(since * 1.6 - project.index * 0.12)) : 0
    const g = tilt.current
    if (!g || !face.current) return
    // Depth-based fade: cards at the back of the ring recede.
    face.current.getWorldPosition(world)
    g.parent?.parent?.getWorldPosition(center)
    const front = (world.z - center.z) / radius // -1 back .. 1 front
    const base = interactive ? 0.25 + 0.75 * Math.max(0, (front + 1) / 2) : 0.35
    const d = Math.min(dt, 0.05)
    if (mat.current) easing.damp(mat.current, 'opacity', active ? 1 : base, 0.2, d)
    frame.current?.color.copy(active || wave > 0.3 ? palette.accent : palette.accent2)
    if (frame.current) easing.damp(frame.current, 'opacity', active ? 1 : Math.max(base * 0.5, wave), 0.12, d)
    const tx = hovered.current ? (pointerUv.current.y - 0.5) * -0.35 : 0
    const ty = hovered.current ? (pointerUv.current.x - 0.5) * 0.45 : 0
    easing.damp(g.rotation, 'x', tx, 0.15, d)
    easing.damp(g.rotation, 'y', ty, 0.15, d)
    easing.damp3(g.scale, active ? [1.1, 1.1, 1.1] : [1, 1, 1], 0.18, d)
    easing.damp(g.position, 'z', active ? 0.35 : 0, 0.2, d)
  })

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          if (!allowSceneEvent(e)) return
          e.stopPropagation()
          hovered.current = true
          document.documentElement.dataset.hover3d = 'true'
          useApp.getState().setFocusProject(project.slug)
        },
        onPointerOut: () => {
          hovered.current = false
          delete document.documentElement.dataset.hover3d
          if (useApp.getState().focusProject === project.slug) useApp.getState().setFocusProject(null)
        },
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          if (e.uv) pointerUv.current = { x: e.uv.x, y: e.uv.y }
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (!allowSceneEvent(e)) return
          e.stopPropagation()
          useApp.getState().setDetailProject(project.slug)
        },
      }
    : {}

  return (
    <group position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]} rotation={[0, angle, 0]}>
      <group ref={tilt}>
        <mesh ref={face} {...handlers}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial ref={mat} map={texture} transparent toneMapped={false} depthWrite={false} opacity={0.6} color="#d8dde8" />
        </mesh>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[frameGeom, 3]} />
          </bufferGeometry>
          <lineBasicMaterial ref={frame} transparent toneMapped={false} />
        </lineSegments>
      </group>
    </group>
  )
}

/**
 * Floating holographic project cards on a slow carousel. The focused project
 * (CLI `open`, list hover) rotates to the front.
 */
export function ProjectCards({ position, interactive: wanted, animate }: { position: [number, number, number]; interactive: boolean; animate: boolean }) {
  const ring = useRef<Group>(null)
  const near = useApp((s) => s.activeSection === 'projects')
  const interactive = wanted && near
  const projects = portfolio.projects
  const n = projects.length
  const radius = Math.max(3, n * 0.38)
  const step = (Math.PI * 2) / n
  const rot = useRef(0)

  useFrame((_, dt) => {
    const g = ring.current
    if (!g) return
    const s = useApp.getState()
    const idx = projects.findIndex((p) => p.slug === s.focusProject)
    if (idx >= 0) {
      // Bring the focused card to the front (angle 0 faces the camera).
      const target = -idx * step
      const delta = Math.atan2(Math.sin(target - rot.current), Math.cos(target - rot.current))
      rot.current += delta * (1 - Math.exp(-dt * 4))
    } else if (animate) {
      rot.current -= dt * config.scene.carouselSpeed
    }
    g.rotation.y = rot.current
  })

  return (
    <group position={position} rotation={[0.1, 0, 0]}>
      <group ref={ring}>
        {projects.map((p, i) => (
          <Card key={p.slug} project={p} angle={i * step} radius={radius} interactive={interactive} />
        ))}
      </group>
    </group>
  )
}
