/**
 * A tiny read-only virtual filesystem generated from portfolio.json.
 *
 *   ~/about.md  ~/contact.txt  ~/skills.txt  ~/experience.md
 *   ~/education.md  ~/interests.md  ~/resume.md  ~/projects/<slug>.md
 */
import type { Portfolio } from '../data/portfolio'
import { aboutMd, contactTxt, interestsMd, projectMd, resumeMd, skillsTxt, timelineMd } from '../data/text'

export type VNode = { type: 'file'; content: string } | { type: 'dir'; children: Map<string, VNode> }

export const HOME = '~'

export class VFS {
  readonly root: VNode & { type: 'dir' }

  constructor(d: Portfolio) {
    const file = (content: string): VNode => ({ type: 'file', content })
    const projects = new Map<string, VNode>(d.projects.map((p) => [`${p.slug}.md`, file(projectMd(p))]))
    this.root = {
      type: 'dir',
      children: new Map<string, VNode>([
        ['about.md', file(aboutMd(d))],
        ['contact.txt', file(contactTxt(d))],
        ['education.md', file(timelineMd(d, 'education'))],
        ['experience.md', file(timelineMd(d, 'work'))],
        ['interests.md', file(interestsMd(d))],
        ['projects', { type: 'dir', children: projects }],
        ['resume.md', file(resumeMd(d))],
        ['skills.txt', file(skillsTxt(d))],
      ]),
    }
  }

  /** Resolve `target` relative to `cwd`. Returns a canonical path like "~/projects". */
  resolve(cwd: string, target = ''): string {
    const t = target.trim()
    const parts = t === '' || t === '~' ? [] : t.startsWith('~/') || t.startsWith('/') ? t.replace(/^~?\//, '').split('/') : [...this.segments(cwd), ...t.split('/')]
    const out: string[] = []
    for (const p of parts) {
      if (!p || p === '.') continue
      if (p === '..') out.pop()
      else out.push(p)
    }
    return out.length ? `${HOME}/${out.join('/')}` : HOME
  }

  segments(path: string): string[] {
    return path.replace(/^~\/?/, '').split('/').filter(Boolean)
  }

  get(path: string): VNode | undefined {
    let node: VNode = this.root
    for (const seg of this.segments(path)) {
      if (node.type !== 'dir') return undefined
      const next = node.children.get(seg)
      if (!next) return undefined
      node = next
    }
    return node
  }

  /** Completion candidates for a partially typed path. */
  complete(cwd: string, partial: string): string[] {
    const slash = partial.lastIndexOf('/')
    const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : ''
    const namePart = slash >= 0 ? partial.slice(slash + 1) : partial
    const dir = this.get(this.resolve(cwd, dirPart || '.'))
    if (!dir || dir.type !== 'dir') return []
    return [...dir.children]
      .filter(([name]) => name.startsWith(namePart))
      .map(([name, node]) => dirPart + name + (node.type === 'dir' ? '/' : ''))
  }
}
