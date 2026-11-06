/**
 * The whole page, rendered to HTML at build time from portfolio.json.
 * These functions are the "components": edit the markup here, edit the
 * words in portfolio.json. JavaScript only adds the terminal and 3D scene.
 */
import { config } from '../config.js'
import { whoami } from '../cli/commands/info.js'
import { inputLineHtml, linesHtml, promptText } from '../cli/render.js'
import { esc, html, pad2 } from './util.js'

const section = (id) => config.sections.find((s) => s.id === id)

/** Optional sections (like notes) only appear when they have content. */
export function visibleSections(d) {
  return config.sections.filter((s) => !s.optional || (s.id === 'notes' && d.notes?.length))
}

function sectionHead(id, eyebrow) {
  const s = section(id)
  return `<p class="eyebrow"><span aria-hidden="true">// </span>${esc(eyebrow ?? s.eyebrow)}</p>
      <h2 id="${id}-title" class="section-title">${esc(s.title)}</h2>`
}

const external = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '')
/** Local images in public/ are referenced from the site root; full URLs pass through. */
export const assetUrl = (src) => (/^https?:/.test(src) ? src : `/${String(src).replace(/^\/+/, '')}`)

export function nav(d, { home = '' } = {}) {
  const links = visibleSections(d)
    .slice(1)
    .map((s) => `<li><a href="${home}#${s.id}" data-nav="${s.id}">${esc(s.label)}</a></li>`)
    .join('')
  return `<header class="nav" id="nav">
    <div class="nav-inner">
      <a class="brand" href="${home || ''}#hero"><span class="brand-mark" aria-hidden="true">&gt;_</span><span class="brand-name">${esc(d.handle)}<span class="accent">.</span>sh</span><span class="sr-only">, ${esc(d.name)}, back to top</span></a>
      <nav class="nav-links" aria-label="Sections"><ul>${links}</ul></nav>
      <a class="btn btn-primary nav-cta" href="${home}${esc(config.nav.cta.href)}">${esc(config.nav.cta.label)}</a>
      <details class="nav-menu">
        <summary><span class="sr-only">Open section menu</span><span class="burger" aria-hidden="true"></span></summary>
        <nav aria-label="Sections (menu)"><ul>${links}</ul></nav>
      </details>
    </div>
  </header>`
}

function terminalWindow(d) {
  // Prerendered so the window is never empty, even without JavaScript.
  // src/ui/terminal.js replaces it with the live, interactive shell.
  const noop = () => {}
  // Without JS the command links can't run, so show them as plain accent text.
  const out = whoami
    .run([], { data: d, actions: { goTo: noop } })
    .map((line) => line.map((sp) => (typeof sp === 'object' && sp.cmd ? { text: sp.text, tone: 'accent' } : sp)))
  const title = promptText('~', d.handle).replace(/\$$/, '')
  return `<div class="term" id="terminal" role="region" aria-label="Interactive terminal">
        <div class="term-bar">
          <span class="term-lights" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="term-title" id="term-title">${esc(title)}</span>
          <kbd class="term-key" title="Press ${esc(config.terminal.focusKey)} to focus the terminal">${esc(config.terminal.focusKey)}</kbd>
        </div>
        <div class="term-body" id="term-body">
          <div class="term-static">
            ${inputLineHtml('~', d.handle, config.terminal.autoRun)}
            ${linesHtml(out)}
            <noscript><div class="ln"><span class="t-muted">Turn on JavaScript to use this terminal. Everything it shows is also on this page.</span></div></noscript>
          </div>
        </div>
        <div class="term-chips" aria-label="Quick commands">${config.terminal.chips
          .map((c) => `<button type="button" class="chip-cmd" data-cmd="${esc(c)}">${esc(c)}</button>`)
          .join('')}</div>
      </div>`
}

