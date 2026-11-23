/**
 * The whole page, rendered to HTML at build time from portfolio.json.
 * These functions are the "components": edit the markup here, edit the
 * words in portfolio.json. JavaScript only adds the 3D hero, the diagrams'
 * pause/resume, the typed line, the wireframe solids and the shell.
 */
import { config } from '../config.js'
import { chromeSphereSvg } from './chrome-svg.js'
import { graphDiagram } from './pipeline-svg.js'
import { esc, html, pad2 } from './util.js'

const section = (id) => config.sections.find((s) => s.id === id)

/** Optional sections (like notes) only appear when they have content. */
export function visibleSections(d) {
  return config.sections.filter((s) => !s.optional || (s.id === 'notes' && d.notes?.length))
}

/** "01" for the first numbered section, and so on (the hero is not numbered). */
const sectionNumber = (d, id) => pad2(visibleSections(d).filter((s) => s.id !== 'hero').findIndex((s) => s.id === id) + 1)

const external = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '')
const arrow = (url) => (/^https?:/.test(url) ? ' <span aria-hidden="true">↗</span>' : '')
const newTab = '<span class="sr-only"> (opens in a new tab)</span>'
/** Local images in public/ are referenced from the site root; full URLs pass through. */
export const assetUrl = (src) => (/^https?:/.test(src) ? src : `/${String(src).replace(/^\/+/, '')}`)
const displayUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

/** Four crop marks, one per corner of a panel. */
export const corners = () => '<span class="cm tl" aria-hidden="true"></span><span class="cm tr" aria-hidden="true"></span><span class="cm bl" aria-hidden="true"></span><span class="cm br" aria-hidden="true"></span>'

const fill = (text, d) => String(text ?? '').replace('{flagships}', String(d.flagships.length)).replace('{builds}', String(d.moreBuilds.length))

function sectionHead(d, id) {
  const s = section(id)
  return `<header class="sec-head" data-reveal>
      <span class="sec-num chrome sheen" aria-hidden="true">${sectionNumber(d, id)}</span>
      <span class="sec-bar" aria-hidden="true"></span>
      <h2 id="${id}-title" class="sec-label">${esc(s.head)}</h2>
      <span class="sec-rule" aria-hidden="true"></span>
      ${s.note ? `<span class="sec-note">${esc(fill(s.note, d))}</span>` : ''}
    </header>${s.lead ? `<p class="sec-lead">${esc(s.lead)}</p>` : ''}`
}

const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').toUpperCase()

export function nav(d, { home = '' } = {}) {
  const links = visibleSections(d)
    .slice(1)
    .map((s) => `<li><a href="${home}#${s.id}" data-nav="${s.id}">${esc(s.label)}</a></li>`)
    .join('')
  return `<header class="nav" id="nav">
    <div class="nav-inner">
      <a class="brand" href="${home || ''}#hero"><span class="brand-mark chrome" aria-hidden="true">${esc(initials(d.name))}</span><span class="brand-name">${esc(d.handle)}<span class="brand-dot">.</span>sh</span><span class="sr-only">, ${esc(d.name)}, back to top</span></a>
      <nav class="nav-links" aria-label="Sections"><ul>${links}</ul></nav>
      <a class="btn nav-cta" href="${home}${esc(config.nav.cta.href)}">${esc(config.nav.cta.label)}</a>
      <details class="nav-menu">
        <summary><span class="sr-only">Open section menu</span><span class="burger" aria-hidden="true"></span></summary>
        <nav aria-label="Sections (menu)"><ul>${links}</ul></nav>
      </details>
    </div>
  </header>`
}

/** The lines under the name: "P / 01  Blog Writing Agent  langgraph · ...", for every showcased project. */
const tagLine = (p) => p.tags.slice(0, 3).join(' · ')

