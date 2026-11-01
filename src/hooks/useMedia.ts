import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
/** Phones / small tablets: lighter 3D scene, no post-processing. */
export const useIsMobile = () => useMediaQuery('(max-width: 767px), (pointer: coarse)')
export const useFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)')

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isNarrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
