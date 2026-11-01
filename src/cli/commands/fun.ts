import { blank, link, run, t } from '../format'
import type { Command } from '../types'

export const sudo: Command = {
  name: 'sudo',
  usage: 'hire-me',
  summary: 'you know you want to',
  group: 'fun',
  complete: () => ['hire-me'],
  run: (args, { data: d }) => {
    if (args[0] !== 'hire-me') {
      if (!args.length) return [[t('usage: sudo hire-me', 'muted')]]
      return [[t(`${d.handle} is not in the sudoers file. This incident will be reported.`, 'error')], [t('(hint: ', 'muted'), run('sudo hire-me'), t(')', 'muted')]]
    }
    const subject = encodeURIComponent(`Let's talk: ${d.role.split('|')[0].trim()} role`)
    const body = encodeURIComponent(`Hi ${d.firstName},\n\nI saw your portfolio and would like to talk about a role.\n\n`)
    return [
      [t('[sudo] password for recruiter: ', 'muted'), t('••••••••')],
      [t('✓ ', 'ok'), t('verifying intent ...................... '), t('ok', 'ok')],
      [t('✓ ', 'ok'), t(`loading portfolio.json ................ ${d.projects.length} projects, ${d.skills.length} skills`)],
      [t('✓ ', 'ok'), t('checking availability ................. '), t(d.status, 'ok')],
      [t('✓ ', 'ok'), t('compiling offer letter ................ '), t('pending your input', 'hot')],
      blank,
      [t('ACCESS GRANTED.', 'accent'), t(' Next step: ')],
      ...(d.email ? [[t('  → '), link(`email ${d.firstName}`, `mailto:${d.email}?subject=${subject}&body=${body}`)]] : []),
      ...(d.linkedin ? [[t('  → '), link('connect on LinkedIn', d.linkedin.url)]] : []),
      [t('  → '), run('resume')],
    ]
  },
}

export const rm: Command = {
  name: 'rm',
  summary: 'nope',
  hidden: true,
  run: () => [[t('rm: permission denied. These projects took a while to build.', 'error')]],
}

export const vim: Command = {
  name: 'vim',
  aliases: ['vi', 'nano', 'emacs'],
  summary: 'editor',
  hidden: true,
  run: () => [[t('this filesystem is read-only. to edit me, open ', 'muted'), t('portfolio.json', 'accent'), t(' :wq', 'dim')]],
}
