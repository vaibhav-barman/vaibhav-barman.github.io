import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, MeshBasicMaterial } from 'three'
import { palette, rng } from './palette'

const KINDS = ['octa', 'tetra', 'torus', 'box'] as const

/** Sparse wireframe primitives drifting along the camera path. */
export function FloatingShapes({ count = 14, animate }: { count?: number; animate: boolean }) {
  const shapes = useMemo(() => {
    const r = rng(99)
    return Array.from({ length: count }, (_, i) => ({
      kind: KINDS[i % KINDS.length],
      pos: [r() < 0.7 ? 4 + r() * 8 : -11 - r() * 4, (r() - 0.5) * 7, 4 - (i / count) * 118 - r() * 4] as [number, number, number],
      scale: 0.35 + r() * 0.55,
      speed: 0.2 + r() * 0.5,
      phase: r() * Math.PI * 2,
      useB: r() > 0.5,
    }))
  }, [count])
  const refs = useRef<(Group | null)[]>([])
  const mats = useRef<(MeshBasicMaterial | null)[]>([])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    shapes.forEach((s, i) => {
      const g = refs.current[i]
      mats.current[i]?.color.copy(s.useB ? palette.accent2 : palette.accent)
      if (!g || !animate) return
      g.rotation.x += dt * s.speed * 0.6
      g.rotation.y += dt * s.speed
      g.position.y = s.pos[1] + Math.sin(t * s.speed + s.phase) * 0.4
    })
  })

  return (
    <>
      {shapes.map((s, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)} position={s.pos} scale={s.scale}>
          <mesh>
            {s.kind === 'octa' && <octahedronGeometry args={[1, 0]} />}
            {s.kind === 'tetra' && <tetrahedronGeometry args={[1, 0]} />}
            {s.kind === 'torus' && <torusGeometry args={[0.8, 0.22, 8, 24]} />}
            {s.kind === 'box' && <boxGeometry args={[1.2, 1.2, 1.2]} />}
            <meshBasicMaterial ref={(m) => void (mats.current[i] = m)} wireframe transparent opacity={0.22} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}
