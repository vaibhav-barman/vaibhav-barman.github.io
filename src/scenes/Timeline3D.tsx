import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, CatmullRomCurve3, Mesh, MeshBasicMaterial, TubeGeometry, Vector3 } from 'three'
import { portfolio } from '../data/portfolio'
import { useApp } from '../store/useApp'
import { labelPortal, palette } from './palette'

/**
 * A glowing tube the camera flies alongside between the journey and terminal
 * sections. One node per timeline entry, plus a pulsing "next" node built
 * from the JSON's status.
 */
export function Timeline3D({ from, to, labels, animate }: { from: [number, number, number]; to: [number, number, number]; labels: boolean; animate: boolean }) {
  const entries = portfolio.timeline
  const { curve, tube } = useMemo(() => {
    const a = new Vector3(...from).add(new Vector3(1.6, -0.9, -1))
    const b = new Vector3(...to).add(new Vector3(1.2, -0.6, 2))
    const pts = Array.from({ length: 7 }, (_, i) => {
      const t = i / 6
      return new Vector3().lerpVectors(a, b, t).add(new Vector3(Math.sin(t * Math.PI * 2) * 0.6, Math.cos(t * Math.PI * 1.5) * 0.3, 0))
    })
    const curve = new CatmullRomCurve3(pts)
    return { curve, tube: new TubeGeometry(curve, 160, 0.025, 8, false) }
  }, [from, to])

  const stops = useMemo(() => {
    const n = entries.length + 1
    return Array.from({ length: n }, (_, i) => curve.getPointAt((i + 0.5) / n))
  }, [curve, entries.length])

  const tubeMat = useRef<MeshBasicMaterial>(null)
  const pulse = useRef<Mesh>(null)
  const pulseMat = useRef<MeshBasicMaterial>(null)
  const lit = useApp((s) => s.highlight?.kind === 'journey')
  const near = useApp((s) => s.activeSection === 'journey')

  useFrame((state) => {
    tubeMat.current?.color.copy(palette.accent)
    pulseMat.current?.color.copy(palette.hot)
    if (pulse.current) {
      const t = animate ? (state.clock.elapsedTime * 0.08) % 1 : 0.5
      pulse.current.position.copy(curve.getPointAt(t))
    }
    if (tubeMat.current) tubeMat.current.opacity = lit ? 0.95 : 0.6
  })

  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial ref={tubeMat} transparent toneMapped={false} />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial ref={pulseMat} toneMapped={false} />
      </mesh>
      {entries.map((e, i) => (
        <Stop key={i} pos={stops[i]} title={e.title} sub={[e.org, e.when].filter(Boolean).join(' · ')} labels={labels && near} />
      ))}
      <Stop pos={stops[entries.length]} title="next →" sub={portfolio.status} labels={labels && near} hot animate={animate} />
    </group>
  )
}

function Stop({ pos, title, sub, labels, hot = false, animate = false }: { pos: Vector3; title: string; sub: string; labels: boolean; hot?: boolean; animate?: boolean }) {
  const mat = useRef<MeshBasicMaterial>(null)
  const ring = useRef<Mesh>(null)
  const ringMat = useRef<MeshBasicMaterial>(null)
  useFrame((state) => {
    mat.current?.color.copy(hot ? palette.hot : palette.accent)
    ringMat.current?.color.copy(hot ? palette.hot : palette.accent)
    if (ring.current && animate) {
      const s = 1 + ((state.clock.elapsedTime * 0.8) % 1) * 1.6
      ring.current.scale.setScalar(s)
      if (ringMat.current) ringMat.current.opacity = 0.6 * (1 - (s - 1) / 1.6)
    }
  })
  return (
    <group position={pos}>
      <mesh>
        <icosahedronGeometry args={[0.14, 2]} />
        <meshBasicMaterial ref={mat} toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial ref={ringMat} transparent opacity={0.25} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {labels && (
        <Html portal={labelPortal} position={[0.3, 0.1, 0]} className="pointer-events-none select-none" zIndexRange={[5, 0]}>
          <div className="w-max max-w-[220px] rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono backdrop-blur-sm">
            <p className={`text-[11px] ${hot ? 'text-hot' : 'text-accent'}`}>{title}</p>
            <p className="text-[10px] text-muted">{sub}</p>
          </div>
        </Html>
      )}
    </group>
  )
}
