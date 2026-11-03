import { describe, expect, it, vi } from 'vitest'
import raw from '../portfolio.json'
import { normalize } from '../src/data/normalize.js'
import { registry } from '../src/cli/commands/index.js'
import { complete, execute, suggest, tokenize } from '../src/cli/engine.js'
import { toText as text } from '../src/cli/format.js'
import { VFS } from '../src/cli/vfs.js'

const data = normalize(raw)

function makeCtx(overrides = {}) {
  let cwd = '~'
  const actions = {
    setTheme: vi.fn(),
    getTheme: () => 'green',
    set3D: vi.fn(),
    get3D: () => ({ enabled: true, available: true }),
    goTo: vi.fn(),
    highlight: vi.fn(),
    focusProject: vi.fn(),
    openUrl: vi.fn(),
    download: vi.fn(),
    clear: vi.fn(),
    closeTerminal: vi.fn(),
    isNarrow: () => false,
    ...overrides,
  }
  return {
    data,
    fs: new VFS(data),
    get cwd() {
      return cwd
    },
    setCwd: (p) => (cwd = p),
    history: [],
    actions,
    registry,
  }
}

describe('engine', () => {
  it('tokenizes quotes', () => {
    expect(tokenize(`open "gitcommit ai" --repo`)).toEqual(['open', 'gitcommit ai', '--repo'])
  })

  it('suggests close commands', () => {
    expect(suggest('projetcs', registry.names())).toBe('projects')
    expect(suggest('xyzzy', registry.names())).toBeUndefined()
  })

  it('reports unknown commands with a suggestion', async () => {
    const out = text(await execute('skils', makeCtx()))
    expect(out).toContain('command not found: skils')
    expect(out).toContain('did you mean skills')
  })

  it('every command runs without throwing', async () => {
    for (const c of registry.list()) {
      const out = await execute(c.name, makeCtx())
      expect(text(out)).not.toMatch(/^\w+: .*Error/)
    }
  })

  it('has all the classic commands', () => {
    for (const name of ['help', 'whoami', 'neofetch', 'projects', 'skills', 'experience', 'education', 'contact', 'resume', 'ls', 'cd', 'cat', 'theme', 'sudo', 'history', 'clear']) {
      expect(registry.get(name), name).toBeDefined()
    }
  })

  it('identifies social links by host, not substrings', () => {
    expect(data.github?.url).toContain('github.com')
    expect(data.socials.find((s) => s.url.includes('github.io'))?.key).toBe('website')
  })

  it('whoami and neofetch use JSON content', async () => {
    expect(text(await execute('whoami', makeCtx()))).toContain(data.name)
    expect(text(await execute('neofetch', makeCtx()))).toContain(data.status)
  })

  it('skills prints every skill and no percentages', async () => {
    const out = text(await execute('skills', makeCtx()))
    for (const s of data.skills) expect(out).toContain(s.name)
    expect(out).not.toMatch(/\d+%/)
  })

  it('projects <n> focuses the project', async () => {
    const ctx = makeCtx()
    const out = text(await execute('projects 1', ctx))
    expect(out).toContain(data.projects[0].title)
    expect(ctx.actions.goTo).toHaveBeenCalledWith('projects')
    expect(ctx.actions.focusProject).toHaveBeenCalledWith(data.projects[0].slug)
  })

  it('open <slug> --repo opens the repository', async () => {
    const ctx = makeCtx()
    await execute(`open ${data.projects[0].slug} --repo`, ctx)
    expect(ctx.actions.openUrl).toHaveBeenCalledWith(data.projects[0].repoUrl)
  })

  it('open suggests on typos', async () => {
    expect(text(await execute('open gitcomit-ai', makeCtx()))).toContain('did you mean')
  })

  it('theme validates names', async () => {
    const ctx = makeCtx()
    await execute('theme blue', ctx)
    expect(ctx.actions.setTheme).toHaveBeenCalledWith('blue')
    expect(text(await execute('theme pink', ctx))).toContain('unknown theme')
  })

  it('virtual filesystem: ls, cd, cat', async () => {
    const ctx = makeCtx()
    expect(text(await execute('ls', ctx))).toContain('projects/')
    await execute('cd projects', ctx)
    expect(ctx.cwd).toBe('~/projects')
    expect(text(await execute('ls', ctx))).toContain(`${data.projects[0].slug}.md`)
    expect(text(await execute(`cat ${data.projects[0].slug}.md`, ctx))).toContain(data.projects[0].summary)
    expect(text(await execute('cat ../about.md', ctx))).toContain(data.summary)
    expect(text(await execute('cd nope', ctx))).toContain('no such file')
  })

  it('completes command names and arguments', () => {
    const ctx = makeCtx()
    expect(complete('neo', ctx).value).toBe('neofetch ')
    expect(complete('theme bl', ctx).value).toBe('theme blue ')
    expect(complete('cat proj', ctx).value).toBe('cat projects/')
    expect(complete('s', ctx).options).toEqual(expect.arrayContaining(['skills', 'sudo']))
  })

  it('sudo hire-me grants access', async () => {
    expect(text(await execute('sudo hire-me', makeCtx()))).toContain('ACCESS GRANTED')
  })

  it('ask answers from the JSON', async () => {
    expect(text(await execute('ask where do you study', makeCtx()))).toMatch(/BITS/)
  })
})
