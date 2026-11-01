/**
 * Build-time HTML generated from portfolio.json (used by vite.config.ts):
 *  - <head> SEO tags + JSON-LD Person schema
 *  - a complete, semantic text version of the site inside #root, visible to
 *    crawlers and to visitors without JavaScript (React replaces it on mount)
 *  - the printable resume page body
 */
import type { Portfolio } from './normalize'

export function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'
}

export function metaDescription(d: Portfolio): string {
  return truncate(`${d.name}, ${d.role}. ${d.tagline}`, 158)
}

export function seoHead(d: Portfolio, opts: { path?: string; title?: string } = {}): string {
  const url = `${d.baseUrl}/${opts.path ?? ''}`
  const title = opts.title ?? `${d.name} · ${d.role}`
  const desc = metaDescription(d)
  const image = `${d.baseUrl}/og-image.png`
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: d.name,
    jobTitle: d.role.split('|')[0]?.trim(),
    description: d.summary,
    url: d.baseUrl + '/',
    ...(d.image ? { image: `${d.baseUrl}/${d.image}` } : {}),
    ...(d.email ? { email: `mailto:${d.email}` } : {}),
    ...(d.location ? { address: { '@type': 'PostalAddress', addressLocality: d.location } } : {}),
    sameAs: d.socials.filter((s) => s.key !== 'website').map((s) => s.url),
    alumniOf: d.timeline
      .filter((t) => t.kind === 'education')
      .map((t) => ({ '@type': 'CollegeOrUniversity', name: t.org, ...(t.url ? { url: t.url } : {}) })),
    knowsAbout: d.skills.map((s) => s.name),
  }
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="author" content="${esc(d.name)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(`${d.name}: ${d.role}`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
}

function links(d: Portfolio): string {
  return [
    ...(d.email ? [`<li><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></li>`] : []),
    ...d.socials.map((s) => `<li><a href="${esc(s.url)}" rel="me noopener">${esc(s.label)}</a></li>`),
  ].join('')
}

/** Full text version of the portfolio. */
export function staticContent(d: Portfolio): string {
  const projects = d.projects
    .map(
      (p) => `<article>
        <h3>${esc(p.title)} <small>${esc(p.categoryLabel)}</small></h3>
        <p>${esc(p.summary)}</p>
        ${p.highlights.length ? `<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        ${p.tags.length ? `<p><strong>Stack:</strong> ${esc(p.tags.join(', '))}</p>` : ''}
        <p>${p.repoUrl ? `<a href="${esc(p.repoUrl)}">Repository</a>` : ''}${p.liveUrl ? ` · <a href="${esc(p.liveUrl)}">Live demo</a>` : ''}</p>
      </article>`,
    )
    .join('')
  const skills = d.skillGroups
    .map((g) => `<h3>${esc(g.name)}</h3><ul>${g.skills.map((s) => `<li>${esc(s.name)} (${s.level}%)</li>`).join('')}</ul>`)
    .join('')
  const timeline = d.timeline
    .map(
      (t) =>
        `<li><strong>${esc(t.title)}</strong>, ${t.url ? `<a href="${esc(t.url)}">${esc(t.org)}</a>` : esc(t.org)}${t.when ? ` (${esc(t.when)})` : ''}${t.details.length ? `<br>${esc(t.details.join(' · '))}` : ''}</li>`,
    )
    .join('')
  return `<div id="static-content" class="static-content">
    <header>
      <h1>${esc(d.name)}</h1>
      <p>${esc(d.role)}</p>
      <p>${esc(d.tagline)}</p>
      <p>Status: ${esc(d.status)}</p>
      <noscript><p>This is the text version. Enable JavaScript for the 3D experience and the interactive terminal.</p></noscript>
      <nav aria-label="Sections"><a href="#s-about">About</a> · <a href="#s-projects">Projects</a> · <a href="#s-skills">Skills</a> · <a href="#s-journey">Journey</a> · <a href="#s-contact">Contact</a> · <a href="resume.html">Resume</a></nav>
    </header>
    <main>
      <section id="s-about"><h2>About</h2><p>${esc(d.summary)}</p>${d.location ? `<p>Based in ${esc(d.location)}</p>` : ''}
        ${d.interests.length ? `<h3>Interests</h3><ul>${d.interests.map((i) => `<li><strong>${esc(i.name)}</strong>: ${esc(i.summary)}</li>`).join('')}</ul>` : ''}
      </section>
      <section id="s-projects"><h2>Projects</h2>${projects}</section>
      <section id="s-skills"><h2>Skills</h2>${skills}</section>
      <section id="s-journey"><h2>Experience &amp; education</h2><ul>${timeline}</ul></section>
      <section id="s-contact"><h2>Contact</h2><ul>${links(d)}</ul></section>
    </main>
  </div>`
}

/** Printable resume body. */
export function resumeContent(d: Portfolio): string {
  const work = d.timeline.filter((t) => t.kind !== 'education')
  const edu = d.timeline.filter((t) => t.kind === 'education')
  const entry = (t: (typeof d.timeline)[number]) => `<div class="entry">
      <div class="row"><h3>${esc(t.title)}</h3><span>${esc(t.when)}</span></div>
      <div class="row sub"><span>${t.url ? `<a href="${esc(t.url)}">${esc(t.org)}</a>` : esc(t.org)}</span><span>${esc(t.location)}</span></div>
      ${t.summary ? `<p>${esc(t.summary)}</p>` : ''}
      ${t.details.length ? `<ul>${t.details.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    </div>`
  return `<main class="resume">
    <div class="toolbar no-print"><a href="./">← Portfolio</a><button type="button" id="print">Save as PDF</button></div>
    <header>
      <h1>${esc(d.name)}</h1>
      <p class="role">${esc(d.role)}</p>
      <p class="contact">${[d.location && esc(d.location), d.email && `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`, d.phone && esc(d.phone), ...d.socials.map((s) => `<a href="${esc(s.url)}">${esc(s.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`)].filter(Boolean).join(' · ')}</p>
    </header>
    <section><h2>Summary</h2><p>${esc(d.summary)}</p></section>
    ${work.length ? `<section><h2>Experience</h2>${work.map(entry).join('')}</section>` : ''}
    <section><h2>Projects</h2>${d.projects
      .map(
        (p) => `<div class="entry">
        <div class="row"><h3>${p.repoUrl ? `<a href="${esc(p.repoUrl)}">${esc(p.title)}</a>` : esc(p.title)}</h3><span>${esc(p.tags.slice(0, 4).join(' · '))}</span></div>
        <p>${esc(p.summary)}</p>
        ${p.highlights.length ? `<ul>${p.highlights.slice(0, 3).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
      </div>`,
      )
      .join('')}</section>
    ${edu.length ? `<section><h2>Education</h2>${edu.map(entry).join('')}</section>` : ''}
    <section><h2>Skills</h2>${d.skillGroups.map((g) => `<p><strong>${esc(g.name)}:</strong> ${esc(g.skills.map((s) => s.name).join(', '))}</p>`).join('')}</section>
    ${d.languages.length ? `<section><h2>Languages</h2><p>${esc(d.languages.map((l) => `${l.language} (${l.fluency})`).join(', '))}</p></section>` : ''}
  </main>`
}
