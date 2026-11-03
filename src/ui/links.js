/** Page → 3D: hovering a project or a skill chip highlights it in the scene. */
import { bus } from './bus.js'

export function initSceneLinks() {
  for (const el of document.querySelectorAll('[data-project]')) {
    const on = () => bus.emit('focus-project', el.dataset.project)
    const off = () => bus.emit('focus-project', null)
    el.addEventListener('pointerenter', on)
    el.addEventListener('pointerleave', off)
    el.addEventListener('focusin', on)
    el.addEventListener('focusout', off)
  }
  for (const el of document.querySelectorAll('[data-skill]')) {
    el.addEventListener('pointerenter', () => bus.emit('hover-skill', el.dataset.skill))
    el.addEventListener('pointerleave', () => bus.emit('hover-skill', null))
  }
  // Terminal → page: `projects 2` lights the card, `skills backend` lights the chips.
  bus.on('focus-project', (slug) => {
    for (const el of document.querySelectorAll('.project.is-lit')) el.classList.remove('is-lit')
    if (slug) document.querySelector(`[data-project="${CSS.escape(slug)}"]`)?.classList.add('is-lit')
  })
  let timer
  bus.on('highlight', (h) => {
    clearTimeout(timer)
    for (const el of document.querySelectorAll('.chip.is-lit')) el.classList.remove('is-lit')
    if (h?.kind === 'skills' && h.group) {
      for (const el of document.querySelectorAll(`[data-group="${CSS.escape(h.group)}"] .chip`)) el.classList.add('is-lit')
      timer = setTimeout(() => bus.emit('highlight', null), 6000)
    }
  })
}
