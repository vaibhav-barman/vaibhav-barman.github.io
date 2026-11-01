import { createOfflineProvider, type AskProvider } from '../../ai/ask'
import { config, type ThemeName } from '../../config'
import { resumeMd } from '../../data/text'
import { blank, heading, link, pad, run, t } from '../format'
import type { Command, Line } from '../types'

const GROUP_TITLES = { info: 'about me', navigate: 'projects & navigation', system: 'shell', fun: 'extras' } as const

export const help: Command = {
  name: 'help',
  aliases: ['?', 'man'],
  summary: 'list all commands',
  group: 'system',
  run: (_, { registry, actions }) => {
    const narrow = actions.isNarrow()
    const out: Line[] = []
    for (const g of Object.keys(GROUP_TITLES) as (keyof typeof GROUP_TITLES)[]) {
      const cmds = registry.list().filter((c) => !c.hidden && (c.group ?? 'system') === g)
      if (!cmds.length) continue
      out.push(heading(GROUP_TITLES[g]))
      for (const c of cmds) {
        const sig = c.usage ? `${c.name} ${c.usage}` : c.name
        if (narrow) out.push([run(c.name), t(c.usage ? ` ${c.usage}` : '', 'dim'), t(`  ${c.summary}`, 'muted')])
        else out.push([run(c.name), t(pad(sig, 34).slice(c.name.length), 'dim'), t(c.summary, 'muted')])
      }
      out.push(blank)
    }
    out.push([t('keys: ', 'muted'), t('↑/↓ history · Tab complete · Ctrl+L clear · ', 'dim'), t(config.terminal.toggleKey, 'accent'), t(' toggle terminal', 'dim')])
    return out
  },
}

export const clear: Command = {
  name: 'clear',
  aliases: ['cls'],
  summary: 'clear the screen',
  group: 'system',
  run: (_, { actions }) => actions.clear(),
}

export const history: Command = {
  name: 'history',
  summary: 'command history',
  group: 'system',
  run: (_, { history }) => history.map((h, i) => [t(String(i + 1).padStart(4) + '  ', 'muted'), run(h)]),
}

export const theme: Command = {
  name: 'theme',
  usage: '<cyan|violet|matrix>',
  summary: 'switch the accent color (UI + 3D)',
  group: 'system',
  complete: () => Object.keys(config.themes),
  run: (args, { actions }) => {
    const names = Object.keys(config.themes) as ThemeName[]
    const want = args[0]?.toLowerCase()
    if (!want) {
      return [
        [t('current: ', 'muted'), t(actions.getTheme(), 'accent')],
        [t('available: ', 'muted'), ...names.flatMap((n, i) => [...(i ? [t(' · ', 'dim')] : []), run(n, `theme ${n}`)])],
      ]
    }
    if (!names.includes(want as ThemeName)) return [[t(`unknown theme "${want}". try: ${names.join(', ')}`, 'error')]]
    actions.setTheme(want as ThemeName)
    return [[t('theme → ', 'muted'), t(want, 'accent')]]
  },
}

export const threeD: Command = {
  name: '3d',
  usage: '<on|off>',
  summary: 'toggle the 3D scene',
  group: 'system',
  complete: () => ['on', 'off'],
  run: (args, { actions }) => {
    const { enabled, available } = actions.get3D()
    const want = args[0]?.toLowerCase()
    if (!available) return [[t('WebGL is not available here; showing the static background instead.', 'muted')]]
    if (!want) return [[t('3d: ', 'muted'), t(enabled ? 'on' : 'off', 'accent'), t('  (', 'muted'), run(enabled ? '3d off' : '3d on'), t(')', 'muted')]]
    if (want !== 'on' && want !== 'off') return [[t('usage: 3d <on|off>', 'error')]]
    actions.set3D(want === 'on')
    return [[t(`3d scene ${want === 'on' ? 'enabled' : 'disabled'}`, 'ok')]]
  },
}

export const resume: Command = {
  name: 'resume',
  aliases: ['cv'],
  usage: '[--md]',
  summary: 'download the resume (PDF via print, or Markdown)',
  group: 'info',
  complete: () => ['--md'],
  run: (args, { data, actions }) => {
    if (args.includes('--md')) {
      const name = `${data.name.replace(/\s+/g, '-')}-resume.md`
      actions.download(name, resumeMd(data), 'text/markdown')
      return [[t('downloaded ', 'muted'), t(name, 'accent')]]
    }
    actions.openUrl('/resume.html?print=1')
    return [
      [t('opening printable resume: choose ', 'muted'), t('"Save as PDF"', 'accent'), t(' in the print dialog.', 'muted')],
      [t('page: ', 'muted'), link('/resume.html', '/resume.html'), t('  ·  markdown: ', 'muted'), run('resume --md')],
    ]
  },
}

function socialCommand(name: 'github' | 'linkedin'): Command {
  return {
    name,
    summary: `open my ${name === 'github' ? 'GitHub' : 'LinkedIn'}`,
    group: 'navigate',
    run: (_, { data, actions }) => {
      const s = data[name]
      if (!s) return [[t(`no ${name} link in portfolio.json`, 'error')]]
      actions.openUrl(s.url)
      return [[t('opening ', 'muted'), link(s.url, s.url)]]
    },
  }
}
export const github = socialCommand('github')
export const linkedin = socialCommand('linkedin')

export const exit: Command = {
  name: 'exit',
  aliases: ['quit', 'logout'],
  summary: 'close the terminal overlay',
  group: 'system',
  run: (_, { actions }) => {
    actions.closeTerminal()
    return [[t('bye 👋 (press ', 'muted'), t(config.terminal.toggleKey, 'accent'), t(' to come back)', 'muted')]]
  },
}

export const echo: Command = {
  name: 'echo',
  summary: 'print text',
  group: 'system',
  hidden: true,
  run: (args) => [[t(args.join(' '))]],
}

let provider: AskProvider | undefined
export const ask: Command = {
  name: 'ask',
  usage: '<question>',
  summary: 'ask my portfolio a question',
  group: 'info',
  run: async (args, { data }) => {
    if (!args.length) return [[t('usage: ask <question>   e.g. ', 'muted'), run('ask what agentic projects have you built')]]
    provider ??= createOfflineProvider(data)
    const a = await provider.ask(args.join(' '))
    return [[t('» ', 'accent'), t(a.text)], ...(a.sources.length ? [[t(`  sources: ${a.sources.join(', ')}`, 'dim')]] : [])]
  },
}
