/**
 * Command registry. To add a command: export an object like
 *   { name, summary, group, run(args, ctx) { return [[ 'a line' ]] } }
 * from any file in this folder and add it to the list below.
 * `help`, Tab completion and "did you mean" pick it up automatically.
 */
import { createRegistry } from '../engine.js'
import { cat, cd, ls, pwd } from './fs.js'
import { rm, sudo, vim } from './fun.js'
import { about, contact, education, experience, neofetch, skills, whoami } from './info.js'
import { open, projects } from './projects.js'
import { ask, clear, echo, exit, github, help, history, linkedin, resume, theme, threeD } from './system.js'

export const registry = createRegistry([
  // about me
  whoami,
  about,
  neofetch,
  skills,
  experience,
  education,
  contact,
  resume,
  ask,
  // projects & links
  projects,
  open,
  github,
  linkedin,
  // shell
  help,
  ls,
  cd,
  cat,
  pwd,
  theme,
  threeD,
  history,
  clear,
  exit,
  echo,
  // extras
  sudo,
  rm,
  vim,
])
