import { HOME } from '../vfs.js'
import { linkify, run, t } from '../format.js'

const pathComplete = (args, { fs, cwd }) => fs.complete(cwd, args[args.length - 1] ?? '')

export const ls = {
  name: 'ls',
  aliases: ['dir', 'll'],
  usage: '[path]',
  summary: 'list files',
  group: 'system',
  complete: pathComplete,
  run: (args, { fs, cwd }) => {
    const target = args.find((a) => !a.startsWith('-')) ?? ''
    const path = fs.resolve(cwd, target)
    const node = fs.get(path)
    if (!node) return [[t(`ls: ${target}: No such file or directory`, 'error')]]
    if (node.type === 'file') return [[t(target)]]
    const prefix = target && !target.endsWith('/') ? `${target}/` : target
    const spans = [...node.children].flatMap(([name, child], i) => [
      ...(i ? [t('  ')] : []),
      child.type === 'dir'
        ? { text: `${name}/`, tone: 'heading', cmd: `cd ${prefix}${name}` }
        : { text: name, cmd: `cat ${prefix}${name}` },
    ])
    return [spans]
  },
}

export const cd = {
  name: 'cd',
  usage: '[dir]',
  summary: 'change directory',
  group: 'system',
  complete: (args, ctx) => pathComplete(args, ctx).filter((p) => p.endsWith('/')),
  run: (args, { fs, cwd, setCwd }) => {
    const path = fs.resolve(cwd, args[0] ?? HOME)
    const node = fs.get(path)
    if (!node) return [[t(`cd: no such file or directory: ${args[0]}`, 'error')]]
    if (node.type !== 'dir') return [[t(`cd: not a directory: ${args[0]}`, 'error')]]
    setCwd(path)
    return []
  },
}

export const cat = {
  name: 'cat',
  aliases: ['less', 'more'],
  usage: '<file>',
  summary: 'print a file',
  group: 'system',
  complete: pathComplete,
  run: (args, { fs, cwd }) => {
    if (!args[0]) return [[t('usage: cat <file>  (try ', 'muted'), run('ls'), t(')', 'muted')]]
    return args.flatMap((a) => {
      const node = fs.get(fs.resolve(cwd, a))
      if (!node) return [[t(`cat: ${a}: No such file or directory`, 'error')]]
      if (node.type === 'dir') return [[t(`cat: ${a}: Is a directory`, 'error')]]
      return node.content.split('\n').map((line) => {
        if (/^#{1,3} /.test(line)) return [t(line, 'heading')]
        if (line.startsWith('> ')) return [t(line, 'accent')]
        return linkify(line)
      })
    })
  },
}

export const pwd = {
  name: 'pwd',
  summary: 'print working directory',
  group: 'system',
  run: (_, { cwd, data }) => [[t(cwd.replace(/^~/, `/home/${data.handle}`))]],
}
