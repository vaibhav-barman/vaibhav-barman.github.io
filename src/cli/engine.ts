/**
 * Terminal engine: tokenising, command lookup, "did you mean", tab completion.
 * UI-agnostic so it can be unit-tested without a DOM.
 */
import { run, t } from './format'
import type { Command, CommandContext, Line, Registry } from './types'

export function createRegistry(commands: Command[]): Registry {
  const byName = new Map<string, Command>()
  for (const c of commands) {
    for (const n of [c.name, ...(c.aliases ?? [])]) {
      if (byName.has(n)) throw new Error(`Duplicate command name: ${n}`)
      byName.set(n, c)
    }
  }
  return {
    list: () => commands,
    get: (name) => byName.get(name.toLowerCase()),
    names: () => [...byName.keys()],
  }
}

/** Split on whitespace, honouring "double" and 'single' quotes. */
export function tokenize(input: string): string[] {
  const out: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

export function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1)
    }
  return dp[a.length][b.length]
}

/** Closest candidate within a small edit distance, or a unique prefix match. */
export function suggest(word: string, candidates: string[]): string | undefined {
  const w = word.toLowerCase()
  let best: string | undefined
  let bestD = Infinity
  for (const c of candidates) {
    const d = distance(w, c)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  const limit = w.length <= 3 ? 1 : 2
  if (best && bestD <= limit) return best
  const prefixed = candidates.filter((c) => c.startsWith(w))
  return prefixed.length === 1 ? prefixed[0] : undefined
}

export async function execute(input: string, ctx: CommandContext): Promise<Line[]> {
  const [name, ...args] = tokenize(input.trim())
  if (!name) return []
  const cmd = ctx.registry.get(name)
  if (!cmd) {
    const visible = ctx.registry.list().filter((c) => !c.hidden).flatMap((c) => [c.name, ...(c.aliases ?? [])])
    const guess = suggest(name, visible)
    return [
      [t(`command not found: ${name}`, 'error')],
      guess
        ? [t('did you mean '), run(guess), t('? '), t('type ', 'muted'), run('help'), t(' for all commands', 'muted')]
        : [t('type ', 'muted'), run('help'), t(' to see what I can do', 'muted')],
    ]
  }
  try {
    return (await cmd.run(args, ctx)) ?? []
  } catch (err) {
    return [[t(`${name}: ${err instanceof Error ? err.message : String(err)}`, 'error')]]
  }
}

function commonPrefix(xs: string[]): string {
  if (!xs.length) return ''
  let p = xs[0]
  for (const x of xs) while (!x.startsWith(p)) p = p.slice(0, -1)
  return p
}

/**
 * Tab completion. Returns the new input value and, when ambiguous, the list
 * of options to show.
 */
export function complete(input: string, ctx: CommandContext): { value: string; options: string[] } {
  const endsWithSpace = /\s$/.test(input)
  const parts = tokenize(input)
  if (endsWithSpace) parts.push('')
  if (parts.length <= 1) {
    const word = (parts[0] ?? '').toLowerCase()
    const names = ctx.registry
      .list()
      .filter((c) => !c.hidden)
      .map((c) => c.name)
      .filter((n) => n.startsWith(word))
      .sort()
    if (names.length === 1) return { value: names[0] + ' ', options: [] }
    const p = commonPrefix(names)
    return { value: p.length > word.length ? p : input, options: names.length > 1 ? names : [] }
  }
  const cmd = ctx.registry.get(parts[0])
  if (!cmd?.complete) return { value: input, options: [] }
  const args = parts.slice(1)
  const current = args[args.length - 1]
  const candidates = cmd.complete(args, ctx).filter((c) => c.startsWith(current))
  const head = parts.slice(0, -1).join(' ') + ' '
  if (candidates.length === 1) {
    const c = candidates[0]
    return { value: head + c + (c.endsWith('/') ? '' : ' '), options: [] }
  }
  const p = commonPrefix(candidates)
  return { value: p.length > current.length ? head + p : input, options: candidates.length > 1 ? candidates : [] }
}
