import { portfolio as d } from '../../data/portfolio'
import { Section, Tag } from '../ui'

export function About() {
  const edu = d.timeline.find((t) => t.kind === 'education')
  const facts = [
    d.location && { k: 'location', v: d.location },
    edu && { k: 'studying', v: `${edu.title} · ${edu.org}` },
    d.languages.length > 0 && { k: 'speaks', v: d.languages.map((l) => l.language).join(', ') },
    { k: 'status', v: d.status },
  ].filter(Boolean) as { k: string; v: string }[]

  return (
    <Section id="about">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-5">
          {d.image && (
            <img
              src={`/${d.image}`}
              alt={`Portrait of ${d.name}`}
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              className="h-16 w-16 shrink-0 rounded-xl border border-accent/30 object-cover sm:h-[72px] sm:w-[72px]"
            />
          )}
          <p className="text-base leading-relaxed text-ink/85 sm:text-lg">{d.summary}</p>
        </div>
        <dl className="mt-6 grid gap-x-6 gap-y-3 border-t border-white/5 pt-6 font-mono text-sm sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.k} className="flex gap-3">
              <dt className="w-20 shrink-0 text-muted">{f.k}</dt>
              <dd className="text-ink/90">{f.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {d.interests.length > 0 && (
        <div className="mt-10">
          <h3 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">Off-screen</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {d.interests.map((i) => (
              <li key={i.name} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="font-medium text-ink">{i.name}</p>
                {i.summary && <p className="mt-1 text-sm leading-relaxed text-muted">{i.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.achievements.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {d.achievements.map((a) => (
            <Tag key={a.title} tone="accent2">
              ◆ {a.title}
            </Tag>
          ))}
        </div>
      )}
    </Section>
  )
}
