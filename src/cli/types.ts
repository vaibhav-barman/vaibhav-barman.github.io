import type { Portfolio } from '../data/portfolio'
import type { ThemeName, SectionId } from '../config'
import type { VFS } from './vfs'

export type Tone = 'accent' | 'accent2' | 'hot' | 'muted' | 'error' | 'ok' | 'bold' | 'dim'

/** A piece of output text. Plain strings render as-is (whitespace preserved). */
export type Span =
  | string
  | {
      text: string
      tone?: Tone
      /** Renders as a link (opens in a new tab unless mailto:). */
      href?: string
      /** Renders as a button that runs this command when clicked. */
      cmd?: string
    }

/** One output line. */
export type Line = Span[]

export type Highlight =
  | { kind: 'skills'; group?: string }
  | { kind: 'projects'; slug?: string }
  | { kind: 'journey' }
  | null

/** Side effects a command may trigger. Implemented by the app, faked in tests. */
export interface CliActions {
  setTheme(theme: ThemeName): void
  getTheme(): ThemeName
  set3D(on: boolean): void
  get3D(): { enabled: boolean; available: boolean }
  goTo(section: SectionId): void
  highlight(h: Highlight): void
  focusProject(slug: string | null): void
  openUrl(url: string): void
  download(filename: string, content: string, mime?: string): void
  clear(): void
  closeTerminal(): void
  isNarrow(): boolean
}

export interface CommandContext {
  data: Portfolio
  fs: VFS
  cwd: string
  setCwd(path: string): void
  history: readonly string[]
  actions: CliActions
  registry: Registry
}

export interface Command {
  name: string
  aliases?: string[]
  /** One line shown by `help`. */
  summary: string
  usage?: string
  /** Hidden from `help` (easter eggs). */
  hidden?: boolean
  group?: 'info' | 'navigate' | 'system' | 'fun'
  run(args: string[], ctx: CommandContext): Line[] | void | Promise<Line[] | void>
  /** Suggestions for the argument currently being typed (args[args.length-1]). */
  complete?(args: string[], ctx: CommandContext): string[]
}

export interface Registry {
  list(): Command[]
  get(name: string): Command | undefined
  names(): string[]
}
