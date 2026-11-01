import { config } from '../config'
import { portfolio as d } from '../data/portfolio'
import { useApp } from '../store/useApp'
import { Kbd } from './ui'

export function Footer() {
  const threeD = useApp((s) => s.threeD)
  const webgl = useApp((s) => s.webgl)
  const set3D = useApp((s) => s.set3D)
  return (
    <footer className="relative z-10 border-t border-white/5 px-4 py-10 font-mono text-xs text-muted sm:px-8 lg:px-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p>
          © {new Date().getFullYear()} {d.name} · built from <span className="text-ink/80">portfolio.json</span>
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <span>
            terminal <Kbd>{config.terminal.toggleKey}</Kbd>
          </span>
          {webgl !== 'failed' && (
            <button type="button" onClick={() => set3D(!threeD)} aria-pressed={threeD} className="underline-offset-4 hover:text-ink hover:underline">
              3D: {threeD ? 'on' : 'off'}
            </button>
          )}
          <a href="/resume.html" className="underline-offset-4 hover:text-ink hover:underline">
            resume
          </a>
        </div>
      </div>
    </footer>
  )
}
