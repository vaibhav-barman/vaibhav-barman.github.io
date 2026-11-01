import type { ReactNode } from 'react'
import { config, type SectionId } from '../config'
import type { Social } from '../data/portfolio'

export function Section({
  id,
  eyebrow,
  children,
  className = '',
  wide = false,
}: {
  id: SectionId
  /** Overrides config.sections[].eyebrow */
  eyebrow?: string
  children: ReactNode
  className?: string
  /** Wide sections use the full width; others keep a left column so the 3D shows on the right. */
  wide?: boolean
}) {
  const meta = config.sections.find((s) => s.id === id)!
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`relative z-10 scroll-mt-16 px-4 py-24 sm:px-8 md:py-32 lg:px-16 ${className}`}
    >
      <div className={wide ? 'mx-auto max-w-6xl' : 'max-w-xl xl:max-w-2xl'}>
        <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
          <span aria-hidden="true">// </span>
          {eyebrow ?? meta.eyebrow}
        </p>
        <h2 id={`${id}-title`} className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {meta.title}
        </h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  )
}

export function Tag({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'accent2' | 'muted' }) {
  const cls =
    tone === 'accent'
      ? 'border-accent/30 text-accent bg-accent/5'
      : tone === 'accent2'
        ? 'border-accent2/40 text-[color-mix(in_oklab,var(--accent2)_55%,white)] bg-accent2/10'
        : 'border-white/10 text-muted bg-white/5'
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] ${cls}`}>{children}</span>
}

export function SocialIcon({ social }: { social: Social }) {
  if (!social.icon) return <span aria-hidden="true">↗</span>
  return <span aria-hidden="true" className="mask-icon" style={{ ['--icon' as string]: `url(/${social.icon.replace(/^\//, '')})` }} />
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-ink/90">{children}</kbd>
  )
}
