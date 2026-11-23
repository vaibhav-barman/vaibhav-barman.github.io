/**
 * The studio environment that makes the chrome look like liquid metal: a black
 * room with white softbox strips (ported from docs/index.html in the profile
 * README repo). Chrome has no colour of its own; it only shows what it
 * reflects, so this map IS the look. Not RoomEnvironment: that one is grey and
 * flat. Built once through PMREM, then the generator and the throwaway scene
 * are disposed (the reference leaked them).
 */
import { BackSide, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, SphereGeometry } from 'three'

/**
 * The room: black at the horizon, easing to light grey toward the ceiling and the
 * floor. That is the same vertical gradient as the profile README's chrome ball
 * (light sky, dark horizon, light ground); with a flat black room the middle of the
 * sphere mirrors nothing and reads as dark glass instead of silver.
 */
function roomGeometry() {
  const g = new SphereGeometry(20, 32, 24)
  const pos = g.attributes.position
  const horizon = new Color(0x050505)
  const sky = new Color(0x9a9a9a)
  const ground = new Color(0xb4b4b4)
  const c = new Color()
  const colors = new Float32Array(pos.count * 3)
  const ease = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 20
    c.copy(horizon).lerp(y >= 0 ? sky : ground, ease(0.08, 0.8, Math.abs(y)))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

export function studioEnvironment(renderer) {
  const env = new Scene()
  env.add(new Mesh(roomGeometry(), new MeshBasicMaterial({ vertexColors: true, side: BackSide })))
  const white = new MeshBasicMaterial({ color: 0xffffff, side: DoubleSide })
  const grey = new MeshBasicMaterial({ color: 0x777777, side: DoubleSide })
  const sky = new MeshBasicMaterial({ color: 0x8a8a8a, side: DoubleSide })
  const box = (w, h, x, y, z, m = white) => {
    const q = new Mesh(new PlaneGeometry(w, h), m)
    q.position.set(x, y, z)
    q.lookAt(0, 0, 0)
    env.add(q)
  }
  const top = new Mesh(new CircleGeometry(14, 48), sky)
  top.position.y = 12
  top.rotation.x = Math.PI / 2
  env.add(top)
  box(14, 2.2, 0, 9, 4) // overhead strip
  box(3, 14, -9, 1, 2) // left vertical
  box(1.2, 10, 9, 0, -3) // right rim
  box(30, 14, 0, -11, 0, grey) // floor bounce
  box(4, 4, 4, 5, 8) // key
  box(1, 6, -3, 2, -10) // back kicker

  const pmrem = new PMREMGenerator(renderer)
  const target = pmrem.fromScene(env, 0.02)
  pmrem.dispose()
  env.traverse((o) => {
    o.geometry?.dispose()
    o.material?.dispose()
  })
  return { texture: target.texture, dispose: () => target.dispose() }
}
