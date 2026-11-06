/**
 * Standalone pages built from page.html: one per featured project
 * (/projects/<slug>.html) and one per published note (/notes/<slug>.html).
 * Plain HTML: no terminal and no 3D, so they load instantly and print well.
 */
import { assetUrl, footer, imgSrcset, nav, projectFacts } from './page.js'
import { pipelineSvg } from './pipeline-svg.js'
import { esc, html, pad2, truncate } from './util.js'

const external = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '')

function shell(d, body) {
  return html([`<a class="skip" href="#main">Skip to content</a>`, `<div class="bg" aria-hidden="true"></div>`, nav(d, { home: '/' }), body, footer(d, { home: '/' })])
}

export function projectPage(d, p) {
  const featured = d.projects.filter((x) => x.pagePath)
  const at = featured.indexOf(p)
  const prev = featured[(at - 1 + featured.length) % featured.length]
  const next = featured[(at + 1) % featured.length]
  const img = p.images[0]
  const links = [
    p.repoUrl && `<a class="btn btn-primary" href="${esc(p.repoUrl)}"${external(p.repoUrl)}>Repository <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`,
    p.liveUrl && `<a class="btn" href="${esc(p.liveUrl)}"${external(p.liveUrl)}>Live demo <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`,
    `<a class="btn" href="/#p-${esc(p.slug)}">All projects</a>`,
  ].filter(Boolean)
  const body = `<main id="main" class="page" tabindex="-1">
    <article class="doc" aria-labelledby="page-title">
      <p class="eyebrow"><span aria-hidden="true">// </span>~/projects/${esc(p.slug)}.md</p>
      <h1 id="page-title" class="page-title">${esc(p.title)}</h1>
      <p class="project-meta"><span class="project-index">${pad2(p.index)}</span><span class="project-cat">${esc(p.categoryLabel)}</span>${p.featured ? '<span class="project-star">featured</span>' : ''}${p.shippedLabel ? `<span class="project-date">shipped ${esc(p.shippedLabel)}</span>` : ''}</p>
      <p class="page-lead">${esc(p.summary)}</p>
      ${projectFacts(p)}
      <p class="page-actions">${links.join('')}</p>
      ${img ? `<figure class="doc-figure"><img src="${esc(assetUrl(img.src))}"${imgSrcset(img, '(max-width: 912px) calc(100vw - 32px), 880px')} alt="${esc(img.caption || `Screenshot of ${p.title}`)}" width="1200" height="724" decoding="async">${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>` : ''}
      ${
        p.pipeline
          ? `<section aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <div class="pipeline-wrap">${pipelineSvg(p.pipeline, { title: `How ${p.title} works` })}</div>
        <ol class="pipeline-steps">${p.pipeline.nodes.map((n, i) => `<li>${esc(n)}${p.pipeline.loop?.from === i ? ` <span class="pl-note">↺ ${p.pipeline.loop.label ? `${esc(p.pipeline.loop.label)}: ` : ''}back to “${esc(p.pipeline.nodes[p.pipeline.loop.to])}”</span>` : ''}</li>`).join('')}</ol>
      </section>`
          : ''
      }
      ${
        p.highlights.length
          ? `<section aria-labelledby="what-title"><h2 id="what-title">What it does</h2><ul class="doc-list">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></section>`
          : ''
      }
      ${p.tags.length ? `<section aria-labelledby="stack-title"><h2 id="stack-title">Stack</h2><ul class="tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
      ${
        featured.length > 1
          ? `<nav class="doc-nav" aria-label="More projects">
        <a href="/${esc(prev.pagePath)}"><span>← previous</span>${esc(prev.title)}</a>
        <a href="/${esc(next.pagePath)}"><span>next →</span>${esc(next.title)}</a>
      </nav>`
          : ''
      }
    </article>
  </main>`
  return {
    path: p.pagePath,
    title: `${p.title} · ${d.name}`,
    description: truncate(`${p.title}: ${p.summary}`, 158),
    body: shell(d, body),
  }
}

export function notePage(d, n) {
  const body = `<main id="main" class="page" tabindex="-1">
    <article class="doc prose" aria-labelledby="page-title">
      <p class="eyebrow"><span aria-hidden="true">// </span>~/notes/${esc(n.slug)}.md</p>
      <h1 id="page-title" class="page-title">${esc(n.title)}</h1>
      <p class="doc-meta">${n.date ? `<time datetime="${esc(n.date)}">${esc(n.dateLabel)}</time> · ` : ''}${esc(d.name)}</p>
      ${n.html}
      <p class="page-actions"><a class="btn" href="/#notes">All notes</a><a class="btn" href="/#contact">Get in touch</a></p>
    </article>
  </main>`
  return { path: n.path, title: `${n.title} · ${d.name}`, description: truncate(n.summary || n.title, 158), body: shell(d, body) }
}

/** Every standalone page for this portfolio. */
export function allPages(d) {
  return [...d.projects.filter((p) => p.pagePath).map((p) => projectPage(d, p)), ...(d.notes ?? []).map((n) => notePage(d, n))]
}

export function sitemapXml(d) {
  const urls = ['', 'resume.html', ...allPages(d).map((p) => p.path)]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(`${d.baseUrl}/${u}`)}</loc></url>`).join('\n')}
</urlset>
`
}
