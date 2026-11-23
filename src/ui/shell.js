/**
 * The interactive terminal + `ask` live behind an "open shell" button in the
 * whoami section. Nothing of it loads (or runs) until it is opened, so it adds
 * nothing to the first paint or to phones that never use it. ` opens it too.
 */
import { config } from '../config.js'
import { state } from './bus.js'

export function initShell() {
  const button = document.getElementById('shell-open')
  const mount = document.getElementById('shell-mount')
  if (!button || !mount) return
  button.hidden = false
  let loading = null

  const label = (isOpen) => (button.textContent = isOpen ? config.whoami.shellClose : config.whoami.shell)
  const open = () => {
    button.setAttribute('aria-expanded', 'true')
    label(true)
    mount.hidden = false
    loading ??= Promise.all([import('./terminal-markup.js'), import('./terminal.js'), import('../data/portfolio.js')]).then(([{ terminalHtml }, { initTerminal }, { portfolio }]) => {
      mount.innerHTML = terminalHtml(portfolio.handle)
      initTerminal()
    })
    return loading
  }
  const close = () => {
    button.setAttribute('aria-expanded', 'false')
    label(false)
    mount.hidden = true
  }
  const toggle = async () => {
    if (button.getAttribute('aria-expanded') === 'true') return close()
    await open()
    mount.scrollIntoView({ block: 'center', behavior: state.reducedMotion ? 'auto' : 'smooth' })
    document.getElementById('term-input')?.focus({ preventScroll: true })
  }
  button.addEventListener('click', toggle)

  // ` opens the shell from anywhere (once it is open, terminal.js handles the key itself).
  document.addEventListener('keydown', (e) => {
    if (e.key !== config.terminal.focusKey || e.metaKey || e.ctrlKey || e.altKey || loading) return
    const el = document.activeElement
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
    e.preventDefault()
    toggle()
  })
}
