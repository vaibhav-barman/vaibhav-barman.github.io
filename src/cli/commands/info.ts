import { config } from '../../config'
import { bar, blank, heading, link, linkify, pad, run, t } from '../format'
import type { Command, Line } from '../types'

export const whoami: Command = {
  name: 'whoami',
  summary: 'who is this?',
  group: 'info',
  run: (_, { data: d }) => [
    [t(d.name, 'bold'), t(` · ${d.role.split('|')[0].trim()}`, 'accent')],
    [t(d.tagline)],
    [t('status: ', 'muted'), t(d.status, 'ok')],
    [t('more: ', 'muted'), run('about'), t(' · ', 'dim'), run('projects'), t(' · ', 'dim'), run('neofetch')],
  ],
}

export const about: Command = {
  name: 'about',
  summary: 'the longer version',
  group: 'info',
  run: (_, { data: d, actions }) => {
    actions.goTo('about')
    const out: Line[] = [heading('about'), [t(d.summary)], blank]
    if (d.location) out.push([t('location  ', 'muted'), t(d.location)])
    if (d.languages.length) out.push([t('speaks    ', 'muted'), t(d.languages.map((l) => `${l.language} (${l.fluency})`).join(', '))])
    if (d.interests.length) out.push([t('off-screen', 'muted'), t(' ' + d.interests.map((i) => i.name).join(' · '))])
    if (d.achievements.length) out.push([t('medals    ', 'muted'), t(' ' + d.achievements.map((a) => a.title).join(' · '), 'accent2')])
    return out
  },
}

const LOGO = [
  '      o-----o      ',
  '     / \\   / \\     ',
  '    o---o-o---o    ',
  '   / \\ / | \\ / \\   ',
  '  o---o--+--o---o  ',
  '   \\ / \\ | / \\ /   ',
  '    o---o-o---o    ',
  '     \\ /   \\ /     ',
  '      o-----o      ',
]

export const neofetch: Command = {
  name: 'neofetch',
  aliases: ['fastfetch'],
  summary: 'system info, portfolio edition',
  group: 'info',
  run: (_, { data: d, actions }) => {
    const user = `${config.terminal.user ?? d.handle}@${config.terminal.host}`
    const featured = d.projects.filter((p) => p.featured).length
    const info: Line[] = [
      [t(user, 'accent')],
      [t('─'.repeat(user.length), 'dim')],
      [t('Name     ', 'accent2'), t(d.name)],
      [t('Role     ', 'accent2'), t(d.role.split('|')[0].trim())],
      ...(d.location ? [[t('Location ', 'accent2'), t(d.location)]] : []),
      [t('Status   ', 'accent2'), t(d.status, 'ok')],
      [t('Stack    ', 'accent2'), t(d.techTags.slice(0, 5).join(', '))],
      [t('Projects ', 'accent2'), t(`${d.projects.length} (${featured} featured)`)],
      [t('Theme    ', 'accent2'), t(actions.getTheme())],
      [
        t('Links    ', 'accent2'),
        ...d.socials
          .filter((s) => s.key !== 'website')
          .flatMap((s, i) => [...(i ? [t(' · ', 'dim')] : []), link(s.label, s.url)]),
      ],
      [t('███', 'accent'), t('███', 'accent2'), t('███', 'hot'), t('███', 'ok'), t('███', 'muted')],
    ]
    if (actions.isNarrow()) return [...LOGO.map((l) => [t(l, 'accent')]), blank, ...info]
    const rows = Math.max(LOGO.length, info.length)
    return Array.from({ length: rows }, (_, i) => [t(pad(LOGO[i] ?? '', 22), 'accent'), ...(info[i] ?? [''])])
  },
}

export const skills: Command = {
  name: 'skills',
  usage: '[group]',
  summary: 'skills by category (highlights the 3D graph)',
  group: 'info',
  complete: (_, { data }) => data.skillGroups.map((g) => g.slug),
  run: (args, { data: d, actions }) => {
    const q = args.join(' ').toLowerCase()
    const groups = q ? d.skillGroups.filter((g) => g.slug.includes(q) || g.name.toLowerCase().includes(q)) : d.skillGroups
    if (!groups.length) {
      return [[t(`no skill group matches "${q}". groups: `, 'error'), ...d.skillGroups.flatMap((g, i) => [...(i ? [t(', ')] : []), run(g.slug, `skills ${g.slug}`)])]]
    }
    actions.goTo('skills')
    actions.highlight({ kind: 'skills', group: groups.length === 1 ? groups[0].slug : undefined })
    const narrow = actions.isNarrow()
    const width = Math.min(34, Math.max(...d.skills.map((s) => s.name.length)) + 2)
    const out: Line[] = []
    for (const g of groups) {
      out.push(heading(g.name))
      for (const s of g.skills) {
        if (narrow) {
          out.push([t(s.name)])
          out.push([t('  ' + bar(s.level, 14), 'accent'), t(` ${s.level}%`, 'muted')])
        } else {
          out.push([t(pad(s.name, width)), t(bar(s.level), 'accent'), t(` ${String(s.level).padStart(3)}%`, 'muted')])
        }
      }
      out.push(blank)
    }
    if (d.techTags.length && !q) out.push([t('also used: ', 'muted'), t(d.techTags.join(' · '), 'dim')])
    return out
  },
}

function timeline(kind: 'work' | 'education'): Command['run'] {
  return (_, { data: d, actions }) => {
    actions.goTo('journey')
    actions.highlight({ kind: 'journey' })
    const items = d.timeline.filter((x) => (kind === 'work' ? x.kind !== 'education' : x.kind === 'education'))
    if (!items.length) {
      return kind === 'work'
        ? [
            [t('No professional roles listed yet.', 'muted')],
            [t('status: ', 'muted'), t(d.status, 'ok'), t(': looking for the first one. try ', 'muted'), run('sudo hire-me')],
          ]
        : [[t('No education listed.', 'muted')]]
    }
    return items.flatMap((x) => [
      [t('▸ ', 'accent'), t(x.title, 'bold'), t(' @ '), x.url ? link(x.org, x.url) : t(x.org, 'accent2')],
      ...(x.when || x.location ? [[t('  ' + [x.when, x.location].filter(Boolean).join(' · '), 'muted')]] : []),
      ...(x.summary ? [[t('  ' + x.summary)]] : []),
      ...x.details.map((y) => [t('  - ' + y)]),
      blank,
    ])
  }
}

export const experience: Command = {
  name: 'experience',
  aliases: ['work'],
  summary: 'work experience',
  group: 'info',
  run: timeline('work'),
}

export const education: Command = {
  name: 'education',
  summary: 'education',
  group: 'info',
  run: timeline('education'),
}

export const contact: Command = {
  name: 'contact',
  summary: 'email and social links',
  group: 'info',
  run: (_, { data: d, actions }) => {
    actions.goTo('contact')
    return [
      ...(d.email ? [[t('email     ', 'muted'), link(d.email, `mailto:${d.email}`)]] : []),
      ...(d.phone ? [[t('phone     ', 'muted'), ...linkify(d.phone)]] : []),
      ...d.socials.map((s) => [t(pad(s.label.toLowerCase(), 10), 'muted'), link(s.url.replace(/^https?:\/\//, ''), s.url)]),
      [t('resume    ', 'muted'), run('resume')],
    ]
  },
}
