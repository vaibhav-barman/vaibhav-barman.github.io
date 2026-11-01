/**
 * The single terminal session shared by the on-page terminal and the overlay.
 * Bridges the pure CLI engine to the app (store, scroll, 3D scene, browser).
 */
import { config, type SectionId } from '../config'
import { portfolio } from '../data/portfolio'
import { scrollToSection } from '../hooks/useScrollTracker'
import { prefersReducedMotion } from '../hooks/useMedia'
import { useApp } from '../store/useApp'
import { registry } from './commands'
import { complete as engineComplete, execute } from './engine'
import { t } from './format'
import type { CliActions, CommandContext, Line } from './types'
import { VFS } from './vfs'

const fs = new VFS(portfolio)
/** Columns available in the most recently used terminal view. */
let columns = 80
/** Which view issued the current command. */
let origin: 'inline' | 'overlay' = 'overlay'

export function setColumns(n: number) {
  columns = n
}

export function promptFor(cwd: string): string {
  return config.terminal.prompt
    .replace('{user}', config.terminal.user ?? portfolio.handle)
    .replace('{host}', config.terminal.host)
    .replace('{cwd}', cwd)
}

const actions: CliActions = {
  setTheme: (theme) => useApp.getState().setTheme(theme),
  getTheme: () => useApp.getState().theme,
  set3D: (on) => useApp.getState().set3D(on),
  get3D: () => {
    const s = useApp.getState()
    return { enabled: s.threeD, available: s.webgl !== 'failed' }
  },
  goTo: (section: SectionId) => {
    // From the inline terminal, pop the overlay open first so the
    // conversation continues while the camera flies to the section.
    if (origin === 'inline') useApp.getState().setTerminalOpen(true)
    scrollToSection(section)
  },
  highlight: (h) => useApp.getState().setHighlight(h),
  focusProject: (slug) => useApp.getState().setFocusProject(slug),
  openUrl: (url) => {
    if (url.startsWith('mailto:')) window.location.href = url
    else window.open(url, '_blank', 'noopener,noreferrer')
  },
  download: (filename, content, mime = 'text/plain') => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  },
  clear: () => useApp.getState().clearTerm(),
  closeTerminal: () => useApp.getState().setTerminalOpen(false),
  isNarrow: () => columns < 72,
}

function context(): CommandContext {
  const s = useApp.getState()
  return {
    data: portfolio,
    fs,
    cwd: s.term.cwd,
    setCwd: (p) => useApp.getState().setCwd(p),
    history: s.term.history,
    actions,
    registry,
  }
}

export async function submit(input: string, from: 'inline' | 'overlay') {
  origin = from
  const s = useApp.getState()
  s.pushTerm({ kind: 'input', prompt: promptFor(s.term.cwd), text: input })
  if (!input.trim()) return
  s.pushHistory(input.trim())
  const out = await execute(input, context())
  if (out.length) useApp.getState().pushTerm({ kind: 'output', lines: out })
}

export function complete(input: string) {
  return engineComplete(input, context())
}

export function printOptions(options: string[]) {
  useApp.getState().pushTerm({ kind: 'output', lines: [[t(options.join('   '), 'muted')]] })
}

function fill(s: string) {
  return s
    .replace('{user}', portfolio.handle)
    .replace('{projects}', String(portfolio.projects.length))
    .replace('{skills}', String(portfolio.skills.length))
}

/** Boot animation (once per page load). */
export function boot() {
  const s = useApp.getState()
  if (s.term.booted) return
  s.markBooted()
  const bootLines: Line[] = config.terminal.bootText.map((l) => {
    const text = fill(l)
    const m = text.match(/^(\[ ?OK ?\])(.*)$/)
    return m ? [t(m[1], 'ok'), t(m[2], 'muted')] : [t(text, 'muted')]
  })
  const welcome: Line[] = [
    [''],
    [t(`Welcome to ${portfolio.name}'s portfolio shell.`, 'bold')],
    [t('Type ', 'muted'), { text: 'help', cmd: 'help', tone: 'accent' }, t(' to see commands, or try ', 'muted'), { text: 'neofetch', cmd: 'neofetch', tone: 'accent' }, t('.', 'muted')],
  ]
  const delay = prefersReducedMotion() ? 0 : config.terminal.bootLineDelay
  if (!delay) {
    useApp.getState().pushTerm({ kind: 'output', lines: [...bootLines, ...welcome] })
    return
  }
  bootLines.forEach((line, i) => setTimeout(() => useApp.getState().pushTerm({ kind: 'output', lines: [line] }), i * delay))
  setTimeout(() => useApp.getState().pushTerm({ kind: 'output', lines: welcome }), bootLines.length * delay + 120)
}
