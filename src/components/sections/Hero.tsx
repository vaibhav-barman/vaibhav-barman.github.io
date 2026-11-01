import { m } from 'framer-motion'
import { portfolio as d } from '../../data/portfolio'
import { useApp } from '../../store/useApp'
import { scrollToSection } from '../../hooks/useScrollTracker'
import { Kbd } from '../ui'
import { config } from '../../config'

export function Hero() {
  const openTerminal = useApp((s) => s.setTerminalOpen)
  const [primaryRole, ...rest] = d.role.split('|').map((s) => s.trim())

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative z-10 flex min-h-[100svh] flex-col justify-center px-4 pt-24 pb-16 sm:px-8 lg:px-16"
    >
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        className="max-w-3xl"
      >
        <p className="font-mono text-xs text-accent sm:text-sm">
          <span aria-hidden="true">&gt; </span>
          {d.handle}@{config.terminal.host} <span className="text-muted">·</span>{' '}
          <span className="text-ink/80">{d.location}</span>
        </p>
        <h1 id="hero-title" className="mt-5 text-5xl leading-[0.95] font-bold tracking-tight text-ink sm:text-7xl lg:text-8xl">
          {d.firstName}
          <br />
          <span className="glow-text bg-gradient-to-r from-accent via-accent to-accent2 bg-clip-text text-transparent">
            {d.name.slice(d.firstName.length).trim()}
          </span>
        </h1>
        <p className="mt-6 font-mono text-sm text-accent sm:text-base">
          {primaryRole}
          {rest.length > 0 && <span className="text-muted"> · {rest.join(' · ')}</span>}
        </p>
        <p className="mt-4 max-w-xl text-lg text-ink/80 sm:text-xl">{d.tagline}</p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openTerminal(true)}
            className="group inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-mono text-sm font-semibold text-bg shadow-[0_0_30px_-6px_var(--accent)] transition hover:brightness-110"
          >
            <span aria-hidden="true">&gt;_</span> Open terminal
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('projects')}
            className="glass inline-flex items-center gap-2 rounded-lg px-5 py-3 font-mono text-sm text-ink transition hover:border-accent/50"
          >
            Explore projects <span aria-hidden="true">↓</span>
          </button>
          <a
            href="/resume.html"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-3 font-mono text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
          >
            resume ↗
          </a>
        </div>
        <p className="mt-8 hidden font-mono text-xs text-muted sm:block">
          press <Kbd>{config.terminal.toggleKey}</Kbd> anywhere to toggle the terminal
        </p>
      </m.div>

      <div aria-hidden="true" className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-muted uppercase sm:flex">
        scroll · enter latent space
        <span className="h-8 w-px bg-gradient-to-b from-accent to-transparent" />
      </div>
    </section>
  )
}
