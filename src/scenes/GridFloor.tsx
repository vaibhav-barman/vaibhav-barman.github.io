import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Mesh } from 'three'
import { palette } from './palette'

/** Infinite-looking neon grid that follows the camera along z. */
export function GridFloor({ y = -3.6 }: { y?: number }) {
  const mesh = useRef<Mesh>(null)
  const camera = useThree((s) => s.camera)
  const uniforms = useMemo(() => ({ uA: { value: palette.accent }, uB: { value: palette.accent2 }, uCam: { value: [0, 0] } }), [])

  useFrame(() => {
    if (!mesh.current) return
    // Snap to whole cells so the lines don't swim.
    mesh.current.position.x = Math.round(camera.position.x / 2) * 2
    mesh.current.position.z = Math.round(camera.position.z / 2) * 2
    uniforms.uCam.value = [camera.position.x, camera.position.z]
  })

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} frustumCulled={false}>
      <planeGeometry args={[160, 160, 1, 1]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uA;
          uniform vec3 uB;
          uniform vec2 uCam;
          varying vec3 vWorld;
          float grid(vec2 p, float size) {
            vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
            return 1.0 - min(min(g.x, g.y), 1.0);
          }
          void main() {
            vec2 p = vWorld.xz;
            float minor = grid(p, 1.0) * 0.25;
            float major = grid(p, 5.0);
            float dist = length(p - uCam);
            float fade = smoothstep(34.0, 3.0, dist);
            vec3 c = mix(uB, uA, major);
            float a = max(minor, major) * fade * 0.32;
            gl_FragColor = vec4(c, a);
          }
        `}
      />
    </mesh>
  )
}
