import { config } from '../config'
import { portfolio as d } from '../data/portfolio'
import { scrollToSection } from '../hooks/useScrollTracker'
import { useApp } from '../store/useApp'

/** Fixed heads-up display: section, scroll progress, availability, nav, terminal toggle. */
export function Hud() {
  const section = useApp((s) => s.activeSection)
  const progress = useApp((s) => s.progress)
  const terminalOpen = useApp((s) => s.terminalOpen)
  const setTerminalOpen = useApp((s) => s.setTerminalOpen)
  const label = config.sections.find((s) => s.id === section)?.label ?? section

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <a
        href="#main"
        className="pointer-events-auto absolute top-2 left-2 -translate-y-20 rounded-md bg-accent px-3 py-2 font-mono text-sm text-bg focus:translate-y-0"
      >
        Skip to content
      </a>
      <div className="h-px w-full bg-white/5">
        <div className="h-px origin-left bg-accent shadow-[0_0_10px_var(--accent)]" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="flex items-center gap-3 px-3 py-3 font-mono text-[11px] sm:px-6 sm:text-xs">
        <button
          type="button"
          onClick={() => scrollToSection('hero')}
          className="pointer-events-auto rounded-md px-1.5 py-1 font-semibold tracking-wider text-ink"
          aria-label={`${d.name}: back to top`}
        >
          {d.handle}
          <span className="text-accent">.</span>
          <span className="text-muted">sh</span>
        </button>

        <span className="hidden text-muted sm:inline" aria-hidden="true">
          │
        </span>
        <span className="hidden items-center gap-1.5 text-muted sm:flex" aria-live="polite">
          <span className="text-accent">◉</span> section: <span className="text-ink">{label}</span>
          <span className="ml-2 tabular-nums">{String(Math.round(progress * 100)).padStart(3, '0')}%</span>
        </span>

        <nav aria-label="Sections" className="pointer-events-auto ml-auto hidden lg:block">
          <ul className="flex gap-1">
            {config.sections.slice(1).map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToSection(s.id)
                    history.replaceState(null, '', `#${s.id}`)
                  }}
                  aria-current={section === s.id ? 'location' : undefined}
                  className={`rounded-md px-2.5 py-1.5 transition ${section === s.id ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink'}`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <span className="ml-auto hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-muted md:flex lg:ml-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5cf2a6] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5cf2a6]" />
          </span>
          status: <span className="text-ink">{d.status}</span>
        </span>

        <button
          type="button"
          onClick={() => setTerminalOpen(!terminalOpen)}
          aria-pressed={terminalOpen}
          className="pointer-events-auto ml-auto rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-accent transition hover:bg-accent/20 md:ml-2"
        >
          <span aria-hidden="true">&gt;_ </span>Terminal <span className="hidden text-muted sm:inline">[{config.terminal.toggleKey}]</span>
        </button>
      </div>
    </header>
  )
}
