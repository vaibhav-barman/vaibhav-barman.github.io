import { portfolio as d } from '../../data/portfolio'
import { useApp } from '../../store/useApp'
import { Section, Tag } from '../ui'

export function Projects() {
  const focus = useApp((s) => s.focusProject)
  const setFocus = useApp((s) => s.setFocusProject)
  const openDetail = useApp((s) => s.setDetailProject)

  return (
    <Section id="projects" eyebrow={`~/projects · ${d.projects.length} entries`}>
      <p className="mb-6 max-w-lg text-muted">
        Agentic and AI-first work leads. Select a project here or a card in the scene for details.
      </p>
      <ol className="space-y-2">
        {d.projects.map((p) => {
          const active = focus === p.slug
          return (
            <li key={p.slug}>
              <button
                type="button"
                onClick={() => openDetail(p.slug)}
                onMouseEnter={() => setFocus(p.slug)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(p.slug)}
                onBlur={() => setFocus(null)}
                aria-haspopup="dialog"
                className={`group glass flex w-full items-start gap-4 rounded-xl px-4 py-4 text-left transition sm:px-5 ${
                  active ? 'border-accent/50 shadow-[0_0_40px_-12px_var(--accent)]' : 'hover:border-accent/30'
                }`}
              >
                <span className="pt-0.5 font-mono text-xs text-accent">{String(p.index).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{p.title}</span>
                    {p.featured && (
                      <span className="font-mono text-[10px] text-hot" aria-label="featured">
                        ★
                      </span>
                    )}
                    <Tag tone="accent2">{p.categoryLabel}</Tag>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted">{p.summary}</span>
                  {p.tags.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 5).map((t) => (
                        <Tag key={t} tone="muted">
                          {t}
                        </Tag>
                      ))}
                    </span>
                  )}
                </span>
                <span aria-hidden="true" className="pt-0.5 font-mono text-muted transition group-hover:translate-x-0.5 group-hover:text-accent">
                  →
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}
