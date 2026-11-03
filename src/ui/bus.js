/**
 * A tiny event bus so the terminal, the page and the 3D scene can talk
 * without importing each other.
 *   bus.on('accent', (color) => ...)      bus.emit('accent', '#3b82f6')
 * Events: 'accent', 'focus-project', 'highlight', 'hover-skill', '3d'
 */
const target = new EventTarget()

export const bus = {
  on(name, fn) {
    const handler = (e) => fn(e.detail)
    target.addEventListener(name, handler)
    return () => target.removeEventListener(name, handler)
  },
  emit(name, detail) {
    target.dispatchEvent(new CustomEvent(name, { detail }))
  },
}

/** Shared runtime state (read by the scene every frame). */
export const state = {
  accent: null,
  threeD: { enabled: true, available: false },
  reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
}
