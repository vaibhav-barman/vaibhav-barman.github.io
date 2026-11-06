/**
 * Turns the raw resume JSON into the model every view consumes (HTML
 * sections, 3D scene, terminal, resume page, SEO tags). Pure: it is also
 * imported by vite.config.js at build time.
 */
import { config } from '../config.js'

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function socialKey(label, url) {
  const l = label.toLowerCase()
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    /* not a URL */
  }
  const known = {
    'github.com': 'github',
    'linkedin.com': 'linkedin',
    'x.com': 'twitter',
    'twitter.com': 'twitter',
    'youtube.com': 'youtube',
    'bsky.app': 'bluesky',
    'instagram.com': 'instagram',
  }
  if (known[host]) return known[host]
  for (const k of ['github', 'linkedin', 'twitter', 'youtube', 'mastodon', 'bluesky', 'instagram']) if (l.includes(k)) return k
  if (l.includes('website') || l.includes('site') || l.includes('blog')) return 'website'
  return slugify(label)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-10" -> "Oct 2026" (undefined for anything else). */
export function monthLabel(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym ?? '')
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : undefined
}

/**
 * How a project works, as a chain of steps plus at most one feedback loop:
 *   { "nodes": ["Diff", "Generator", "Critic"], "loop": { "from": 2, "to": 1, "label": "rejected" } }
 * Drawn as an SVG on the project page and as a 3D graph in the projects stage.
 */
function normalizePipeline(raw) {
  const nodes = (raw?.nodes ?? []).map(String).filter(Boolean)
  if (nodes.length < 2) return undefined
  const l = raw.loop
  const ok = l && Number.isInteger(l.from) && Number.isInteger(l.to) && l.from !== l.to && [l.from, l.to].every((i) => i >= 0 && i < nodes.length)
  return { nodes, loop: ok ? { from: l.from, to: l.to, label: l.label ?? '' } : undefined }
}

function categoryRank(cat) {
  const i = config.projectCategories.order.indexOf(cat)
  return i === -1 ? 99 : i
}

function normalizeProjects(raw = []) {
  const seen = new Set()
  const withMeta = raw.map((p, original) => {
    let slug = p.slug ? slugify(p.slug) : slugify(p.title.split(/\s+[:—–-]\s+/)[0] || p.title)
    while (seen.has(slug)) slug += '-2'
    seen.add(slug)
    const category = (p.category ?? 'other').toLowerCase()
    return {
      original,
      project: {
        index: 0,
        slug,
        title: p.title,
        summary: p.summary,
        highlights: p.highlights ?? [],
        tags: p.tags ?? [],
        category,
        categoryLabel: config.projectCategories.labels[category] ?? category,
        featured: Boolean(p.featured),
        repoUrl: p.repo_url || p.url || undefined,
        liveUrl: p.live_url || undefined,
        /** `img_small` (optional, ~640px wide) is served to phones via srcset. */
        images: (p.images ?? []).map((i) => ({ src: i.img_path, small: i.img_small || undefined, caption: i.caption })),
        /** Short verifiable numbers shown as a stat row: [{ value, label }]. */
        facts: (p.facts ?? []).filter((f) => f && f.value && f.label),
        /** "YYYY-MM" the project was first published. */
        shipped: /^\d{4}-\d{2}$/.test(p.shipped ?? '') ? p.shipped : undefined,
        shippedLabel: monthLabel(p.shipped),
        pipeline: normalizePipeline(p.pipeline),
        /** Featured projects get their own page: /projects/<slug>.html */
        pagePath: p.featured ? `projects/${slug}.html` : undefined,
      },
    }
  })
  withMeta.sort(
    (a, b) =>
      Number(b.project.featured) - Number(a.project.featured) ||
      categoryRank(a.project.category) - categoryRank(b.project.category) ||
      a.original - b.original,
  )
  return withMeta.map((m, i) => ({ ...m.project, index: i + 1 }))
}

/**
 * Skills accept two shapes:
 *  - grouped (preferred): [{ "category": "Backend", "note": "...", "items": ["FastAPI", { "name": "Alembic", "note": "migrations" }] }]
 *  - flat (legacy):       [{ "name": "Python", "category": "Languages" }]
 */
function normalizeSkills(raw = []) {
  const groups = new Map()
  const group = (name, note) => {
    if (!groups.has(name)) groups.set(name, { name, slug: slugify(name), note: note || undefined, skills: [] })
    const g = groups.get(name)
    if (note && !g.note) g.note = note
    return g
  }
  for (const entry of raw) {
    if (Array.isArray(entry.items)) {
      const g = group(entry.category ?? entry.name ?? 'Skills', entry.note)
      for (const item of entry.items) {
        const s = typeof item === 'string' ? { name: item } : item
        g.skills.push({ name: s.name, slug: slugify(s.name), note: s.note || undefined, category: g.name })
      }
    } else if (entry.name) {
      const g = group(entry.category ?? 'Skills')
      g.skills.push({ name: entry.name, slug: slugify(entry.name), note: entry.note || undefined, category: g.name })
    }
  }
  const skillGroups = [...groups.values()].filter((g) => g.skills.length)
  return { skillGroups, skills: skillGroups.flatMap((g) => g.skills) }
}