export function hero(d) {
  const role = d.manifest.find((r) => r.key === 'role')?.value ?? ''
  const tail = role.split('·')[1]?.trim()
  const showcased = [...d.flagships, ...d.moreBuilds]
  const links = [d.github && { label: 'GitHub', href: d.github.url }, d.linkedin && { label: 'LinkedIn', href: d.linkedin.url }, { label: 'Resume', href: '/resume.html' }].filter(Boolean)
  return `<section id="hero" class="hero" aria-labelledby="hero-title">
    <div class="hero-stage" aria-hidden="true">
      <div class="hero-fallback">${chromeSphereSvg({ id: 'hf' })}</div>
    </div>
    <span class="cm tl" aria-hidden="true"></span><span class="cm tr" aria-hidden="true"></span><span class="cm bl" aria-hidden="true"></span><span class="cm br" aria-hidden="true"></span>
    <div class="hero-ui">
      <p class="hero-meta">
        <span class="hm-l">${esc(initials(d.name))} — ${new Date().getFullYear()}${tail ? ` · ${esc(tail)}` : ''}</span>
        <span class="hm-c"><i class="dot" aria-hidden="true"></i><b><span class="sr-only">Status: </span>${esc(d.status)}</b></span>
        ${d.location ? `<span class="hm-r">${esc(d.location)}</span>` : ''}
      </p>
      <div class="hero-main">
        <h1 id="hero-title" class="hero-name chrome sheen">${esc(d.firstName)} <strong>${esc(d.lastName)}</strong></h1>
        <p class="hero-sub">${esc(d.subtitle)}</p>
        <div class="rule" aria-hidden="true"></div>
        <p class="hero-term"><span class="typed" data-lines="${esc(JSON.stringify(d.taglines))}">${esc(d.taglines[0])}</span><span class="caret" aria-hidden="true"></span></p>
      </div>
      <div class="hero-foot">
        <nav class="hero-projects" aria-label="Selected builds">
          <h2 class="hp-title">selected builds</h2>
          <ul>${showcased
            .map(
              (p) =>
                `<li><a href="${esc(p.repoUrl ?? `#p-${p.slug}`)}"${external(p.repoUrl ?? '')} data-node="${esc(p.slug)}" data-ring="${p.showcase === 'flagship' ? 0 : 1}" data-id="P/${pad2(p.slot)}" data-name="${esc(p.title)}" data-tag="${esc(tagLine(p))}"><i>P/${pad2(p.slot)}</i>${esc(p.title)}<em>${esc(tagLine(p))}</em>${p.repoUrl ? newTab : ''}</a></li>`,
            )
            .join('')}</ul>
        </nav>
        <p class="hero-hint" aria-hidden="true">hover or tap a node</p>
        <p class="hero-links">${links.map((l) => `<a href="${esc(l.href)}"${external(l.href)}>${esc(l.label)}${arrow(l.href)}${external(l.href) ? newTab : ''}</a>`).join('')}</p>
      </div>
    </div>
  </section>`
}

export function about(d) {
  const rows = d.manifest
    .map((r) => {
      const value =
        r.key === 'name' ? `<span class="chrome">${esc(r.value)}</span>` : r.key === 'status' ? `<i class="dot" aria-hidden="true"></i>${esc(r.value)}` : esc(r.value)
      return `<div class="mrow" data-reveal><dt>${esc(r.key)}</dt><dd class="m-${esc(r.key)}">${value}</dd></div>`
    })
    .join('')
  return `<section id="about" class="section" aria-labelledby="about-title">
    <div class="wrap">
      ${sectionHead(d, 'about')}
      <div class="whoami panel" data-reveal>
        ${corners()}
        <div class="whoami-body">
          <p class="prompt"><span class="prompt-sign" aria-hidden="true">$</span> ${esc(config.whoami.command)}</p>
          <dl class="manifest">${rows}</dl>
          <p class="manifest-ok" data-reveal>${esc(config.whoami.done)}</p>
        </div>
        <canvas class="solid whoami-solid" data-solid="icosahedron" aria-hidden="true"></canvas>
      </div>
      <p class="about-summary" data-reveal>${esc(d.summary)}</p>
      <div class="shell">
        <button type="button" class="shell-open" id="shell-open" aria-expanded="false" aria-controls="shell-mount" hidden>${esc(config.whoami.shell)}</button>
        <div id="shell-mount"></div>
      </div>
    </div>
  </section>`
}

/** The stat rows on flagship cards and project pages. */
export function projectFacts(p) {
  if (!p.facts.length) return ''
  return `<dl class="spec" aria-label="Key facts">${p.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`
}

/** srcset/sizes for an image with an optional small (~640px) variant. */
export const imgSrcset = (img, sizes) => (img.small ? ` srcset="${esc(assetUrl(img.small))} 640w, ${esc(assetUrl(img.src))} 1200w" sizes="${sizes}"` : '')

const chips = (items, label = 'Stack') => (items.length ? `<ul class="chips" aria-label="${label}">${items.map((x) => `<li class="chip">${esc(x)}</li>`).join('')}</ul>` : '')

function projectLinks(p) {
  return [
    p.repoUrl && `<a href="${esc(p.repoUrl)}"${external(p.repoUrl)}>${esc(displayUrl(p.repoUrl))}${arrow(p.repoUrl)}<span class="sr-only"> (opens in a new tab)</span></a>`,
    p.liveUrl && `<a href="${esc(p.liveUrl)}"${external(p.liveUrl)}>Live demo${arrow(p.liveUrl)}${newTab}</a>`,
    p.pagePath && `<a href="/${esc(p.pagePath)}">How it works <span aria-hidden="true">→</span><span class="sr-only">: ${esc(p.title)}</span></a>`,
  ].filter(Boolean)
}

