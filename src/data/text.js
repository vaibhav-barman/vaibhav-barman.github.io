/**
 * Plain-text / Markdown renderings of the portfolio. Shared by the terminal's
 * virtual filesystem (`cat`), the `resume --md` download and `ask`.
 */

export function aboutMd(d) {
  const lines = [`# ${d.name}`, `> ${d.role}`, '', d.summary, '', ...(d.location ? [`Location: ${d.location}`] : []), `Status:   ${d.status}`]
  if (d.languages.length) lines.push(`Speaks:   ${d.languages.map((l) => `${l.language} (${l.fluency})`).join(', ')}`)
  return lines.join('\n')
}

export function projectMd(p) {
  return [
    `# ${p.title}`,
    `[${p.categoryLabel}]${p.featured ? ' ★ featured' : ''}${p.shippedLabel ? ` · shipped ${p.shippedLabel}` : ''}`,
    '',
    p.summary,
    '',
    ...(p.facts.length ? [p.facts.map((f) => `${f.value} ${f.label}`).join(' · '), ''] : []),
    ...(p.pipeline ? [`How it works: ${p.pipeline.nodes.join(' → ')}${p.pipeline.loop ? ` (loops ${p.pipeline.nodes[p.pipeline.loop.from]} → ${p.pipeline.nodes[p.pipeline.loop.to]}: ${p.pipeline.loop.label})` : ''}`, ''] : []),
    ...(p.highlights.length ? ['## Highlights', ...p.highlights.map((h) => `- ${h}`), ''] : []),
    ...(p.tags.length ? [`Stack: ${p.tags.join(', ')}`] : []),
    ...(p.repoUrl ? [`Repo:  ${p.repoUrl}`] : []),
    ...(p.liveUrl ? [`Live:  ${p.liveUrl}`] : []),
  ].join('\n')
}

const skillName = (s) => (s.note ? `${s.name} (${s.note})` : s.name)

export function skillsTxt(d) {
  return d.skillGroups
    .map((g) => [`## ${g.name}${g.note ? ` (${g.note})` : ''}`, ...g.skills.map((s) => `- ${skillName(s)}`)].join('\n'))
    .join('\n\n')
}

export function timelineMd(d, kind) {
  const items = kind === 'work' ? d.roles : d.education
  if (!items.length) return kind === 'work' ? `No roles listed yet. Status: ${d.status}.` : 'No education listed.'
  return items
    .map((x) =>
      [`## ${x.title} · ${x.org}`, [x.when, x.location].filter(Boolean).join(' · '), x.summary ?? '', ...x.details.map((y) => `- ${y}`)]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

export function contactTxt(d) {
  return [
    ...(d.email ? [`email:    ${d.email}`] : []),
    ...(d.phone ? [`phone:    ${d.phone}`] : []),
    ...(d.location ? [`location: ${d.location}`] : []),
    ...d.socials.map((s) => `${s.label.toLowerCase().padEnd(9)} ${s.url}`),
  ].join('\n')
}

export function interestsMd(d) {
  return [
    ...(d.focusAreas.length ? ['## Focus areas', ...d.focusAreas.map((i) => `- ${i.name}${i.summary ? `: ${i.summary}` : ''}`), '', '## Off-screen'] : []),
    ...d.interests.map((i) => `- ${i.name}${i.summary ? `: ${i.summary}` : ''}`),
    ...(d.achievements.length ? ['', '## Achievements', ...d.achievements.map((a) => `- ${a.title} (${a.detail})`)] : []),
  ].join('\n')
}

export function resumeMd(d) {
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
