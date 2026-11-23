/** The shell window (built on demand: it is not in the prerendered page). */
import { promptText } from '../cli/render.js'
import { config } from '../config.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function terminalHtml(handle) {
  const title = promptText('~', handle).replace(/\$$/, '')
  return `<div class="term" id="terminal" role="region" aria-label="Interactive terminal">
  <div class="term-bar">
    <span class="term-lights" aria-hidden="true"><span></span><span></span><span></span></span>
    <span class="term-title" id="term-title">${esc(title)}</span>
    <kbd class="term-key" title="Press ${esc(config.terminal.focusKey)} to focus the terminal">${esc(config.terminal.focusKey)}</kbd>
  </div>
  <div class="term-body" id="term-body"></div>
  <div class="term-chips" aria-label="Quick commands">${config.terminal.chips.map((c) => `<button type="button" class="chip-cmd" data-cmd="${esc(c)}">${esc(c)}</button>`).join('')}</div>
</div>`
}
