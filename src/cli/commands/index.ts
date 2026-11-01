/**
 * Command registry. To add a command: export a `Command` object from any file
 * in this folder and add it to this list. `help`, tab completion and
 * "did you mean" pick it up automatically.
 */
import { createRegistry } from '../engine'
import { cat, cd, ls, pwd } from './fs'
import { rm, sudo, vim } from './fun'
import { about, contact, education, experience, neofetch, skills, whoami } from './info'
import { open, projects } from './projects'
import { ask, clear, echo, exit, github, help, history, linkedin, resume, theme, threeD } from './system'

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
  // projects & navigation
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
