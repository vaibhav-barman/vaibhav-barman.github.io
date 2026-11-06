import { createSemanticProvider, EMBED_MODEL_LABEL } from '../../ai/ask.js'
import { config } from '../../config.js'
import { theme as themeConfig } from '../../theme.js'
import { resumeMd } from '../../data/text.js'
import { blank, heading, link, pad, run, t } from '../format.js'

const GROUP_TITLES = { info: 'about me', navigate: 'projects & links', system: 'shell', fun: 'extras' }

export const help = {
  name: 'help',
  aliases: ['?', 'man'],
  summary: 'list all commands',
  group: 'system',
  run: (_, { registry, actions }) => {
    const narrow = actions.isNarrow()
    const out = []
    for (const g of Object.keys(GROUP_TITLES)) {
      const cmds = registry.list().filter((c) => !c.hidden && (c.group ?? 'system') === g)
      if (!cmds.length) continue
      out.push(heading(GROUP_TITLES[g]))
      for (const c of cmds) {
        const sig = c.usage ? `${c.name} ${c.usage}` : c.name
        if (narrow) out.push([run(c.name), t(c.usage ? ` ${c.usage}` : '', 'dim'), t(`  ${c.summary}`, 'muted')])
        else out.push([run(c.name), t(pad(sig, 30).slice(c.name.length), 'dim'), t(c.summary, 'muted')])
      }
      out.push(blank)
    }
    out.push([
      t('keys: ', 'muted'),
      t('↑/↓ history · Tab complete · Ctrl+L clear · ', 'dim'),
      t(config.terminal.focusKey, 'accent'),
      t(' focus terminal', 'dim'),
    ])
    return out
  },
}

export const clear = {
  name: 'clear',
  aliases: ['cls'],
  summary: 'clear the screen',
  group: 'system',
  run: (_, { actions }) => actions.clear(),
}

export const history = {
  name: 'history',
  summary: 'command history',
  group: 'system',
  run: (_, { history }) => history.map((h, i) => [t(String(i + 1).padStart(4) + '  ', 'muted'), run(h)]),
}

export const theme = {
  name: 'theme',
  usage: `<${Object.keys(themeConfig.presets).join('|')}>`,
  summary: 'switch the accent colour (UI + 3D)',
  group: 'system',
  complete: () => [...Object.keys(themeConfig.presets), 'reset'],
  run: (args, { actions }) => {
    const names = Object.keys(themeConfig.presets)
    const want = args[0]?.toLowerCase()
    if (!want) {
      return [
        [t('current: ', 'muted'), t(actions.getTheme(), 'accent')],
        [t('available: ', 'muted'), ...[...names, 'reset'].flatMap((n, i) => [...(i ? [t(' · ', 'dim')] : []), run(n, `theme ${n}`)])],
      ]
    }
    if (want === 'reset') {
      actions.setTheme(null)
      return [[t('theme → ', 'muted'), t('default', 'accent')]]
    }
    if (!names.includes(want)) return [[t(`unknown theme "${want}". try: ${names.join(', ')}`, 'error')]]
    actions.setTheme(want)
    return [[t('theme → ', 'muted'), t(want, 'accent')]]
  },
}

export const threeD = {
  name: '3d',
  usage: '<on|off>',
  summary: 'toggle the 3D scene',
  group: 'system',
  complete: () => ['on', 'off'],
  run: (args, { actions }) => {
    const { enabled, available } = actions.get3D()
    const want = args[0]?.toLowerCase()
    if (!available) return [[t('3D is not available here (no WebGL or reduced motion); showing the static background.', 'muted')]]
    if (!want) return [[t('3d: ', 'muted'), t(enabled ? 'on' : 'off', 'accent'), t('  (', 'muted'), run(enabled ? '3d off' : '3d on'), t(')', 'muted')]]
    if (want !== 'on' && want !== 'off') return [[t('usage: 3d <on|off>', 'error')]]
    actions.set3D(want === 'on')
    return [[t(`3d scene ${want === 'on' ? 'enabled' : 'disabled'}`, 'ok')]]
  },
}

export const resume = {
  name: 'resume',
  aliases: ['cv'],
  usage: '[--md]',
  summary: 'open the printable resume (or --md download)',
  group: 'info',
  complete: () => ['--md'],
  run: (args, { data, actions }) => {
    if (args.includes('--md')) {
      const name = `${data.name.replace(/\s+/g, '-')}-resume.md`
      actions.download(name, resumeMd(data), 'text/markdown')
      return [[t('downloaded ', 'muted'), t(name, 'accent')]]
    }
    actions.openUrl('/resume.html')
    return [
      [t('opening the resume page: use ', 'muted'), t('"Save as PDF"', 'accent'), t(' there to download it.', 'muted')],
      [t('page: ', 'muted'), link('/resume.html', '/resume.html'), t('  ·  markdown: ', 'muted'), run('resume --md')],
    ]
  },
}

function socialCommand(name, label) {
  return {
    name,
    summary: `open my ${label}`,
    group: 'navigate',
    run: (_, { data, actions }) => {
      const s = data[name]
      if (!s) return [[t(`no ${name} link in portfolio.json`, 'error')]]
      actions.openUrl(s.url)
      return [[t('opening ', 'muted'), link(s.url, s.url)]]
    },
  }
}
export const github = socialCommand('github', 'GitHub')
export const linkedin = socialCommand('linkedin', 'LinkedIn')

export const exit = {
  name: 'exit',
  aliases: ['quit', 'logout'],
  summary: 'leave the terminal (focus returns to the page)',
  group: 'system',
  run: (_, { actions }) => {
    actions.closeTerminal()
    return [[t('bye 👋 (press ', 'muted'), t(config.terminal.focusKey, 'accent'), t(' to come back)', 'muted')]]
  },
}

export const echo = {
  name: 'echo',
  summary: 'print text',
  group: 'system',
  hidden: true,
  run: (args) => [[t(args.join(' '))]],
}

let provider
const askProvider = (data, actions) => (provider ??= createSemanticProvider(data, { loadEmbedder: actions.loadEmbedder }))

/** Called by the terminal as soon as someone types "ask ", so the model is warm by the time they press Enter. */
export function warmAsk({ data, actions }) {
  askProvider(data, actions).warm()
}

export const ask = {
  name: 'ask',
  usage: '<question>',
  summary: 'ask my portfolio (semantic search, runs in your browser)',
  group: 'info',
  /** Shown while a slow answer is on its way (the first one loads the model). */
  pending: () => (provider?.loaded ? 'searching…' : `searching… the first question loads a small embedding model (~23 MB, ${EMBED_MODEL_LABEL}), cached afterwards`),
  run: async (args, { data, actions }) => {
    if (!args.length) return [[t('usage: ask <question>   e.g. ', 'muted'), run('ask which projects run on local models')]]
    const a = await askProvider(data, actions).ask(args.join(' '))
    return [
      [t('» ', 'accent'), t(a.text)],
      ...(a.evidence ? [[t('  evidence: ', 'muted'), t(`“${a.evidence}”`)]] : []),
      ...(a.sources.length ? [[t(`  sources: ${a.sources.join(', ')}`, 'dim')]] : []),
      ...(a.via === 'semantic' ? [[t(`  via semantic search (${EMBED_MODEL_LABEL}, on your device)`, 'dim')]] : []),
      ...(a.note ? [[t(`  note: ${a.note}`, 'dim')]] : []),
    ]
  },
}
