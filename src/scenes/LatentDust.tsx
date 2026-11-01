import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three'
import { palette, rng } from './palette'

/**
 * Ambient particles filling the whole camera path: a single draw call
 * (GPU points), twinkle + drift computed in the vertex shader.
 */
export function LatentDust({ count, animate }: { count: number; animate: boolean }) {
  const mat = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const r = rng(7)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 34
      pos[i * 3 + 1] = (r() - 0.5) * 18
      pos[i * 3 + 2] = 14 - r() * 140
      seed[i] = r()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('seed', new BufferAttribute(seed, 1))
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uA: { value: palette.accent }, uB: { value: palette.accent2 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } }),
    [],
  )

  useFrame((_, dt) => {
    if (animate && mat.current) mat.current.uniforms.uTime.value += dt
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          attribute float seed;
          uniform float uTime;
          uniform float uPx;
          varying float vSeed;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            p.y += sin(uTime * 0.25 + seed * 40.0) * 0.25;
            p.x += cos(uTime * 0.2 + seed * 25.0) * 0.2;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float tw = 0.55 + 0.45 * sin(uTime * (0.6 + seed) + seed * 60.0);
            gl_PointSize = (1.2 + seed * 2.2) * uPx * (18.0 / -mv.z);
            vSeed = seed;
            vAlpha = tw * smoothstep(60.0, 8.0, -mv.z);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uA;
          uniform vec3 uB;
          varying float vSeed;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            vec3 c = mix(uA, uB, step(0.7, vSeed));
            gl_FragColor = vec4(c, a * vAlpha * 0.8);
          }
        `}
      />
    </points>
  )
}
