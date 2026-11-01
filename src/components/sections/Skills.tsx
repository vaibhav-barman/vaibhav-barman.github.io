import { portfolio as d } from '../../data/portfolio'
import { useApp } from '../../store/useApp'
import { Section, Tag } from '../ui'

export function Skills() {
  const hover = useApp((s) => s.hoverSkill)
  const setHover = useApp((s) => s.setHoverSkill)

  return (
    <Section id="skills">
      <div className="space-y-6">
        {d.skillGroups.map((g) => (
          <div key={g.slug} className="glass rounded-2xl p-5 sm:p-6">
            <h3 className="font-mono text-sm text-[color-mix(in_oklab,var(--accent2)_55%,white)]">{g.name}</h3>
            <ul className="mt-4 space-y-3">
              {g.skills.map((s) => (
                <li
                  key={s.slug}
                  onMouseEnter={() => setHover(s.slug)}
                  onMouseLeave={() => setHover(null)}
                  className={`rounded-lg px-2 py-1 transition ${hover === s.slug ? 'bg-accent/10' : ''}`}
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink">{s.name}</span>
                    <span className="font-mono text-xs text-muted">{s.level}%</span>
                  </div>
                  <div
                    className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5"
                    role="meter"
                    aria-label={`${s.name} proficiency`}
                    aria-valuenow={s.level}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent2 to-accent shadow-[0_0_12px_var(--accent)]"
                      style={{ width: `${s.level}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {d.techTags.length > 0 && (
        <div className="mt-8">
          <h3 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">Also in my projects</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.techTags.map((t) => (
              <Tag key={t} tone="muted">
                {t}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}
