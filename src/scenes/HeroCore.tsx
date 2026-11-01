import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, MeshBasicMaterial, ShaderMaterial } from 'three'
import { palette } from './palette'

/** The "AI core": a pulsing wireframe icosahedron with orbit rings and a soft glow. */
export function HeroCore({ position, animate }: { position: [number, number, number]; animate: boolean }) {
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const wire = useRef<MeshBasicMaterial>(null)
  const ring1 = useRef<LineBasicMaterial>(null)
  const ring2 = useRef<LineBasicMaterial>(null)
  const glow = useRef<ShaderMaterial>(null)
  const rings = useMemo(() => [ringGeometry(2.05), ringGeometry(2.5)], [])
  const glowUniforms = useMemo(() => ({ uColor: { value: palette.accent }, uTime: { value: 0 } }), [])

  useFrame((state, dt) => {
    wire.current?.color.copy(palette.accent)
    ring1.current?.color.copy(palette.accent2)
    ring2.current?.color.copy(palette.accent)
    if (!animate) return
    const t = state.clock.elapsedTime
    glowUniforms.uTime.value = t
    if (group.current) {
      group.current.rotation.y += dt * 0.25
      group.current.position.y = position[1] + Math.sin(t * 0.8) * 0.12
    }
    if (inner.current) {
      inner.current.rotation.x -= dt * 0.4
      inner.current.rotation.z += dt * 0.3
      const s = 1 + Math.sin(t * 2.2) * 0.04
      inner.current.scale.setScalar(s)
    }
  })

  return (
    <group position={position}>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[1.25, 1]} />
          <meshBasicMaterial ref={wire} wireframe transparent opacity={0.55} toneMapped={false} />
        </mesh>
        <group ref={inner}>
          <mesh>
            <octahedronGeometry args={[0.55, 0]} />
            <meshBasicMaterial color="#ffffff" wireframe toneMapped={false} />
          </mesh>
        </group>
        <group rotation={[Math.PI / 2.4, 0, 0]}>
          <lineLoop geometry={rings[0]}>
            <lineBasicMaterial ref={ring1} transparent opacity={0.6} toneMapped={false} />
          </lineLoop>
        </group>
        <group rotation={[Math.PI / 2, 0.6, 0.3]}>
          <lineLoop geometry={rings[1]}>
            <lineBasicMaterial ref={ring2} transparent opacity={0.3} toneMapped={false} />
          </lineLoop>
        </group>
      </group>
      {/* Billboard glow */}
      <sprite scale={[7, 7, 1]}>
        <shaderMaterial
          ref={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={glowUniforms}
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
              vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
              mv.xy += (uv - 0.5) * scale;
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={/* glsl */ `
            uniform vec3 uColor;
            uniform float uTime;
            varying vec2 vUv;
            void main() {
              float d = length(vUv - 0.5) * 2.0;
              float a = pow(max(0.0, 1.0 - d), 2.6) * (0.32 + 0.05 * sin(uTime * 2.0));
              gl_FragColor = vec4(uColor, a);
            }
          `}
        />
      </sprite>
    </group>
  )
}

function ringGeometry(radius: number, segments = 96) {
  const pts: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pts, 3))
  return g
}
