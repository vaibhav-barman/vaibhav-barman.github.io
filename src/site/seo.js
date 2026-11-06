/** <head> tags generated from portfolio.json: title, description, Open Graph, Twitter, JSON-LD. */
import { esc, truncate } from './util.js'

export function metaDescription(d) {
  return truncate(`${d.name}, ${d.role}. ${d.tagline}`, 158)
}

export function seoHead(d, opts = {}) {
  const url = `${d.baseUrl}/${opts.path ?? ''}`
  const title = opts.title ?? `${d.name} · ${d.role}`
  const desc = opts.description ?? metaDescription(d)
  const image = `${d.baseUrl}/og-image.png`
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: d.name,
    jobTitle: d.primaryRole,
    description: d.summary,
    url: d.baseUrl + '/',
    ...(d.image ? { image: `${d.baseUrl}/${d.image}` } : {}),
    ...(d.email ? { email: `mailto:${d.email}` } : {}),
    ...(d.location ? { address: { '@type': 'PostalAddress', addressLocality: d.location } } : {}),
    sameAs: d.socials.filter((s) => s.key !== 'website').map((s) => s.url),
    alumniOf: d.education.map((x) => ({ '@type': 'CollegeOrUniversity', name: x.org, ...(x.url ? { url: x.url } : {}) })),
    knowsAbout: d.skills.map((s) => s.name),
  }
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="author" content="${esc(d.name)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="${opts.type ?? 'profile'}">`,
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
