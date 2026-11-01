/**
 * Plain-text / Markdown renderings of the portfolio. Shared by the CLI's
 * virtual filesystem (`cat`), the `resume --md` download and the ask engine.
 */
import type { Portfolio, Project } from './normalize'

export function aboutMd(d: Portfolio): string {
  const lines = [
    `# ${d.name}`,
    `> ${d.role}`,
    '',
    d.summary,
    '',
    ...(d.location ? [`Location: ${d.location}`] : []),
    `Status:   ${d.status}`,
  ]
  if (d.languages.length) lines.push(`Speaks:   ${d.languages.map((l) => `${l.language} (${l.fluency})`).join(', ')}`)
  return lines.join('\n')
}

export function projectMd(p: Project): string {
  return [
    `# ${p.title}`,
    `[${p.categoryLabel}]${p.featured ? ' ★ featured' : ''}`,
    '',
    p.summary,
    '',
    ...(p.highlights.length ? ['## Highlights', ...p.highlights.map((h) => `- ${h}`), ''] : []),
    ...(p.tags.length ? [`Stack: ${p.tags.join(', ')}`] : []),
    ...(p.repoUrl ? [`Repo:  ${p.repoUrl}`] : []),
    ...(p.liveUrl ? [`Live:  ${p.liveUrl}`] : []),
  ].join('\n')
}

export function skillsTxt(d: Portfolio): string {
  return d.skillGroups
    .map((g) => [`## ${g.name}`, ...g.skills.map((s) => `- ${s.name} (${s.level}%)`)].join('\n'))
    .join('\n\n')
}

export function timelineMd(d: Portfolio, kind: 'education' | 'work'): string {
  const items = d.timeline.filter((t) => (kind === 'work' ? t.kind !== 'education' : t.kind === 'education'))
  if (!items.length) return kind === 'work' ? `No roles listed yet. Status: ${d.status}.` : 'No education listed.'
  return items
    .map((t) =>
      [`## ${t.title} · ${t.org}`, [t.when, t.location].filter(Boolean).join(' · '), t.summary ?? '', ...t.details.map((x) => `- ${x}`)]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

export function contactTxt(d: Portfolio): string {
  return [
    ...(d.email ? [`email:    ${d.email}`] : []),
    ...(d.phone ? [`phone:    ${d.phone}`] : []),
    ...(d.location ? [`location: ${d.location}`] : []),
    ...d.socials.map((s) => `${s.label.toLowerCase().padEnd(9)} ${s.url}`),
  ].join('\n')
}

export function interestsMd(d: Portfolio): string {
  return [
    ...d.interests.map((i) => `- ${i.name}${i.summary ? `: ${i.summary}` : ''}`),
    ...(d.achievements.length ? ['', '## Achievements', ...d.achievements.map((a) => `- ${a.title} (${a.detail})`)] : []),
  ].join('\n')
}

export function resumeMd(d: Portfolio): string {
  return [
    aboutMd(d),
    '',
    '## Contact',
    contactTxt(d),
    '',
    '# Projects',
    ...d.projects.map((p) => projectMd(p).replace(/^# /, '## ') + '\n'),
    '# Skills',
    skillsTxt(d),
    '',
    '# Experience',
    timelineMd(d, 'work'),
    '',
    '# Education',
    timelineMd(d, 'education'),
    '',
    '# Interests',
    interestsMd(d),
    '',
  ].join('\n')
}