export function hero(d) {
  const [primary, ...rest] = d.role.split('|')
  const buttons = [
    { label: 'Projects', href: '#projects', primary: true },
    { label: 'Resume', href: '/resume.html' },
    d.github && { label: 'GitHub', href: d.github.url },
    d.linkedin && { label: 'LinkedIn', href: d.linkedin.url },
  ].filter(Boolean)
  return `<section id="hero" class="hero" aria-labelledby="hero-title">
    <div class="hero-grid">
      <div class="hero-copy">
        <h1 id="hero-title" class="hero-name">${esc(d.firstName)} <span class="accent glow">${esc(d.lastName)}</span></h1>
        <p class="hero-role"><span class="accent">${esc(primary.trim())}</span>${rest.length ? ` <span class="sep">|</span> ${esc(rest.join('|').trim())}` : ''}</p>
        <p class="hero-pitch">${esc(d.tagline)}</p>
        <div class="hero-actions">${buttons
          .map((b) => `<a class="btn${b.primary ? ' btn-primary' : ''}" href="${esc(b.href)}"${external(b.href)}>${esc(b.label)}${/^https?:/.test(b.href) ? ' <span aria-hidden="true">↗</span>' : ''}</a>`)
          .join('')}</div>
        ${d.location ? `<p class="hero-meta"><span class="t-muted">based in</span> ${esc(d.location)}</p>` : ''}
      </div>
      <div class="hero-terminal">
      ${terminalWindow(d)}
      </div>
    </div>
  </section>`
}

const interestList = (items) =>
  `<ul class="interests">${items.map((i) => `<li><strong>${esc(i.name)}</strong>${i.summary ? `<span>${esc(i.summary)}</span>` : ''}</li>`).join('')}</ul>`

export function about(d) {
  const edu = d.education[0]
  const facts = [
    d.location && ['location', d.location],
    edu && ['studying', `${edu.title} · ${edu.org}`],
    d.languages.length && ['speaks', d.languages.map((l) => l.language).join(', ')],
    ['status', d.status],
  ].filter(Boolean)
  const side = [
    d.focusAreas.length && `<h3 class="label">Focus areas</h3>${interestList(d.focusAreas)}`,
    d.interests.length && `<h3 class="label">Off-screen</h3>${interestList(d.interests)}`,
    d.achievements.length && `<ul class="medals" aria-label="Race medals">${d.achievements.map((a) => `<li><span aria-hidden="true">◆</span> ${esc(a.title)}</li>`).join('')}</ul>`,
  ].filter(Boolean)
  return `<section id="about" class="section" aria-labelledby="about-title">
    <div class="wrap">
      ${sectionIntro('about')}
      <div class="about-grid">
        <div class="about-main panel">
          ${d.image ? `<img class="portrait" src="${esc(assetUrl(d.image))}" alt="Portrait of ${esc(d.name)}" width="96" height="96" loading="lazy" decoding="async">` : ''}
          <p class="about-summary">${esc(d.summary)}</p>
          <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </div>
        ${side.length ? `<div class="about-side">${side.join('')}</div>` : ''}
      </div>
    </div>
  </section>`
}

/** The stat row on project cards and project pages. */
export function projectFacts(p) {
  if (!p.facts.length) return ''
  return `<ul class="project-facts" aria-label="Key facts">${p.facts
    .map((f) => `<li><strong>${esc(f.value)}</strong><span>${esc(f.label)}</span></li>`)
    .join('')}</ul>`
}

/** srcset/sizes for an image with an optional small (~640px) variant. */
export const imgSrcset = (img, sizes) => (img.small ? ` srcset="${esc(assetUrl(img.small))} 640w, ${esc(assetUrl(img.src))} 1200w" sizes="${sizes}"` : '')

/** How many highlights a card shows before "more". */
const INLINE_HIGHLIGHTS = 2

