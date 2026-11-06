/** Printable resume body (resume.html), generated from portfolio.json. */
import { esc } from './util.js'

export function resumeContent(d) {
  const work = d.roles
  const edu = d.education
  const entry = (x) => `<div class="entry">
      <div class="row"><h3>${esc(x.title)}</h3><span>${esc(x.when)}</span></div>
      <div class="row sub"><span>${x.url ? `<a href="${esc(x.url)}">${esc(x.org)}</a>` : esc(x.org)}</span><span>${esc(x.location)}</span></div>
      ${x.summary ? `<p>${esc(x.summary)}</p>` : ''}
      ${x.details.length ? `<ul>${x.details.map((y) => `<li>${esc(y)}</li>`).join('')}</ul>` : ''}
    </div>`
  const contact = [
    d.location && esc(d.location),
    d.email && `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`,
    d.phone && esc(d.phone),
    ...d.socials.map((s) => `<a href="${esc(s.url)}">${esc(s.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`),
  ]
  return `<main class="resume">
    <div class="toolbar no-print"><a href="./">← Portfolio</a><button type="button" id="print">Save as PDF</button></div>
    <header>
      <h1>${esc(d.name)}</h1>
      <p class="role">${esc(d.role)}</p>
      <p class="contact">${contact.filter(Boolean).join(' · ')}</p>
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
    <section><h2>Skills</h2>${d.skillGroups
      .map((g) => `<p><strong>${esc(g.name)}:</strong> ${esc(g.skills.map((s) => (s.note ? `${s.name} (${s.note})` : s.name)).join(', '))}</p>`)
      .join('')}</section>
    ${d.languages.length ? `<section><h2>Languages</h2><p>${esc(d.languages.map((l) => `${l.language} (${l.fluency})`).join(', '))}</p></section>` : ''}
  </main>`
}
