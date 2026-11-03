import { suggest } from '../engine.js'
import { blank, heading, link, pad, run, t } from '../format.js'

export function findProject(d, query) {
  const q = query.toLowerCase().trim()
  if (!q) return undefined
  if (/^\d+$/.test(q)) return d.projects.find((p) => p.index === Number(q))
  return (
    d.projects.find((p) => p.slug === q) ??
    d.projects.find((p) => p.title.toLowerCase() === q) ??
    d.projects.find((p) => p.slug.startsWith(q) || p.title.toLowerCase().includes(q))
  )
}

function details(p) {
  return [
    heading(`${String(p.index).padStart(2, '0')} · ${p.title}`),
    [t(`[${p.categoryLabel}]`, 'heading'), ...(p.featured ? [t(' ★ featured', 'accent')] : [])],
    [t(p.summary)],
    ...(p.highlights.length ? [blank, ...p.highlights.map((h) => [t('  ▹ ', 'accent'), t(h)])] : []),
    ...(p.tags.length ? [blank, [t('stack  ', 'muted'), t(p.tags.join(' · '))]] : []),
    ...(p.repoUrl ? [[t('repo   ', 'muted'), link(p.repoUrl.replace(/^https?:\/\//, ''), p.repoUrl)]] : []),
    ...(p.liveUrl ? [[t('live   ', 'muted'), link(p.liveUrl.replace(/^https?:\/\//, ''), p.liveUrl)]] : []),
    [
      t('try    ', 'muted'),
      ...(p.repoUrl ? [run(`open ${p.slug} --repo`)] : []),
      ...(p.liveUrl ? [t('  '), run(`open ${p.slug} --live`)] : []),
      t('  '),
      run('projects'),
    ],
  ]
}

function notFound(query, ctx) {
  const guess = suggest(query, ctx.data.projects.map((p) => p.slug))
  return [
    [t(`no project matches "${query}".`, 'error'), ...(guess ? [t(' did you mean '), run(guess, `open ${guess}`), t('?')] : [])],
    [t('see ', 'muted'), run('projects'), t(' for the list', 'muted')],
  ]
}

function show(p, ctx) {
  ctx.actions.goTo('projects')
  ctx.actions.focusProject(p.slug)
  ctx.actions.highlight({ kind: 'projects', slug: p.slug })
  return details(p)
}

export const projects = {
  name: 'projects',
  aliases: ['ls-projects'],
  usage: '[n]',
  summary: 'list projects, or show one',
  group: 'navigate',
  complete: (_, { data }) => data.projects.map((p) => String(p.index)),
  run: (args, ctx) => {
    const { data: d, actions } = ctx
    if (args[0]) {
      const p = findProject(d, args.join(' '))
      return p ? show(p, ctx) : notFound(args.join(' '), ctx)
    }
    actions.goTo('projects')
    actions.focusProject(null)
    actions.highlight({ kind: 'projects' })
    const narrow = actions.isNarrow()
    const w = Math.max(...d.projects.map((p) => p.title.length)) + 2
    return [
      heading(`projects (${d.projects.length})`),
      ...d.projects.map((p) => [
        t(String(p.index).padStart(2, '0') + ' ', 'muted'),
        t(p.featured ? '★ ' : '  ', 'accent'),
        run(narrow ? p.title : pad(p.title, w), `projects ${p.index}`),
        ...(narrow ? [] : [t(p.categoryLabel, 'heading')]),
      ]),
      blank,
      [
        t('details: ', 'muted'),
        run('projects 1'),
        t(' or ', 'muted'),
        run(`open ${d.projects[0]?.slug ?? ''}`),
        t('  ·  links: ', 'muted'),
        t('open <n> --repo | --live', 'dim'),
      ],
    ]
  },
}

export const open = {
  name: 'open',
  usage: '<n|name> [--repo|--live]',
  summary: 'show a project, or open its links',
  group: 'navigate',
  complete: (args, { data }) => {
    if (args.length >= 2) return ['--repo', '--live']
    return [...data.projects.map((p) => p.slug), ...data.socials.map((s) => s.key)]
  },
  run: (args, ctx) => {
    const flags = args.filter((a) => a.startsWith('--'))
    const query = args.filter((a) => !a.startsWith('--')).join(' ')
    if (!query) return [[t('usage: open <n|name> [--repo|--live]', 'muted')], [t('e.g.  ', 'muted'), run('open 1 --repo')]]

    const social = ctx.data.socials.find((s) => s.key === query.toLowerCase() || s.label.toLowerCase() === query.toLowerCase())
    const p = findProject(ctx.data, query)
    if (!p && social) {
      ctx.actions.openUrl(social.url)
      return [[t('opening ', 'muted'), link(social.url, social.url)]]
    }
    if (!p) return notFound(query, ctx)

    if (flags.includes('--repo') || flags.includes('--live')) {
      const live = flags.includes('--live')
      const url = live ? p.liveUrl : p.repoUrl
      if (!url) return [[t(`${p.title} has no ${live ? 'live demo' : 'repository'} link yet.`, 'error')]]
      ctx.actions.focusProject(p.slug)
      ctx.actions.openUrl(url)
      return [[t('opening ', 'muted'), link(url, url), t(' in a new tab', 'muted')]]
    }
    return show(p, ctx)
  },
}