function work(raw, kind) {
  return {
    kind,
    title: raw.position,
    org: raw.company ?? raw.organization ?? '',
    url: raw.url,
    location: raw.location,
    when: [raw.start_date, raw.end_date || (raw.start_date ? 'Present' : '')].filter(Boolean).join(' – '),
    summary: raw.summary,
    details: raw.highlights ?? [],
  }
}

export function normalize(raw) {
  const socials = (raw.social_links ?? []).map((s) => ({
    label: s.label,
    url: s.url,
    icon: s.svg_path,
    key: socialKey(s.label, s.url),
  }))

  const { skills, skillGroups } = normalizeSkills(raw.skills)

  const projects = normalizeProjects(raw.projects)
  for (const s of skills) {
    s.projects = projects.filter((p) => p.tags.some((tag) => slugify(tag) === s.slug)).map((p) => p.slug)
  }

  // "Also in my projects": project tags that aren't already listed as skills,
  // most-used first, minus anything in `also_used_exclude`.
  const known = new Set(skills.map((s) => s.name.toLowerCase()))
  const exclude = new Set((raw.also_used_exclude ?? []).map((x) => x.toLowerCase()))
  const tagCount = new Map()
  for (const p of projects) for (const tag of p.tags) tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
  const techTags = [...tagCount]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .filter((tag) => !known.has(tag.toLowerCase()) && !exclude.has(tag.toLowerCase()))

  const education = (raw.education ?? []).map((e) => ({
    kind: 'education',
    title: (e.degrees ?? []).join(', ') || 'Studies',
    org: e.institution,
    url: e.url,
    location: e.location,
    when: [e.start_date, e.graduation_date].filter(Boolean).join(' – '),
    details: [...(e.gpa_cumulative ? [`CGPA ${e.gpa_cumulative}`] : []), ...(e.gpa_major ? [`Major GPA ${e.gpa_major}`] : []), ...(e.honors ?? [])],
  }))

  const roles = [...(raw.work_experience ?? []).map((w) => work(w, 'work')), ...(raw.volunteer_experience ?? []).map((w) => work(w, 'volunteer'))]

  // "Shipped" steps: projects grouped by the month they were published, oldest first.
  const byMonth = new Map()
  for (const p of projects) if (p.shipped) byMonth.set(p.shipped, [...(byMonth.get(p.shipped) ?? []), p])
  const builds = [...byMonth]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, ps]) => ({
      kind: 'build',
      title: `Shipped ${ps.length} project${ps.length === 1 ? '' : 's'}`,
      org: '',
      when: monthLabel(ym),
      details: [],
      projects: ps.map((p) => ({ slug: p.slug, title: p.title })),
    }))

  // Journey order: roles (newest first, as written), then education, then builds in time order.
  const timeline = [...roles, ...education, ...builds]

  const firstName = raw.name.split(/\s+/)[0] ?? raw.name
  const achievements = (raw.marathon?.medals ?? []).map((m) => ({
    title: `${m.distance} · ${m.event}`,
    detail: m.medal ?? 'Finisher',
  }))
  const role = raw.label ?? ''

  return {
    name: raw.name,
    firstName,
    lastName: raw.name.slice(firstName.length).trim(),
    handle: slugify(firstName),
    role,
    /** First part of the label, e.g. "AI Engineer". */
    primaryRole: role.split('|')[0].trim(),
    tagline: raw.tagline ?? role,
    status: raw.status ?? config.defaultStatus,
    summary: raw.summary,
    image: raw.image_path,
    location: raw.contact?.location || undefined,
    email: raw.contact?.email || undefined,
    phone: raw.contact?.phone || undefined,
    bookingUrl: raw.contact?.booking_url || undefined,
    website: raw.contact?.website || raw.base_url || undefined,
    baseUrl: (raw.base_url ?? raw.contact?.website ?? '').replace(/\/$/, ''),
    socials,
    github: socials.find((s) => s.key === 'github'),
    linkedin: socials.find((s) => s.key === 'linkedin'),
    projects,
    skills,
    skillGroups,
    techTags,
    timeline,
    /** Professional roles only (work + volunteer). */
    roles,
    education,
    builds,
    focusAreas: (raw.focus_areas ?? []).map((i) => ({ name: i.name, summary: i.summary })),
    interests: (raw.interests ?? []).map((i) => ({ name: i.name, summary: i.summary })),
    languages: raw.languages ?? [],
    achievements,
  }
}
