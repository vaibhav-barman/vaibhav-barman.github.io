import { portfolio as d } from '../../data/portfolio'
import { Section, Tag } from '../ui'

const KIND_LABEL = { work: 'experience', volunteer: 'volunteer', education: 'education' } as const

export function Journey() {
  const hasWork = d.timeline.some((t) => t.kind !== 'education')
  return (
    <Section id="journey">
      <ol className="relative space-y-6 border-l border-accent/25 pl-6">
        {d.timeline.map((t, i) => (
          <li key={`${t.org}-${i}`} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-2 -left-[31px] h-3 w-3 rounded-full border-2 border-accent bg-bg shadow-[0_0_14px_var(--accent)]"
            />
            <div className="glass rounded-xl p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="accent2">{KIND_LABEL[t.kind]}</Tag>
                {t.when && <span className="font-mono text-xs text-muted">{t.when}</span>}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-ink">{t.title}</h3>
              <p className="text-sm text-ink/80">
                {t.url ? (
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    {t.org}
                  </a>
                ) : (
                  t.org
                )}
                {t.location && <span className="text-muted"> · {t.location}</span>}
              </p>
              {t.summary && <p className="mt-2 text-sm text-muted">{t.summary}</p>}
              {t.details.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {t.details.map((x) => (
                    <li key={x}>▹ {x}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
        <li className="relative">
          <span
            aria-hidden="true"
            className="absolute top-2 -left-[31px] h-3 w-3 animate-pulse rounded-full bg-hot shadow-[0_0_16px_var(--hot)] motion-reduce:animate-none"
          />
          <div className="rounded-xl border border-dashed border-hot/40 p-5">
            <p className="font-mono text-xs text-hot">next →</p>
            <p className="mt-1 text-ink">
              {hasWork ? 'The next chapter' : 'First role'}: <span className="text-accent">{d.status}</span>.
            </p>
          </div>
        </li>
      </ol>
    </Section>
  )
}
