import { Color } from 'three'
import { config } from '../config'
import { useApp } from '../store/useApp'

/**
 * Shared, mutable colours for every 3D material. Shader uniforms reference
 * these objects directly; `tickPalette` eases them toward the active theme so
 * `theme <name>` crossfades the whole scene.
 */
export const palette = {
  accent: new Color(config.themes[config.defaultTheme].accent),
  accent2: new Color(config.themes[config.defaultTheme].accent2),
  hot: new Color(config.themes[config.defaultTheme].hot),
}

const target = { accent: new Color(), accent2: new Color(), hot: new Color() }

export function initPalette() {
  const p = config.themes[useApp.getState().theme]
  palette.accent.set(p.accent)
  palette.accent2.set(p.accent2)
  palette.hot.set(p.hot)
}

export function tickPalette(dt: number) {
  const p = config.themes[useApp.getState().theme]
  target.accent.set(p.accent)
  target.accent2.set(p.accent2)
  target.hot.set(p.hot)
  const k = 1 - Math.exp(-dt * 4)
  palette.accent.lerp(target.accent, k)
  palette.accent2.lerp(target.accent2, k)
  palette.hot.lerp(target.hot, k)
}

/** Deterministic PRNG so the scene looks the same on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Anchor (world position) of a section. */
export function anchor(id: string): [number, number, number] {
  return config.scene.anchors[id] ?? [0, 0, 0]
}

/** Fixed DOM layer for drei <Html> labels (the default target, #root, scrolls with the page). */
export const labelPortal: { current: HTMLElement } = { current: null as unknown as HTMLElement }
