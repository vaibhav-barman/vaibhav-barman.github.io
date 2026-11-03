import { config } from '../../config.js'
import { blank, heading, link, linkify, pad, run, t } from '../format.js'

export const whoami = {
  name: 'whoami',
  summary: 'who is this?',
  group: 'info',
  run: (_, { data: d }) => [
    [t(d.name, 'bold'), t(` · ${d.primaryRole}`, 'accent')],
    [t(d.tagline)],
    [t('status: ', 'muted'), t(d.status, 'ok')],
    [t('next:   ', 'muted'), run('projects'), t(' · ', 'dim'), run('skills'), t(' · ', 'dim'), run('neofetch'), t(' · ', 'dim'), run('help')],
  ],
}

export const about = {
  name: 'about',
  summary: 'the longer version',
  group: 'info',
  run: (_, { data: d, actions }) => {
    actions.goTo('about')
    const out = [heading('about'), [t(d.summary)], blank]
    if (d.location) out.push([t('location   ', 'muted'), t(d.location)])
    if (d.languages.length) out.push([t('speaks     ', 'muted'), t(d.languages.map((l) => `${l.language} (${l.fluency})`).join(', '))])
    if (d.interests.length) out.push([t('off-screen ', 'muted'), t(d.interests.map((i) => i.name).join(' · '))])
    if (d.achievements.length) out.push([t('medals     ', 'muted'), t(d.achievements.map((a) => a.title).join(' · '), 'accent')])
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

export const neofetch = {
  name: 'neofetch',
  aliases: ['fastfetch'],
  summary: 'system info, portfolio edition',
  group: 'info',
  run: (_, { data: d, actions }) => {
    const user = `${config.terminal.user ?? d.handle}@${config.terminal.host}`
    const featured = d.projects.filter((p) => p.featured).length
    const info = [
      [t(user, 'accent')],
      [t('─'.repeat(user.length), 'dim')],
      [t('Name     ', 'heading'), t(d.name)],
      [t('Role     ', 'heading'), t(d.primaryRole)],
      ...(d.location ? [[t('Location ', 'heading'), t(d.location)]] : []),
      [t('Status   ', 'heading'), t(d.status, 'ok')],
      [t('Stack    ', 'heading'), t(d.skills.slice(0, 5).map((s) => s.name).join(', '))],
      [t('Projects ', 'heading'), t(`${d.projects.length} (${featured} featured)`)],
      [t('Theme    ', 'heading'), t(actions.getTheme())],
      [
        t('Links    ', 'heading'),
        ...d.socials.filter((s) => s.key !== 'website').flatMap((s, i) => [...(i ? [t(' · ', 'dim')] : []), link(s.label, s.url)]),
      ],
      [t('███', 'accent'), t('███', 'bold'), t('███', 'muted'), t('███', 'dim')],
    ]
    if (actions.isNarrow()) return [...LOGO.map((l) => [t(l, 'accent')]), blank, ...info]
    const rows = Math.max(LOGO.length, info.length)
    return Array.from({ length: rows }, (_, i) => [t(pad(LOGO[i] ?? '', 22), 'accent'), ...(info[i] ?? [''])])
  },
}

export const skills = {
  name: 'skills',
  usage: '[group]',
  summary: 'skills by category',
  group: 'info',
  complete: (_, { data }) => data.skillGroups.map((g) => g.slug),
  run: (args, { data: d, actions }) => {
    const q = args.join(' ').toLowerCase()
    const groups = q ? d.skillGroups.filter((g) => g.slug.includes(q) || g.name.toLowerCase().includes(q)) : d.skillGroups
    if (!groups.length) {
      return [
        [
          t(`no skill group matches "${q}". groups: `, 'error'),
          ...d.skillGroups.flatMap((g, i) => [...(i ? [t(', ')] : []), run(g.slug, `skills ${g.slug}`)]),
        ],
      ]
    }
    actions.goTo('skills')
    actions.highlight({ kind: 'skills', group: groups.length === 1 ? groups[0].slug : undefined })
    const out = []
    for (const g of groups) {
      out.push(heading(g.name))
      if (g.note) out.push([t(`  (${g.note})`, 'muted')])
      out.push([
        t('  '),
        ...g.skills.flatMap((s, i) => [...(i ? [t(' · ', 'dim')] : []), t(s.name), ...(s.note ? [t(` (${s.note})`, 'muted')] : [])]),
      ])
      out.push(blank)
    }
    return out
  },
}

function timeline(kind) {
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
      [t('▸ ', 'accent'), t(x.title, 'bold'), t(' @ '), x.url ? link(x.org, x.url) : t(x.org, 'heading')],
      ...(x.when || x.location ? [[t('  ' + [x.when, x.location].filter(Boolean).join(' · '), 'muted')]] : []),
      ...(x.summary ? [[t('  ' + x.summary)]] : []),
      ...x.details.map((y) => [t('  - ' + y)]),
      blank,
    ])
  }
}

export const experience = {
  name: 'experience',
  aliases: ['work'],
  summary: 'work experience',
  group: 'info',
  run: timeline('work'),
}

export const education = {
  name: 'education',
  summary: 'education',
  group: 'info',
  run: timeline('education'),
}

export const contact = {
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
