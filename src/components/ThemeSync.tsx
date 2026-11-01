import { useEffect } from 'react'
import { config } from '../config'
import { useApp } from '../store/useApp'

/** Mirrors the active theme into CSS custom properties used by the UI. */
export function ThemeSync() {
  const theme = useApp((s) => s.theme)
  useEffect(() => {
    const p = config.themes[theme]
    const root = document.documentElement.style
    root.setProperty('--accent', p.accent)
    root.setProperty('--accent2', p.accent2)
    root.setProperty('--hot', p.hot)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.colors.background)
  }, [theme])
  return null
}
