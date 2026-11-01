import { useEffect, useRef } from 'react'
import { portfolio as d } from '../data/portfolio'
import { useApp } from '../store/useApp'
import { Tag } from './ui'

/** Accessible project detail panel (native <dialog>: focus trap + Esc for free). */
export function ProjectDialog() {
  const slug = useApp((s) => s.detailProject)
  const close = useApp((s) => s.setDetailProject)
  const ref = useRef<HTMLDialogElement>(null)
  const project = d.projects.find((p) => p.slug === slug)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (project && !el.open) el.showModal()
    if (!project && el.open) el.close()
  }, [project])

  return (
    <dialog
      ref={ref}
      aria-labelledby="project-dialog-title"
      onClose={() => close(null)}
      onClick={(e) => {
        if (e.target === ref.current) close(null)
      }}
      className="glass m-auto w-[min(640px,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto rounded-2xl p-0 text-ink thin-scroll"
    >
      {project && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-accent">
                ~/projects/{project.slug}.md · {String(project.index).padStart(2, '0')}
              </p>
              <h2 id="project-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight">
                {project.title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Tag tone="accent2">{project.categoryLabel}</Tag>
                {project.featured && <Tag>★ featured</Tag>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => close(null)}
              className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-sm text-muted hover:text-ink"
              aria-label="Close project details"
            >
              esc
            </button>
          </div>

          <p className="mt-5 leading-relaxed text-ink/85">{project.summary}</p>

          {project.highlights.length > 0 && (
            <ul className="mt-5 space-y-2">
              {project.highlights.map((h) => (
                <li key={h} className="flex gap-3 text-sm leading-relaxed text-ink/80">
                  <span aria-hidden="true" className="text-accent">
                    ▹
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          )}

          {project.images.map((img) => (
            <figure key={img.src} className="mt-5">
              <img src={img.src} alt={img.caption ?? project.title} loading="lazy" className="rounded-lg border border-white/10" />
              {img.caption && <figcaption className="mt-2 font-mono text-xs text-muted">{img.caption}</figcaption>}
            </figure>
          ))}

          {project.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {project.tags.map((t) => (
                <Tag key={t} tone="muted">
                  {t}
                </Tag>
              ))}
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-accent px-4 py-2.5 font-mono text-sm font-semibold text-bg"
              >
                GitHub ↗<span className="sr-only"> (opens in new tab)</span>
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-accent/40 px-4 py-2.5 font-mono text-sm text-accent"
              >
                Live demo ↗<span className="sr-only"> (opens in new tab)</span>
              </a>
            )}
          </div>
          <p className="mt-6 font-mono text-[11px] text-muted">
            tip: <span className="text-ink/80">open {project.slug} --repo</span> in the terminal
          </p>
        </div>
      )}
    </dialog>
  )
}
