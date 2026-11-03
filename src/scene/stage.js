/**
 * Keeps a 3D object framed inside a DOM element (a `.stage` figure), so the
 * object scrolls with the page while the camera travels on its own path.
 */
import { MathUtils, Vector3 } from 'three'

const tmp = new Vector3()

/**
 * Places `obj` in front of the camera at `distance`, centred on `el`'s screen
 * position, and scales it so `fitHeight` world units fill the element.
 * Returns false (and hides the object) when the element is off screen.
 */
export function placeInStage(obj, el, camera, { distance = 8, fitHeight = 1, fitWidth = Infinity } = {}) {
  const r = el.getBoundingClientRect()
  const vh = innerHeight
  const vw = innerWidth
  const visible = r.bottom > -vh * 0.25 && r.top < vh * 1.25 && r.width > 0
  obj.visible = visible
  if (!visible) return false
  const halfH = Math.tan(MathUtils.degToRad(camera.fov / 2)) * distance
  const halfW = halfH * camera.aspect
  const nx = ((r.left + r.width / 2) / vw) * 2 - 1
  const ny = -(((r.top + r.height / 2) / vh) * 2 - 1)
  tmp.set(nx * halfW, ny * halfH, -distance).applyMatrix4(camera.matrixWorld)
  obj.position.copy(tmp)
  obj.quaternion.copy(camera.quaternion)
  const worldH = (r.height / vh) * 2 * halfH
  const worldW = (r.width / vw) * 2 * halfW
  obj.userData.stageSize = { w: worldW, h: worldH }
  obj.scale.setScalar(Math.min(worldH / fitHeight, worldW / fitWidth))
  return true
}
