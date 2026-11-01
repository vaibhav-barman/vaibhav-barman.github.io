import { Html } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { easing } from 'maath'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, LineBasicMaterial, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { portfolio } from '../data/portfolio'
import { useApp } from '../store/useApp'
import { allowSceneEvent } from './events'
import { labelPortal, palette, rng } from './palette'

interface Node {
  slug: string
  name: string
  level: number
  group: string
  pos: Vector3
}

/**
 * Skills as an interactive node graph: one hub per category, skills orbit
 * their hub (size = proficiency), project tech tags drift in an outer cloud.
 * Hover syncs with the HTML list; `skills <group>` lights a group up.
 */
export function SkillCluster({ position, interactive, animate }: { position: [number, number, number]; interactive: boolean; animate: boolean }) {
  const root = useRef<Group>(null)
  const groups = portfolio.skillGroups
  const near = useApp((s) => s.activeSection === 'skills')
  const labels = interactive && near

  const { hubs, nodes, edges, tags } = useMemo(() => {
    const r = rng(21)
    const hubR = groups.length > 1 ? 1.9 : 0
    const hubs = groups.map((g, i) => {
      const a = (i / groups.length) * Math.PI * 2 - Math.PI / 2
      return { slug: g.slug, name: g.name, pos: new Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR * 0.8, (r() - 0.5) * 0.8) }
    })
    const nodes: Node[] = []
    groups.forEach((g, gi) => {
      g.skills.forEach((s, si) => {
        const n = g.skills.length
        const y = n > 1 ? 1 - (si / (n - 1)) * 2 : 0
        const rad = Math.sqrt(1 - y * y)
        const th = si * 2.4 + gi
        const R = 1.05 + r() * 0.3
        nodes.push({
          slug: s.slug,
          name: s.name,
          level: s.level,
          group: g.slug,
          pos: hubs[gi].pos.clone().add(new Vector3(Math.cos(th) * rad * R, y * R * 0.9, Math.sin(th) * rad * R)),
        })
      })
    })
    const pts: number[] = []
    nodes.forEach((n) => {
      const h = hubs.find((x) => x.slug === n.group)!
      pts.push(h.pos.x, h.pos.y, h.pos.z, n.pos.x, n.pos.y, n.pos.z)
    })
    for (let i = 0; i < hubs.length; i++) {
      const a = hubs[i].pos
      const b = hubs[(i + 1) % hubs.length].pos
      if (hubs.length > 1) pts.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
    const edges = new BufferGeometry()
    edges.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))

    const tags = portfolio.techTags.map((t, i) => {
      const y = 1 - (i / Math.max(1, portfolio.techTags.length - 1)) * 2
      const rad = Math.sqrt(1 - y * y)
      const th = i * 2.399963
      const R = 3.6 + r() * 0.6
      return { name: t, pos: new Vector3(Math.cos(th) * rad * R, y * R * 0.6, Math.sin(th) * rad * R) }
    })
    return { hubs, nodes, edges, tags }
  }, [groups])

  const edgeMat = useRef<LineBasicMaterial>(null)

  useFrame((_, dt) => {
    if (root.current && animate) root.current.rotation.y += dt * 0.08
    edgeMat.current?.color.copy(palette.accent2)
  })

  return (
    <group position={position} rotation={[0.15, -0.3, 0]}>
      <group ref={root}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial ref={edgeMat} transparent opacity={0.35} toneMapped={false} />
        </lineSegments>
        {hubs.map((h) => (
          <Hub key={h.slug} slug={h.slug} name={h.name} pos={h.pos} labels={labels} />
        ))}
        {nodes.map((n) => (
          <SkillNode key={n.slug} node={n} interactive={interactive} labels={labels} />
        ))}
        {tags.map((t) => (
          <mesh key={t.name} position={t.pos}>
            <icosahedronGeometry args={[0.035, 0]} />
            <meshBasicMaterial color="#8b97ad" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function useGroupLit(group: string) {
  const h = useApp((s) => s.highlight)
  return h?.kind === 'skills' && (!h.group || h.group === group)
}

function Hub({ slug, name, pos, labels }: { slug: string; name: string; pos: Vector3; labels: boolean }) {
  const mat = useRef<MeshBasicMaterial>(null)
  const glow = useRef<MeshBasicMaterial>(null)
  const lit = useGroupLit(slug)
  useFrame((state) => {
    mat.current?.color.copy(palette.accent2)
    glow.current?.color.copy(palette.accent2)
    if (glow.current) glow.current.opacity = (lit ? 0.35 : 0.14) + Math.sin(state.clock.elapsedTime * 2) * 0.04
  })
  return (
    <group position={pos}>
      <mesh>
        <icosahedronGeometry args={[0.2, 2]} />
        <meshBasicMaterial ref={mat} toneMapped={false} />
      </mesh>
      <mesh scale={lit ? 2.6 : 2}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial ref={glow} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {labels && (
        <Html portal={labelPortal} center position={[0, 0.42, 0]} className="pointer-events-none select-none" zIndexRange={[5, 0]}>
          <span
            className={`block rounded-md border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap backdrop-blur-sm transition ${
              lit ? 'border-accent/60 bg-accent/15 text-accent' : 'border-white/10 bg-black/40 text-ink/80'
            }`}
          >
            {name}
          </span>
        </Html>
      )}
    </group>
  )
}

function SkillNode({ node, interactive, labels }: { node: Node; interactive: boolean; labels: boolean }) {
  const mesh = useRef<Mesh>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  const hover = useApp((s) => s.hoverSkill === node.slug)
  const lit = useGroupLit(node.group)
  const size = 0.06 + (node.level / 100) * 0.1

  useFrame((_, dt) => {
    if (!mesh.current || !mat.current) return
    mat.current.color.copy(hover || lit ? palette.accent : palette.accent).lerp(palette.accent2, hover ? 0 : 0.25)
    easing.damp3(mesh.current.scale, hover ? [1.8, 1.8, 1.8] : lit ? [1.3, 1.3, 1.3] : [1, 1, 1], 0.15, Math.min(dt, 0.05))
  })

  return (
    <group position={node.pos}>
      <mesh
        ref={mesh}
        onPointerOver={
          interactive
            ? (e: ThreeEvent<PointerEvent>) => {
                if (!allowSceneEvent(e)) return
                e.stopPropagation()
                useApp.getState().setHoverSkill(node.slug)
                document.documentElement.dataset.hover3d = 'true'
              }
            : undefined
        }
        onPointerOut={
          interactive
            ? () => {
                if (useApp.getState().hoverSkill === node.slug) useApp.getState().setHoverSkill(null)
                delete document.documentElement.dataset.hover3d
              }
            : undefined
        }
      >
        <icosahedronGeometry args={[size, 1]} />
        <meshBasicMaterial ref={mat} toneMapped={false} />
      </mesh>
      {labels && hover && (
        <Html portal={labelPortal} center position={[0, size + 0.22, 0]} className="pointer-events-none select-none" zIndexRange={[6, 0]}>
          <span className="block rounded-md border border-accent/50 bg-black/70 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-accent">
            {node.name} · {node.level}%
          </span>
        </Html>
      )}
    </group>
  )
}
