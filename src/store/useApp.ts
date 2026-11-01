import { create } from 'zustand'
import { config, type SectionId, type ThemeName } from '../config'
import type { Highlight, Line } from '../cli/types'

export type TermEntry =
  | { id: number; kind: 'input'; prompt: string; text: string }
  | { id: number; kind: 'output'; lines: Line[] }

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: preference just won't persist */
  }
}

interface AppState {
  theme: ThemeName
  /** User preference for the 3D scene. */
  threeD: boolean
  /** Whether WebGL works on this device ('unknown' until checked). */
  webgl: 'unknown' | 'ok' | 'failed'
  sceneReady: boolean
  activeSection: SectionId
  progress: number
  highlight: Highlight
  highlightAt: number
  /** Project emphasised in the 3D carousel (CLI `open`, hover). */
  focusProject: string | null
  /** Project whose detail dialog is open. */
  detailProject: string | null
  hoverSkill: string | null
  terminalOpen: boolean
  term: { entries: TermEntry[]; history: string[]; cwd: string; booted: boolean; nextId: number }

  setTheme(t: ThemeName): void
  set3D(on: boolean): void
  setWebgl(v: 'ok' | 'failed'): void
  setSceneReady(): void
  setSection(s: SectionId): void
  setProgress(p: number): void
  setHighlight(h: Highlight): void
  setFocusProject(slug: string | null): void
  setDetailProject(slug: string | null): void
  setHoverSkill(slug: string | null): void
  setTerminalOpen(open: boolean): void
  pushTerm(entry: { kind: 'input'; prompt: string; text: string } | { kind: 'output'; lines: Line[] }): void
  clearTerm(): void
  pushHistory(cmd: string): void
  setCwd(cwd: string): void
  markBooted(): void
}

export const useApp = create<AppState>((set) => ({
  theme: readPref<ThemeName>('theme', Object.keys(config.themes) as ThemeName[], config.defaultTheme),
  threeD: readPref('3d', ['on', 'off'], 'on') === 'on',
  webgl: 'unknown',
  sceneReady: false,
  activeSection: 'hero',
  progress: 0,
  highlight: null,
  highlightAt: 0,
  focusProject: null,
  detailProject: null,
  hoverSkill: null,
  terminalOpen: false,
  term: { entries: [], history: [], cwd: '~', booted: false, nextId: 1 },

  setTheme: (theme) => {
    writePref('theme', theme)
    set({ theme })
  },
  set3D: (threeD) => {
    writePref('3d', threeD ? 'on' : 'off')
    set({ threeD })
  },
  setWebgl: (webgl) => set({ webgl }),
  setSceneReady: () => set({ sceneReady: true }),
  setSection: (activeSection) => set((s) => (s.activeSection === activeSection ? s : { activeSection })),
  setProgress: (progress) => set((s) => (Math.abs(s.progress - progress) < 0.002 ? s : { progress })),
  setHighlight: (highlight) => set({ highlight, highlightAt: performance.now() }),
  setFocusProject: (focusProject) => set({ focusProject }),
  setDetailProject: (detailProject) => set({ detailProject }),
  setHoverSkill: (hoverSkill) => set({ hoverSkill }),
  setTerminalOpen: (terminalOpen) => set({ terminalOpen }),
  pushTerm: (entry) =>
    set((s) => ({
      term: { ...s.term, nextId: s.term.nextId + 1, entries: [...s.term.entries, { ...entry, id: s.term.nextId } as TermEntry].slice(-400) },
    })),
  clearTerm: () => set((s) => ({ term: { ...s.term, entries: [] } })),
  pushHistory: (cmd) =>
    set((s) => {
      const h = s.term.history
      if (!cmd.trim() || h[h.length - 1] === cmd) return s
      return { term: { ...s.term, history: [...h, cmd].slice(-config.terminal.maxHistory) } }
    }),
  setCwd: (cwd) => set((s) => ({ term: { ...s.term, cwd } })),
  markBooted: () => set((s) => ({ term: { ...s.term, booted: true } })),
}))

/**
 * Scroll state read every frame by the camera. Kept outside React state so
 * scrolling never triggers re-renders.
 */
export const scrollState = {
  /** Index of the section whose centre is at/above the viewport centre. */
  index: 0,
  /** 0..1 progress from section `index` centre to the next one. */
  t: 0,
  /** Pointer in normalised device coords (-1..1). */
  pointer: { x: 0, y: 0 },
}
