/**
 * The whole page, rendered to HTML at build time from portfolio.json.
 * These functions are the "components": edit the markup here, edit the
 * words in portfolio.json. JavaScript only adds the terminal and 3D scene.
 */
import { config } from '../config.js'
import { esc, html, pad2 } from './util.js'

const section = (id) => config.sections.find((s) => s.id === id)

function sectionHead(id, eyebrow) {
  const s = section(id)
  return `<p class="eyebrow"><span aria-hidden="true">// </span>${esc(eyebrow ?? s.eyebrow)}</p>
      <h2 id="${id}-title" class="section-title">${esc(s.title)}</h2>`
}

const external = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '')

export function nav(d) {
  return `<header class="nav">
    <a class="brand" href="#hero">${esc(d.handle)}<span class="accent">.</span>sh</a>
    <nav aria-label="Sections"><ul class="nav-links">${config.sections
      .slice(1)
      .map((s) => `<li><a href="#${s.id}">${esc(s.label)}</a></li>`)
      .join('')}</ul></nav>
    <span class="status"><span class="dot" aria-hidden="true"></span>status: ${esc(d.status)}</span>
  </header>`
}

export function hero(d) {
  return `<section id="hero" class="hero" aria-labelledby="hero-title">
    <h1 id="hero-title">${esc(d.name)}</h1>
    <p class="role">${esc(d.role)}</p>
    <p class="pitch">${esc(d.tagline)}</p>
  </section>`
}

export function about(d) {
  const edu = d.timeline.find((x) => x.kind === 'education')
  const facts = [
    d.location && ['location', d.location],
    edu && ['studying', `${edu.title} · ${edu.org}`],
    d.languages.length && ['speaks', d.languages.map((l) => l.language).join(', ')],
    ['status', d.status],
  ].filter(Boolean)
  return `<section id="about" class="section" aria-labelledby="about-title">
    <div class="wrap">
      ${sectionHead('about')}
      <p>${esc(d.summary)}</p>
      <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${d.interests.length ? `<h3>Off-screen</h3><ul>${d.interests.map((i) => `<li><strong>${esc(i.name)}</strong>${i.summary ? `: ${esc(i.summary)}` : ''}</li>`).join('')}</ul>` : ''}
    </div>
  </section>`
}

export function projects(d) {
  return `<section id="projects" class="section" aria-labelledby="projects-title">
    <div class="wrap">
      ${sectionHead('projects', `~/projects · ${d.projects.length} entries`)}
      <ol class="projects">${d.projects
        .map(
          (p) => `<li><article>
          <h3>${pad2(p.index)} · ${esc(p.title)} <small>${esc(p.categoryLabel)}</small></h3>
          <p>${esc(p.summary)}</p>
          ${p.highlights.length ? `<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
          ${p.tags.length ? `<p>${esc(p.tags.join(' · '))}</p>` : ''}
          ${p.repoUrl ? `<a href="${esc(p.repoUrl)}"${external(p.repoUrl)}>Repository</a>` : ''}
        </article></li>`,
        )
        .join('')}</ol>
    </div>
  </section>`
}

export function skills(d) {
  return `<section id="skills" class="section" aria-labelledby="skills-title">
    <div class="wrap">
      ${sectionHead('skills')}
      ${d.skillGroups.map((g) => `<h3>${esc(g.name)}</h3><ul>${g.skills.map((s) => `<li>${esc(s.name)}</li>`).join('')}</ul>`).join('')}
      ${d.techTags.length ? `<h3>Also in my projects</h3><p>${esc(d.techTags.join(' · '))}</p>` : ''}
    </div>
  </section>`
}

export function journey(d) {
  return `<section id="journey" class="section" aria-labelledby="journey-title">
    <div class="wrap">
      ${sectionHead('journey')}
      <ol>${d.timeline
        .map(
          (x) =>
            `<li><strong>${esc(x.title)}</strong>, ${x.url ? `<a href="${esc(x.url)}"${external(x.url)}>${esc(x.org)}</a>` : esc(x.org)}${x.when ? ` (${esc(x.when)})` : ''}${x.details.length ? `<br>${esc(x.details.join(' · '))}` : ''}</li>`,
        )
        .join('')}</ol>
    </div>
  </section>`
}

export function contact(d) {
  return `<section id="contact" class="section" aria-labelledby="contact-title">
    <div class="wrap">
      ${sectionHead('contact')}
      ${d.email ? `<p><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>` : ''}
      <ul>${d.socials.map((s) => `<li><a href="${esc(s.url)}" rel="me noopener noreferrer" target="_blank">${esc(s.label)}</a></li>`).join('')}
        <li><a href="/resume.html">Resume</a></li></ul>
    </div>
  </section>`
}

export function footer(d) {
  return `<footer class="footer"><p>© ${new Date().getFullYear()} ${esc(d.name)} · built from portfolio.json</p></footer>`
}

export function page(d) {
  return html([
    `<a class="skip" href="#main">Skip to content</a>`,
    nav(d),
    `<main id="main" tabindex="-1">`,
    hero(d),
    about(d),
    projects(d),
    skills(d),
    journey(d),
    contact(d),
    `</main>`,
    footer(d),
  ])
}
