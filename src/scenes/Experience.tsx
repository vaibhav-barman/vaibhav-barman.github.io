import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useState } from 'react'
import { config } from '../config'
import { useApp } from '../store/useApp'
import { CameraRig } from './CameraRig'
import { FloatingShapes } from './FloatingShapes'
import { GridFloor } from './GridFloor'
import { HeroCore } from './HeroCore'
import { LatentDust } from './LatentDust'
import { NeuralField } from './NeuralField'
import { anchor, initPalette, tickPalette } from './palette'

const Effects = lazy(() => import('./Effects'))

function PaletteTicker() {
  useFrame((_, dt) => tickPalette(Math.min(dt, 0.1)))
  return null
}

/** Signals the loader once the first frame has rendered. */
function ReadySignal() {
  const [done, setDone] = useState(false)
  useFrame(() => {
    if (!done) {
      setDone(true)
      requestAnimationFrame(() => useApp.getState().setSceneReady())
    }
  })
  return null
}

export interface ExperienceProps {
  mobile: boolean
  reduced: boolean
}

/** The whole 3D world. Lazy-loaded; never part of the initial bundle. */
export default function Experience({ mobile, reduced }: ExperienceProps) {
  const [dpr, setDpr] = useState<number>(Math.min(window.devicePixelRatio, mobile ? config.scene.maxDpr.mobile : config.scene.maxDpr.desktop))
  const [wide, setWide] = useState(() => window.innerWidth >= 1024)
  const animate = !reduced

  useEffect(() => {
    initPalette()
    const onResize = () => setWide(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const hero = anchor('hero')
  const corePos: [number, number, number] = wide ? [hero[0] + 0.4, hero[1] + 0.2, hero[2]] : [hero[0], hero[1] + 1.8, hero[2] - 3]

  return (
    <Canvas
      className="!fixed inset-0 z-0"
      style={{ position: 'fixed' }}
      aria-hidden="true"
      dpr={dpr}
      gl={{ antialias: !mobile, alpha: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: mobile ? 62 : 50, near: 0.1, far: 140, position: [0, 0.6, 9] }}
      frameloop={reduced ? 'demand' : 'always'}
      eventSource={document.getElementById('root')!}
      eventPrefix="client"
      onCreated={({ gl }) => {
        gl.setClearColor(config.colors.background)
        gl.domElement.addEventListener('webglcontextlost', () => useApp.getState().setWebgl('failed'))
      }}
    >
      <fog attach="fog" args={[config.colors.background, 14, 46]} />
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d * 0.75))} />
      <PaletteTicker />
      <CameraRig reduced={reduced} wide={wide} />
      <LatentDust count={mobile ? config.scene.particles.mobile : config.scene.particles.desktop} animate={animate} />
      <NeuralField count={mobile ? config.scene.neuralNodes.mobile : config.scene.neuralNodes.desktop} center={corePos} animate={animate} />
      <HeroCore position={corePos} animate={animate} />
      <FloatingShapes count={mobile ? 8 : 14} animate={animate} />
      <GridFloor />
      {!mobile && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
      <ReadySignal />
    </Canvas>
  )
}
