import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, InstancedMesh, MeshBasicMaterial, Object3D, Vector3 } from 'three'
import { config } from '../config'
import { palette, rng } from './palette'

/**
 * Neural-network node graph: instanced glowing nodes + synapse line segments
 * with signal pulses travelling along them (one draw call each).
 * Half the nodes form a "brain" shell around the hero core; the rest are
 * scattered along the camera path.
 */
export function NeuralField({ count, center, animate }: { count: number; center: [number, number, number]; animate: boolean }) {
  const shellRef = useRef<Group>(null)

  const { shell, scattered, shellLinks, pathLinks } = useMemo(() => {
    const r = rng(42)
    const shellCount = Math.floor(count * 0.45)
    const shell: Vector3[] = []
    // Fibonacci sphere with jitter → evenly spread "cortex".
    for (let i = 0; i < shellCount; i++) {
      const y = 1 - (i / (shellCount - 1)) * 2
      const rad = Math.sqrt(1 - y * y)
      const th = i * 2.399963
      const R = 2.6 + r() * 1.4
      shell.push(new Vector3(Math.cos(th) * rad * R, y * R * 0.85, Math.sin(th) * rad * R))
    }
    const scattered: Vector3[] = []
    for (let i = shellCount; i < count; i++) {
      scattered.push(new Vector3((r() - 0.5) * 22, (r() - 0.5) * 9, 6 - r() * 120))
    }
    const link = (pts: Vector3[], maxD: number, maxPer: number) => {
      const out: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const near = pts
          .map((p, j) => ({ j, d: p.distanceTo(pts[i]) }))
          .filter((x) => x.j > i && x.d < maxD)
          .sort((a, b) => a.d - b.d)
          .slice(0, maxPer)
        for (const n of near) out.push(i, n.j)
      }
      return out
    }
    return { shell, scattered, shellLinks: link(shell, 1.9, 3), pathLinks: link(scattered, config.scene.linkDistance * 2.2, 2) }
  }, [count])

  const buildLines = (pts: Vector3[], links: number[], seedBase: number) => {
    const r = rng(seedBase)
    const n = links.length / 2
    const pos = new Float32Array(n * 6)
    const along = new Float32Array(n * 2)
    const seed = new Float32Array(n * 2)
    for (let k = 0; k < n; k++) {
      const a = pts[links[k * 2]]
      const b = pts[links[k * 2 + 1]]
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6)
      along[k * 2] = 0
      along[k * 2 + 1] = 1
      const s = r()
      seed[k * 2] = s
      seed[k * 2 + 1] = s
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('along', new BufferAttribute(along, 1))
    g.setAttribute('seed', new BufferAttribute(seed, 1))
    return g
  }
  const shellLines = useMemo(() => buildLines(shell, shellLinks, 3), [shell, shellLinks])
  const pathLines = useMemo(() => buildLines(scattered, pathLinks, 5), [scattered, pathLinks])

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uA: { value: palette.accent }, uB: { value: palette.accent2 } }), [])

  useFrame((state, dt) => {
    if (!animate) return
    uniforms.uTime.value += dt
    if (shellRef.current) shellRef.current.rotation.y += dt * 0.06
    if (shellRef.current) shellRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.12
  })

  const material = (
    <shaderMaterial
      transparent
      depthWrite={false}
      blending={AdditiveBlending}
      uniforms={uniforms}
      vertexShader={LINE_VERT}
      fragmentShader={LINE_FRAG}
    />
  )

  return (
    <>
      <group position={center} ref={shellRef}>
        <lineSegments geometry={shellLines} frustumCulled={false}>
          {material}
        </lineSegments>
      </group>
      <ShellNodes points={shell} center={center} groupRef={shellRef} />
      <lineSegments geometry={pathLines} frustumCulled={false}>
        {material}
      </lineSegments>
      <ScatteredNodes points={scattered} />
    </>
  )
}

const LINE_VERT = /* glsl */ `
  attribute float along;
  attribute float seed;
  varying float vAlong;
  varying float vSeed;
  varying float vFade;
  void main() {
    vAlong = along; vSeed = seed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFade = smoothstep(50.0, 6.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const LINE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uA;
  uniform vec3 uB;
  varying float vAlong;
  varying float vSeed;
  varying float vFade;
  void main() {
    float head = fract(uTime * (0.18 + vSeed * 0.25) + vSeed * 7.0);
    float pulse = smoothstep(0.12, 0.0, abs(vAlong - head));
    vec3 c = mix(uB, uA, pulse);
    gl_FragColor = vec4(c, (0.12 + pulse * 0.9) * vFade);
  }
`

function ShellNodes({ points, groupRef, center }: { points: Vector3[]; center: [number, number, number]; groupRef: RefObject<Group | null> }) {
  const ref = useRef<InstancedMesh>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const r = rng(11)
    points.forEach((p, i) => {
      o.position.copy(p)
      o.scale.setScalar(0.045 + r() * 0.06)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [points])
  useFrame(() => {
    const g = groupRef.current
    const m = ref.current
    if (g && m) {
      m.position.set(...center)
      m.rotation.copy(g.rotation)
    }
    mat.current?.color.copy(palette.accent)
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} toneMapped={false} />
    </instancedMesh>
  )
}

function ScatteredNodes({ points }: { points: Vector3[] }) {
  const ref = useRef<InstancedMesh>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const r = rng(13)
    points.forEach((p, i) => {
      o.position.copy(p)
      o.scale.setScalar(0.035 + r() * 0.06)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [points])
  useFrame(() => mat.current?.color.copy(palette.accent2).lerp(palette.accent, 0.4))
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial ref={mat} toneMapped={false} />
    </instancedMesh>
  )
}
