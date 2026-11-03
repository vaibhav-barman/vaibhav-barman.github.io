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
        images: (p.images ?? []).map((i) => ({ src: i.img_path, caption: i.caption })),
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

  const timeline = [
    ...(raw.work_experience ?? []).map((w) => work(w, 'work')),
    ...(raw.volunteer_experience ?? []).map((w) => work(w, 'volunteer')),
    ...education,
  ]

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
    interests: (raw.interests ?? []).map((i) => ({ name: i.name, summary: i.summary })),
    languages: raw.languages ?? [],
    achievements,
  }
}
