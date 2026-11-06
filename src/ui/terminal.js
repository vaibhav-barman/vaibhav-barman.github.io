/**
 * The interactive terminal in the hero. It wires the pure CLI engine
 * (src/cli) to the DOM: boot animation, auto-typed first command, history,
 * Tab completion, clickable output, quick-command chips and the ` shortcut.
 */
import { registry } from '../cli/commands/index.js'
import { warmAsk } from '../cli/commands/system.js'
import { complete, execute, tokenize } from '../cli/engine.js'
import { loadBrowserEmbedder } from '../ai/ask.js'
import { run, t } from '../cli/format.js'
import { inputLineHtml, linesHtml, promptHtml, promptText } from '../cli/render.js'
import { VFS } from '../cli/vfs.js'
import { config } from '../config.js'
import { portfolio as d } from '../data/portfolio.js'
import { theme } from '../theme.js'
import { bus, state } from './bus.js'

const coarse = () => matchMedia('(pointer: coarse)').matches

export function initTerminal() {
  const root = document.getElementById('terminal')
  const body = document.getElementById('term-body')
  if (!root || !body) return

  body.querySelector('.term-static')?.remove()
  body.insertAdjacentHTML(
    'beforeend',
    `<div class="term-log" role="log" aria-live="polite" aria-label="Terminal output"></div>
     <div class="term-input-line">
       <label for="term-input" id="term-prompt">${promptHtml('~', d.handle)}<span class="sr-only"> Type a command and press Enter. Type help for a list.</span></label>
       <input id="term-input" class="term-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-describedby="term-hint" />
     </div>
     <p id="term-hint" class="sr-only">Up and down arrows browse history, Tab completes.</p>`,
  )
  const log = body.querySelector('.term-log')
  const input = body.querySelector('#term-input')
  const promptLabel = body.querySelector('#term-prompt')
  const title = document.getElementById('term-title')

  const fs = new VFS(d)
  const history = []
  let cwd = '~'
  let histIdx = null
  let draft = ''
  let jumpTo = null
  let typing = null

  const columns = () => {
    const probe = 8.4 // ~px per monospace character at 14px
    return Math.floor((body.clientWidth - 32) / probe)
  }
  const scrollDown = () => {
    body.scrollTop = body.scrollHeight
  }
  const print = (lines) => {
    if (!lines.length) return
    log.insertAdjacentHTML('beforeend', linesHtml(lines))
    // Keep the DOM small.
    while (log.childElementCount > 600) log.firstElementChild.remove()
    scrollDown()
  }
  const echo = (text) => {
    log.insertAdjacentHTML('beforeend', inputLineHtml(cwd, d.handle, text))
    scrollDown()
  }
  const setCwd = (p) => {
    cwd = p
    promptLabel.firstElementChild.outerHTML = promptHtml(cwd, d.handle)
    if (title) title.textContent = promptText(cwd, d.handle).replace(/\$$/, '')
  }

  const currentTheme = () => {
    const accent = state.accent ?? theme.accent
    return Object.entries(theme.presets).find(([, v]) => v.toLowerCase() === accent.toLowerCase())?.[0] ?? accent
  }

  const actions = {
    setTheme(name) {
      const color = name ? theme.presets[name] : theme.accent
      state.accent = name ? color : null
      document.documentElement.style.setProperty('--accent', color)
      bus.emit('accent', color)
    },
    getTheme: currentTheme,
    set3D(on) {
      bus.emit('3d', on)
    },
    get3D: () => state.threeD,
    goTo(section) {
      jumpTo = section
    },
    highlight(h) {
      bus.emit('highlight', h)
    },
    focusProject(slug) {
      bus.emit('focus-project', slug)
    },
    openUrl(url) {
      if (url.startsWith('mailto:')) location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    },
    download(filename, content, mime = 'text/plain') {
      const blob = new Blob([content], { type: `${mime};charset=utf-8` })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    },
    clear() {
      log.innerHTML = ''
    },
    closeTerminal() {
      input.blur()
    },
    isNarrow: () => columns() < 72,
    /** `ask` uses this to load the embedding model (only on the first question). */
    loadEmbedder: loadBrowserEmbedder,
  }

  const ctx = () => ({ data: d, fs, cwd, setCwd, history, actions, registry })

  async function submit(text) {
    echo(text)
    const cmd = text.trim()
    if (!cmd) return
    if (history[history.length - 1] !== cmd) history.push(cmd)
    if (history.length > config.terminal.maxHistory) history.shift()
    histIdx = null
    jumpTo = null
    // The 3D network sends a signal out from the terminal on every command.
    bus.emit('command', cmd)
    // Slow commands (the first `ask` loads a model) show a status line until they finish.
    const def = registry.get(tokenize(cmd)[0] ?? '')
    let pendingEl = null
    const pendingTimer = def?.pending
      ? setTimeout(() => {
          log.insertAdjacentHTML('beforeend', linesHtml([[t(def.pending(), 'dim')]]))
          pendingEl = log.lastElementChild
          pendingEl?.setAttribute('aria-busy', 'true')
          scrollDown()
        }, 150)
      : 0
    const out = await execute(cmd, ctx())
    clearTimeout(pendingTimer)
    pendingEl?.remove()
    // Commands about a page section offer a jump link instead of scrolling
    // the page away from the terminal.
    if (jumpTo && document.getElementById(jumpTo)) {
      out.push([t('↳ ', 'muted'), { text: `jump to the ${jumpTo} section`, href: `#${jumpTo}` }])
    }
    print(out)
  }

  const setValue = (v) => {
    input.value = v
    requestAnimationFrame(() => input.setSelectionRange(v.length, v.length))
  }

  const cancelTyping = () => {
    if (typing) {
      clearTimeout(typing)
      typing = null
    }
  }

  let warmed = false
  input.addEventListener('input', () => {
    if (!warmed && /^\s*ask\s/.test(input.value)) {
      warmed = true
      warmAsk(ctx())
    }
  })

  input.addEventListener('keydown', (e) => {
    if (typing && e.key.length === 1) {
      cancelTyping()
      input.value = ''
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = input.value
      setValue('')
      submit(v)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!history.length) return
      if (histIdx === null) {
        draft = input.value
        histIdx = history.length - 1
      } else histIdx = Math.max(0, histIdx - 1)
      setValue(history[histIdx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx === null) return
      if (histIdx >= history.length - 1) {
        histIdx = null
        setValue(draft)
      } else setValue(history[++histIdx])
    } else if (e.key === 'Tab') {
      if (!input.value.trim()) return // empty line: let Tab move focus as normal
      e.preventDefault()
      const r = complete(input.value, ctx())
      if (r.options.length) {
        echo(input.value)
        print([[t(r.options.join('   '), 'muted')]])
      }
      setValue(r.value)
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      actions.clear()
    } else if (e.key === 'c' && e.ctrlKey && !getSelection()?.toString()) {
      e.preventDefault()
      echo(input.value + '^C')
      setValue('')
    } else if (e.key === 'Escape') {
      input.blur()
    }
  })

  // Clickable commands in the output, and the quick chips.
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd]')
    if (btn) {
      e.preventDefault()
      cancelTyping()
      input.value = ''
      submit(btn.dataset.cmd)
      // Don't pop the on-screen keyboard when a chip is tapped on a phone.
      if (!coarse()) input.focus({ preventScroll: true })
      return
    }
    if (e.target.closest('a, button')) return
    if (body.contains(e.target) && !getSelection()?.toString()) input.focus({ preventScroll: true })
  })

  // ` focuses the terminal from anywhere on the page.
  document.addEventListener('keydown', (e) => {
    if (e.key !== config.terminal.focusKey || e.metaKey || e.ctrlKey || e.altKey) return
    const el = document.activeElement
    if (el === input) {
      if (!input.value) {
        e.preventDefault()
        input.blur()
      }
      return
    }
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
    e.preventDefault()
    const r = root.getBoundingClientRect()
    if (r.top < 0 || r.bottom > innerHeight) root.scrollIntoView({ block: 'center', behavior: state.reducedMotion ? 'auto' : 'smooth' })
    input.focus({ preventScroll: true })
  })

  // ---- boot: a few status lines, then auto-type the first command ----
  const fill = (s) => s.replace('{user}', d.handle).replace('{projects}', String(d.projects.length)).replace('{skills}', String(d.skills.length))
  const bootLines = config.terminal.bootText.map((l) => {
    const m = fill(l).match(/^(\[ ?OK ?\])(.*)$/)
    return m ? [t(m[1], 'ok'), t(m[2], 'muted')] : [t(fill(l), 'muted')]
  })
  const welcome = [
    [t(`Welcome to ${d.name}'s portfolio shell. Type `, 'muted'), run('help'), t(' or tap a command below.', 'muted')],
    [''],
  ]

  function autoType(cmd) {
    if (state.reducedMotion || !config.terminal.typeDelay) return submit(cmd)
    let i = 0
    const step = () => {
      input.value = cmd.slice(0, ++i)
      if (i < cmd.length) typing = setTimeout(step, config.terminal.typeDelay)
      else
        typing = setTimeout(() => {
          typing = null
          input.value = ''
          submit(cmd)
        }, 260)
    }
    typing = setTimeout(step, 300)
  }

  function boot() {
    const delay = state.reducedMotion ? 0 : config.terminal.bootLineDelay
    if (!delay) {
      print([...bootLines, ...welcome])
      return autoType(config.terminal.autoRun)
    }
    bootLines.forEach((line, i) => setTimeout(() => print([line]), i * delay))
    setTimeout(() => {
      print(welcome)
      autoType(config.terminal.autoRun)
    }, bootLines.length * delay + 80)
  }

  // Boot when the terminal first scrolls into view (immediately on desktop).
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect()
      boot()
    }
  })
  io.observe(root)
}
