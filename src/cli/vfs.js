/**
 * A tiny read-only virtual filesystem generated from portfolio.json.
 *
 *   ~/about.md  ~/contact.txt  ~/skills.txt  ~/experience.md
 *   ~/education.md  ~/interests.md  ~/resume.md  ~/projects/<slug>.md
 */
import { aboutMd, contactTxt, interestsMd, projectMd, resumeMd, skillsTxt, timelineMd } from '../data/text.js'

export const HOME = '~'

export class VFS {
  constructor(d) {
    const file = (content) => ({ type: 'file', content })
    const projects = new Map(d.projects.map((p) => [`${p.slug}.md`, file(projectMd(p))]))
    this.root = {
      type: 'dir',
      children: new Map([
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
  resolve(cwd, target = '') {
    const t = target.trim()
    if (t === '' || t === '.') return this.resolve(HOME, cwd)
    const parts =
      t === '~'
        ? []
        : t.startsWith('~/') || t.startsWith('/')
          ? t.replace(/^~?\//, '').split('/')
          : [...this.segments(cwd), ...t.split('/')]
    const out = []
    for (const p of parts) {
      if (!p || p === '.') continue
      if (p === '..') out.pop()
      else out.push(p)
    }
    return out.length ? `${HOME}/${out.join('/')}` : HOME
  }

  segments(path) {
    return path.replace(/^~\/?/, '').split('/').filter(Boolean)
  }

  get(path) {
    let node = this.root
    for (const seg of this.segments(path)) {
      if (node.type !== 'dir') return undefined
      const next = node.children.get(seg)
      if (!next) return undefined
      node = next
    }
    return node
  }

  /** Completion candidates for a partially typed path. */
  complete(cwd, partial) {
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
