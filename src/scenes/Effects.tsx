import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { config } from '../config'

/** Desktop-only post-processing: bloom for the neon glow + vignette. */
export default function Effects() {
  const { bloom, vignette } = config.scene
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={bloom.intensity} luminanceThreshold={bloom.threshold} luminanceSmoothing={bloom.smoothing} />
      <Vignette eskil={false} offset={vignette.offset} darkness={vignette.darkness} />
    </EffectComposer>
  )
}