export function projectCard(p) {
  const img = p.images[0]
  const shown = p.highlights.slice(0, INLINE_HIGHLIGHTS)
  const more = p.highlights.slice(INLINE_HIGHLIGHTS)
  const links = [
    p.pagePath && `<a href="/${esc(p.pagePath)}">How it works <span aria-hidden="true">→</span><span class="sr-only">: ${esc(p.title)}</span></a>`,
    p.repoUrl && `<a href="${esc(p.repoUrl)}"${external(p.repoUrl)}>Repository <span aria-hidden="true">↗</span><span class="sr-only"> for ${esc(p.title)} (opens in a new tab)</span></a>`,
    p.liveUrl && `<a href="${esc(p.liveUrl)}"${external(p.liveUrl)}>Live demo <span aria-hidden="true">↗</span><span class="sr-only"> for ${esc(p.title)} (opens in a new tab)</span></a>`,
  ].filter(Boolean)
  return `<li>
        <article class="project${p.featured ? ' is-featured' : ''}${img ? ' has-thumb' : ''}" data-project="${esc(p.slug)}" aria-labelledby="p-${esc(p.slug)}">
          ${img ? `<figure class="project-thumb"><img src="${esc(assetUrl(img.src))}"${imgSrcset(img, '(max-width: 960px) calc(100vw - 32px), 640px')} alt="${esc(img.caption || `Screenshot of ${p.title}`)}" width="1200" height="724" loading="lazy" decoding="async"></figure>` : ''}
          <p class="project-meta"><span class="project-index">${pad2(p.index)}</span><span class="project-cat">${esc(p.categoryLabel)}</span>${p.featured ? '<span class="project-star">featured</span>' : ''}${p.shippedLabel ? `<span class="project-date"><span class="sr-only">shipped </span>${esc(p.shippedLabel)}</span>` : ''}</p>
          <h3 id="p-${esc(p.slug)}" class="project-title">${esc(p.title)}</h3>
          <p class="project-summary">${esc(p.summary)}</p>
          ${projectFacts(p)}
          ${shown.length ? `<ul class="project-points">${shown.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
          ${more.length ? `<details class="project-more"><summary>${more.length} more</summary><ul>${more.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></details>` : ''}
          ${p.tags.length ? `<ul class="tags" aria-label="Stack">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          ${links.length ? `<p class="project-links">${links.join('')}</p>` : ''}
        </article>
      </li>`
}

export function projects(d) {
  return `<section id="projects" class="section" aria-labelledby="projects-title">
    <div class="wrap">
      ${sectionIntro('projects', `~/projects · ${d.projects.length} entries`)}
      <ol class="projects">${d.projects.map(projectCard).join('')}</ol>
    </div>
  </section>`
}

/** A framed, decorative window the 3D scene draws into (empty without WebGL). */
function stage(id) {
  const s = section(id)
  return `<figure class="stage" data-stage="${id}" aria-hidden="true">
        <span class="stage-corner tl"></span><span class="stage-corner tr"></span><span class="stage-corner bl"></span><span class="stage-corner br"></span>
        <figcaption class="stage-caption">${esc(s.stage ?? '')}</figcaption>
      </figure>`
}

function sectionIntro(id, eyebrow) {
  const s = section(id)
  return `<div class="section-intro${s.stage ? ' has-stage' : ''}">
      <div class="section-intro-text">
        ${sectionHead(id, eyebrow)}
        ${s.lead ? `<p class="section-lead">${esc(s.lead)}</p>` : ''}
      </div>
      ${s.stage ? stage(id) : ''}
    </div>`
}

export function skills(d) {
  const titles = new Map(d.projects.map((p) => [p.slug, p.title]))
  const chip = (s) => {
    const used = (s.projects ?? []).map((slug) => titles.get(slug)).filter(Boolean)
    return `<li class="chip" data-skill="${esc(s.slug)}"${used.length ? ` title="Used in ${esc(used.join(', '))}"` : ''}>${esc(s.name)}${s.note ? ` <span class="chip-note">${esc(s.note)}</span>` : ''}${used.length ? ` <span class="chip-count" aria-label="used in ${used.length} project${used.length === 1 ? '' : 's'}">${used.length}</span>` : ''}</li>`
  }
  return `<section id="skills" class="section" aria-labelledby="skills-title">
    <div class="wrap">
      ${sectionIntro('skills')}
      <div class="skill-groups">${d.skillGroups
        .map(
          (g, i) => `<article class="skill-group" data-group="${esc(g.slug)}" aria-labelledby="sg-${esc(g.slug)}">
          <h3 id="sg-${esc(g.slug)}" class="skill-group-title"><span class="skill-group-index" aria-hidden="true">${pad2(i + 1)}</span>${esc(g.name)}</h3>
          ${g.note ? `<p class="skill-group-note">${esc(g.note)}</p>` : ''}
          <ul class="chips">${g.skills.map(chip).join('')}</ul>
        </article>`,
        )
        .join('')}</div>
      <p class="skills-legend"><span class="chip-count" aria-hidden="true">n</span> = number of my projects that use it</p>
      ${
        d.techTags.length
          ? `<div class="also">
        <h3 class="label">Also in my projects</h3>
        <ul class="chips chips-secondary">${d.techTags.map((x) => `<li class="chip">${esc(x)}</li>`).join('')}</ul>
      </div>`
          : ''
      }
    </div>
  </section>`
}

function timelineItem(x) {
  if (x.kind === 'build') {
    return `<li class="timeline-item is-build">
          <p class="timeline-when">${esc(x.when)}</p>
          <h3 class="timeline-title">${esc(x.title)}</h3>
          <ul class="timeline-projects">${x.projects.map((p) => `<li><a href="#p-${esc(p.slug)}">${esc(p.title)}</a></li>`).join('')}</ul>
        </li>`
  }
  return `<li class="timeline-item">
          <p class="timeline-when">${esc(x.when || x.kind)}</p>
          <h3 class="timeline-title">${esc(x.title)}</h3>
          <p class="timeline-org">${x.url ? `<a href="${esc(x.url)}"${external(x.url)}>${esc(x.org)}</a>` : esc(x.org)}${x.location ? ` · ${esc(x.location)}` : ''}</p>
          ${x.summary ? `<p>${esc(x.summary)}</p>` : ''}
          ${x.details.length ? `<ul class="tags">${x.details.map((y) => `<li>${esc(y)}</li>`).join('')}</ul>` : ''}
        </li>`
}

export function journey(d) {
  return `<section id="journey" class="section" aria-labelledby="journey-title">
    <div class="wrap">
      ${sectionIntro('journey')}
      <ol class="timeline">${d.timeline.map(timelineItem).join('')}
        ${
          d.roles.length
            ? ''
            : `<li class="timeline-item is-next"><p class="timeline-when">next</p><h3 class="timeline-title">${esc(section('journey').next)}</h3><p class="timeline-org">${esc(d.status)}</p></li>`
        }
      </ol>
    </div>
  </section>`
}

export function notes(d) {
  if (!d.notes?.length) return ''
  return `<section id="notes" class="section" aria-labelledby="notes-title">
    <div class="wrap">
      ${sectionIntro('notes')}
      <ol class="notes">${d.notes
        .map(
          (n) => `<li><a class="note-card" href="/${esc(n.path)}">
            <p class="note-date"><time datetime="${esc(n.date)}">${esc(n.dateLabel)}</time></p>
            <h3 class="note-title">${esc(n.title)}</h3>
            ${n.summary ? `<p class="note-summary">${esc(n.summary)}</p>` : ''}
            <span class="note-more" aria-hidden="true">Read →</span>
          </a></li>`,
        )
        .join('')}</ol>
    </div>
  </section>`
}

export function contact(d) {
  return `<section id="contact" class="section" aria-labelledby="contact-title">
    <div class="wrap">
      ${sectionIntro('contact')}
      <div class="contact panel">
        <p class="contact-lead">Currently <span class="accent">${esc(d.status)}</span>. The fastest way to reach me:</p>
        ${
          d.email
            ? `<div class="contact-email-row">
          <a class="contact-email" href="mailto:${esc(d.email)}">${esc(d.email)}</a>
          <button type="button" class="btn copy-btn" data-copy="${esc(d.email)}" hidden>Copy<span class="sr-only"> email address</span></button>
        </div>`
            : ''
        }
        <ul class="contact-links">
          ${d.bookingUrl ? `<li><a class="btn btn-primary" href="${esc(d.bookingUrl)}"${external(d.bookingUrl)}>Book a call <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a></li>` : ''}
          ${d.socials
            .filter((s) => s.key !== 'website')
            .map((s) => `<li><a class="btn" href="${esc(s.url)}" rel="me noopener noreferrer" target="_blank">${esc(s.label)} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a></li>`)
            .join('')}
          <li><a class="btn" href="/resume.html">Resume</a></li>
        </ul>
      </div>
    </div>
  </section>`
}

export function footer(d, { home = '' } = {}) {
  return `<footer class="footer">
    <div class="footer-inner">
      <p>© ${new Date().getFullYear()} ${esc(d.name)}${d.location ? ` · ${esc(d.location)}` : ''}</p>
      <p class="footer-meta">
        ${home ? '' : `<span class="footer-key">terminal <kbd>${esc(config.terminal.focusKey)}</kbd></span>
        <button type="button" class="link-btn" id="toggle-3d" hidden>3D: on</button>`}
        <a href="${home}#hero">${home ? '← portfolio' : 'back to top ↑'}</a>
      </p>
    </div>
  </footer>`
}

export function page(d) {
  return html([
    `<a class="skip" href="#main">Skip to content</a>`,
    // Static background: shown without WebGL / with reduced motion, and under the canvas while it loads.
    `<div class="bg" aria-hidden="true"></div>`,
    nav(d),
    `<main id="main" tabindex="-1">`,
    hero(d),
    about(d),
    projects(d),
    skills(d),
    journey(d),
    notes(d),
    contact(d),
    `</main>`,
    footer(d),
  ])
}
