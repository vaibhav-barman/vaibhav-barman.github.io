import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { config } from '../config'
import { scrollState } from '../store/useApp'

/** Sections that span the full width get a centred camera; others shift the scene right of the text column. */
const FULL_WIDTH = new Set(['terminal'])

/**
 * Scroll-driven camera: travels between section anchors like a dolly
 * through latent space, with damped mouse parallax.
 */
export function CameraRig({ reduced, wide }: { reduced: boolean; wide: boolean }) {
  const camera = useThree((s) => s.camera)
  const stops = useMemo(
    () =>
      config.sections.map((s) => ({
        pos: new Vector3(...(config.scene.anchors[s.id] ?? [0, 0, 0])),
        shift: FULL_WIDTH.has(s.id) ? 0 : 1,
      })),
    [],
  )
  const offset = useMemo(() => new Vector3(...config.scene.cameraOffset), [])
  const tmp = useMemo(() => ({ pos: new Vector3(), look: new Vector3(), lookCur: new Vector3(0, 0, -10), first: true }), [])

  useFrame((_, dt) => {
    const i = Math.min(scrollState.index, stops.length - 1)
    const a = stops[i]
    const b = stops[Math.min(i + 1, stops.length - 1)]
    const raw = scrollState.t
    const k = raw * raw * (3 - 2 * raw) // smoothstep
    tmp.look.lerpVectors(a.pos, b.pos, k)
    const shift = (a.shift + (b.shift - a.shift) * k) * (wide ? 2.7 : 0)
    tmp.look.x -= shift
    tmp.pos.copy(tmp.look).add(offset)

    if (!reduced) {
      tmp.pos.x += scrollState.pointer.x * config.scene.parallax
      tmp.pos.y += scrollState.pointer.y * config.scene.parallax * 0.6
    }

    if (reduced || tmp.first) {
      camera.position.copy(tmp.pos)
      tmp.lookCur.copy(tmp.look)
      tmp.first = false
    } else {
      const d = Math.min(dt, 0.05)
      easing.damp3(camera.position, tmp.pos, config.scene.cameraDamping, d)
      easing.damp3(tmp.lookCur, tmp.look, config.scene.cameraDamping * 0.8, d)
    }
    camera.lookAt(tmp.lookCur)
  })
  return null
}
