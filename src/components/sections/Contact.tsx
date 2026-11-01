import { portfolio as d } from '../../data/portfolio'
import { Section, SocialIcon } from '../ui'
import { AskPortfolio } from '../AskPortfolio'

export function Contact() {
  return (
    <Section id="contact">
      <p className="max-w-lg text-lg text-ink/80">
        Currently <span className="text-accent">{d.status}</span>. The fastest way to reach me:
      </p>
      {d.email && (
        <a
          href={`mailto:${d.email}`}
          className="glow-text mt-6 inline-block font-mono text-xl break-all text-accent underline-offset-8 hover:underline sm:text-2xl"
        >
          {d.email}
        </a>
      )}
      <ul className="mt-8 flex flex-wrap gap-3">
        {d.socials.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="me noopener noreferrer"
              className="glass inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-sm text-ink/90 transition hover:border-accent/40 hover:text-accent"
            >
              <SocialIcon social={s} />
              {s.label}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <a
            href="/resume.html"
            className="glass inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-sm text-ink/90 transition hover:border-accent/40 hover:text-accent"
          >
            <span aria-hidden="true">⤓</span> Resume
          </a>
        </li>
      </ul>
      <AskPortfolio />
    </Section>
  )
}
