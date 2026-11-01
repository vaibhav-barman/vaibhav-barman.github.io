import type { ThreeEvent } from '@react-three/fiber'

/**
 * The canvas sits behind the HTML page and receives events via the #root
 * event source. Only react when the pointer is over "empty" page area
 * (section backgrounds), never when it's over text, buttons or panels.
 */
export function allowSceneEvent(e: ThreeEvent<PointerEvent | MouseEvent>): boolean {
  const target = e.nativeEvent.target as HTMLElement | null
  if (!target) return false
  return target.tagName === 'SECTION' || target.tagName === 'MAIN' || target.tagName === 'CANVAS' || target.dataset.sceneHole === 'true'
}
