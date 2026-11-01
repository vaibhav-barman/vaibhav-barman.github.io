/**
 * Turns the raw resume JSON into the model every view (3D scene, HTML
 * sections, CLI, static fallback, resume page) consumes. Pure: safe to import
 * from vite.config.ts at build time.
 */
import { config } from '../config'
import type { RawPortfolio, RawProject, RawWork } from './types'

export interface Social {
  label: string
  url: string
  icon?: string
  /** lowercase key, e.g. "github", "linkedin" */
  key: string
}

export interface Project {
  /** 1-based position in display order (used by `projects <n>`). */
  index: number
  slug: string
  title: string
  summary: string
  highlights: string[]
  tags: string[]
  category: string
  categoryLabel: string
  featured: boolean
  repoUrl?: string
  liveUrl?: string
  images: { src: string; caption?: string }[]
}

export interface Skill {
  name: string
  slug: string
  level: number
  label: string
  category: string
}

export interface SkillGroup {
  name: string
  slug: string
  skills: Skill[]
}

export interface TimelineEntry {
  kind: 'education' | 'work' | 'volunteer'
  title: string
  org: string
  url?: string
  location?: string
  when: string
  summary?: string
  details: string[]
}

export interface Portfolio {
  name: string
  firstName: string
  handle: string
  role: string
  tagline: string
  status: string
  summary: string
  image?: string
  location?: string
  email?: string
  phone?: string
  website?: string
  baseUrl: string
  socials: Social[]
  github?: Social
  linkedin?: Social
  projects: Project[]
  skills: Skill[]
  skillGroups: SkillGroup[]
  /** Tech tags gathered from all projects (deduped, by frequency). */
  techTags: string[]
  timeline: TimelineEntry[]
  interests: { name: string; summary?: string }[]
  languages: { language: string; fluency?: string }[]
  achievements: { title: string; detail: string }[]
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function socialKey(label: string, url: string): string {
  const l = `${label} ${url}`.toLowerCase()
  for (const k of ['github', 'linkedin', 'twitter', 'x.com', 'youtube', 'mastodon', 'bluesky', 'instagram']) {
    if (l.includes(k)) return k === 'x.com' ? 'twitter' : k
  }
  if (l.includes('website') || l.includes('site')) return 'website'
  return slugify(label)
}

function categoryRank(cat: string): number {
  const i = (config.projectCategories.order as readonly string[]).indexOf(cat)
  return i === -1 ? 99 : i
}

function normalizeProjects(raw: RawProject[] = []): Project[] {
  const seen = new Set<string>()
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
      } satisfies Project,
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

function work(raw: RawWork, kind: 'work' | 'volunteer'): TimelineEntry {
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

export function normalize(raw: RawPortfolio): Portfolio {
  const socials: Social[] = (raw.social_links ?? []).map((s) => ({
    label: s.label,
    url: s.url,
    icon: s.svg_path,
    key: socialKey(s.label, s.url),
  }))

  const skills: Skill[] = (raw.skills ?? []).map((s) => ({
    name: s.name,
    slug: slugify(s.name),
    level: Math.max(0, Math.min(100, s.proficiency ?? 0)),
    label: s.proficiency_label ?? '',
    category: s.category ?? 'Skills',
  }))
  const groupMap = new Map<string, Skill[]>()
  for (const s of skills) groupMap.set(s.category, [...(groupMap.get(s.category) ?? []), s])
  const skillGroups = [...groupMap].map(([name, list]) => ({ name, slug: slugify(name), skills: list }))

  const projects = normalizeProjects(raw.projects)
  const tagCount = new Map<string, number>()
  for (const p of projects) for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
  const techTags = [...tagCount].sort((a, b) => b[1] - a[1]).map(([t]) => t)

  const education: TimelineEntry[] = (raw.education ?? []).map((e) => ({
    kind: 'education',
    title: (e.degrees ?? []).join(', ') || 'Studies',
    org: e.institution,
    url: e.url,
    location: e.location,
    when: [e.start_date, e.graduation_date].filter(Boolean).join(' – '),
    details: [
      ...(e.gpa_cumulative ? [`CGPA ${e.gpa_cumulative}`] : []),
      ...(e.gpa_major ? [`Major GPA ${e.gpa_major}`] : []),
      ...(e.honors ?? []),
    ],
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

  return {
    name: raw.name,
    firstName,
    handle: slugify(firstName),
    role: raw.label,
    tagline: raw.tagline ?? raw.label,
    status: raw.status ?? config.hud.defaultStatus,
    summary: raw.summary,
    image: raw.image_path,
    location: raw.contact.location || undefined,
    email: raw.contact.email || undefined,
    phone: raw.contact.phone || undefined,
    website: raw.contact.website || raw.base_url || undefined,
    baseUrl: (raw.base_url ?? raw.contact.website ?? '').replace(/\/$/, ''),
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