function flagshipCard(p) {
  return `<article class="flagship panel" id="p-${esc(p.slug)}" data-project="${esc(p.slug)}" aria-labelledby="t-${esc(p.slug)}" data-reveal>
        ${corners()}
        <div class="fx-col">${graphDiagram(p.graph, { id: p.slug, title: `How ${p.title} works` })}</div>
        <div class="fx-info">
          <p class="idx"><span class="idx-n">P / ${pad2(p.slot)}</span><span class="pill">${esc(tagLine(p))}</span></p>
          <h3 id="t-${esc(p.slug)}" class="fx-title chrome">${esc(p.title)}</h3>
          <p class="blurb">${esc(p.summary)}</p>
          ${projectFacts(p)}
          ${p.highlights.length ? `<ul class="points">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
          ${chips(p.tags)}
          <p class="repo">${projectLinks(p).join('')}</p>
        </div>
      </article>`
}

export function projects(d) {
  if (!d.flagships.length) return ''
  return `<section id="projects" class="section" aria-labelledby="projects-title">
    <div class="wrap">
      ${sectionHead(d, 'projects')}
      <div class="flagships">${d.flagships.map(flagshipCard).join('')}</div>
    </div>
  </section>`
}

function buildCard(p) {
  return `<li>
        <article class="build panel" id="p-${esc(p.slug)}" data-project="${esc(p.slug)}" aria-labelledby="t-${esc(p.slug)}" data-reveal>
          ${corners()}
          <div class="build-head">
            <div>
              <p class="idx"><span class="idx-n">P / ${pad2(p.slot)}</span><span class="pill">${esc(p.categoryLabel)}</span></p>
              <h3 id="t-${esc(p.slug)}" class="build-title">${esc(p.title)}</h3>
            </div>
            <canvas class="solid build-solid" data-solid="${esc(p.solid)}" aria-hidden="true"></canvas>
          </div>
          <p class="blurb">${esc(p.summary)}</p>
          ${chips(p.tags.slice(0, 5))}
          <p class="repo">${projectLinks(p).join('')}</p>
        </article>
      </li>`
}

export function builds(d) {
  if (!d.moreBuilds.length) return ''
  return `<section id="builds" class="section" aria-labelledby="builds-title">
    <div class="wrap">
      ${sectionHead(d, 'builds')}
      <ol class="builds">${d.moreBuilds.map(buildCard).join('')}</ol>
    </div>
  </section>`
}

export function skills(d) {
  // Tooltips only name projects that are on the page (the hidden ones stay in the JSON, not in the markup).
  const titles = new Map([...d.flagships, ...d.moreBuilds].map((p) => [p.slug, p.title]))
  const chip = (s) => {
    const used = (s.projects ?? []).map((slug) => titles.get(slug)).filter(Boolean)
    return `<li class="chip" data-skill="${esc(s.slug)}"${used.length ? ` title="Used in ${esc(used.join(', '))}"` : ''}>${esc(s.name)}${s.note ? ` <span class="chip-note">${esc(s.note)}</span>` : ''}</li>`
  }
  return `<section id="skills" class="section" aria-labelledby="skills-title">
    <div class="wrap">
      ${sectionHead(d, 'skills')}
      <div class="stack">${d.skillGroups
        .map(
          (g, i) => `<article class="stack-row" data-group="${esc(g.slug)}" aria-labelledby="sg-${esc(g.slug)}" data-reveal>
          <h3 id="sg-${esc(g.slug)}" class="stack-title"><span class="stack-index" aria-hidden="true">${pad2(i + 1)}</span>${esc(g.name)}${g.note ? `<span class="stack-note">${esc(g.note)}</span>` : ''}</h3>
          <ul class="chips">${g.skills.map(chip).join('')}</ul>
        </article>`,
        )
        .join('')}</div>
    </div>
  </section>`
}

function timelineItem(x) {
  return `<li class="tl-item">
          ${x.when ? `<p class="tl-when">${esc(x.when)}</p>` : ''}
          <h4 class="tl-title">${esc(x.title)}</h4>
          <p class="tl-org">${x.url ? `<a href="${esc(x.url)}"${external(x.url)}>${esc(x.org)}${newTab}</a>` : esc(x.org)}${x.location ? ` · ${esc(x.location)}` : ''}</p>
          ${x.summary ? `<p class="tl-sum">${esc(x.summary)}</p>` : ''}
          ${x.details.length ? `<ul class="chips">${x.details.map((y) => `<li class="chip">${esc(y)}</li>`).join('')}</ul>` : ''}
        </li>`
}

export function journey(d) {
  return `<section id="journey" class="section" aria-labelledby="journey-title">
    <div class="wrap">
      ${sectionHead(d, 'journey')}
      <div class="creds">
        <div class="panel cred-main" data-reveal>
          ${corners()}
          ${d.roles.length ? `<h3 class="label">experience</h3><ol class="timeline">${d.roles.map(timelineItem).join('')}</ol>` : ''}
          ${d.education.length ? `<h3 class="label">education</h3><ol class="timeline">${d.education.map(timelineItem).join('')}</ol>` : ''}
        </div>
        ${
          d.certifications.length
            ? `<div class="panel cred-certs" data-reveal>
          ${corners()}
          <h3 class="label">certifications</h3>
          <ol class="certs">${d.certifications.map((c, i) => `<li><span class="idx">C / ${pad2(i + 1)}</span><span class="cert-name">${esc(c.name)}</span>${c.issuer ? `<em class="cert-issuer">${esc(c.issuer)}</em>` : ''}</li>`).join('')}</ol>
        </div>`
            : ''
        }
      </div>
    </div>
  </section>`
}

export function notes(d) {
  if (!d.notes?.length) return ''
  return `<section id="notes" class="section" aria-labelledby="notes-title">
    <div class="wrap">
      ${sectionHead(d, 'notes')}
      <ol class="notes">${d.notes
        .map(
          (n) => `<li><a class="note-card panel" href="/${esc(n.path)}" data-reveal>
            ${corners()}
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
  const channels = [
    ...d.socials.filter((s) => s.key !== 'website').map((s) => ({ label: s.label, href: s.url, text: displayUrl(s.url), rel: ' rel="me noopener noreferrer"', blank: true })),
    { label: 'Resume', href: '/resume.html', text: 'resume.html', rel: '', blank: false },
  ]
  return `<section id="contact" class="section" aria-labelledby="contact-title">
    <div class="wrap">
      ${sectionHead(d, 'contact')}
      <div class="contact panel" data-reveal>
        ${corners()}
        <p class="contact-lead"><i class="dot" aria-hidden="true"></i><span><span class="sr-only">Status: </span>${esc(d.status)}</span></p>
        ${
          d.email
            ? `<div class="contact-email-row">
          <a class="contact-email" href="mailto:${esc(d.email)}">${esc(d.email)}</a>
          <button type="button" class="btn copy-btn" data-copy="${esc(d.email)}" hidden>Copy<span class="sr-only"> email address</span></button>
        </div>`
            : ''
        }
        <ul class="contact-links">
          ${d.bookingUrl ? `<li><a class="clink" href="${esc(d.bookingUrl)}"${external(d.bookingUrl)}><span class="clink-k">Book a call</span><span class="clink-v">${esc(displayUrl(d.bookingUrl))}</span><b aria-hidden="true">↗</b>${newTab}</a></li>` : ''}
          ${channels
            .map(
              (c) =>
                `<li><a class="clink" href="${esc(c.href)}"${c.rel}${c.blank ? ' target="_blank"' : ''}><span class="clink-k">${esc(c.label)}</span><span class="clink-v">${esc(c.text)}</span><b aria-hidden="true">${c.blank ? '↗' : '→'}</b>${c.blank ? newTab : ''}</a></li>`,
            )
            .join('')}
        </ul>
      </div>
    </div>
  </section>`
}

export function footer(d, { home = '' } = {}) {
  return `<footer class="footer">
    <div class="footer-sphere">${chromeSphereSvg({ id: 'ft', className: 'sphere sphere-sm', turn: 22 })}</div>
    <p class="eot">${esc(config.footer.end)}</p>
    <p class="footer-meta">
      <span>© ${new Date().getFullYear()} ${esc(d.name)}${d.location ? ` · ${esc(d.location)}` : ''}</span>
      <span class="footer-links">
        ${home ? '' : '<button type="button" class="link-btn" id="toggle-3d" hidden>3D: on</button>'}
        <a href="${home}#hero">${home ? '← portfolio' : 'back to top ↑'}</a>
      </span>
    </p>
  </footer>`
}

export function page(d) {
  return html([
    `<a class="skip" href="#main">Skip to content</a>`,
    // Static background: shown under everything, and the whole look when WebGL is unavailable.
    `<div class="bg" aria-hidden="true"></div>`,
    nav(d),
    `<main id="main" tabindex="-1">`,
    hero(d),
    about(d),
    projects(d),
    builds(d),
    skills(d),
    journey(d),
    notes(d),
    contact(d),
    `</main>`,
    footer(d),
  ])
}
