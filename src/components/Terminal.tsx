import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { config } from '../config'
import { boot, complete, printOptions, promptFor, setColumns, submit } from '../cli/session'
import type { Line, Span, Tone } from '../cli/types'
import { useApp, type TermEntry } from '../store/useApp'

const TONE: Record<Tone, string> = {
  accent: 'text-accent',
  accent2: 'text-[color-mix(in_oklab,var(--accent2)_60%,white)]',
  hot: 'text-hot',
  muted: 'text-muted',
  dim: 'text-[#76819a]',
  error: 'text-[#ff7a90]',
  ok: 'text-[#5cf2a6]',
  bold: 'font-semibold text-ink',
}

function SpanView({ span, onRun }: { span: Span; onRun: (cmd: string) => void }) {
  if (typeof span === 'string') return <>{span}</>
  const cls = span.tone ? TONE[span.tone] : ''
  if (span.href) {
    const external = !span.href.startsWith('mailto:') && !span.href.startsWith('/')
    return (
      <a
        href={span.href}
        {...(external || span.href.startsWith('/') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
      >
        {span.text}
      </a>
    )
  }
  if (span.cmd) {
    const cmd = span.cmd
    return (
      <button
        type="button"
        onClick={() => onRun(cmd)}
        className={`${cls || 'text-accent'} cursor-pointer underline decoration-dotted decoration-current/40 underline-offset-2 hover:decoration-solid`}
        title={`run: ${cmd}`}
      >
        {span.text}
      </button>
    )
  }
  return <span className={cls}>{span.text}</span>
}

function LineView({ line, onRun }: { line: Line; onRun: (cmd: string) => void }) {
  return (
    <div className="min-h-[1.5em]">
      {line.map((s, i) => (
        <SpanView key={i} span={s} onRun={onRun} />
      ))}
    </div>
  )
}

function Prompt({ text }: { text: string }) {
  const m = text.match(/^(.*?)(:)(.*?)(\$)$/)
  if (!m) return <span className="text-accent">{text}</span>
  return (
    <span className="select-none">
      <span className="text-accent">{m[1]}</span>
      <span className="text-muted">{m[2]}</span>
      <span className="text-[color-mix(in_oklab,var(--accent2)_60%,white)]">{m[3]}</span>
      <span className="text-muted">{m[4]}</span>
    </span>
  )
}

function Entry({ entry, onRun }: { entry: TermEntry; onRun: (cmd: string) => void }) {
  if (entry.kind === 'input')
    return (
      <div className="min-h-[1.5em]">
        <Prompt text={entry.prompt} /> <span className="text-ink">{entry.text}</span>
      </div>
    )
  return (
    <>
      {entry.lines.map((l, i) => (
        <LineView key={i} line={l} onRun={onRun} />
      ))}
    </>
  )
}

export function Terminal({
  variant,
  autoFocus = false,
  header,
}: {
  variant: 'inline' | 'overlay'
  autoFocus?: boolean
  header?: ReactNode
}) {
  const entries = useApp((s) => s.term.entries)
  const history = useApp((s) => s.term.history)
  const cwd = useApp((s) => s.term.cwd)
  const [value, setValue] = useState('')
  const [cursor, setCursor] = useState(0)
  const [focused, setFocused] = useState(false)
  const histIdx = useRef<number | null>(null)
  const draft = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const prompt = promptFor(cwd)
  const inputId = `term-input-${variant}`

  // Boot when this terminal first becomes visible.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        boot()
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

  // Keep the newest output in view.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length])

  // Track available columns so commands can adapt their layout.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setColumns(Math.floor((el.clientWidth - 24) / 7.9))
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [])

  const run = (cmd: string) => {
    setColumns(Math.floor(((scrollRef.current?.clientWidth ?? 640) - 24) / 7.9))
    void submit(cmd, variant)
    histIdx.current = null
    // Don't summon the on-screen keyboard when a chip/link is tapped on touch devices.
    if (!window.matchMedia('(pointer: coarse)').matches || document.activeElement === inputRef.current) {
      inputRef.current?.focus({ preventScroll: true })
    }
  }

  const set = (v: string) => {
    setValue(v)
    setCursor(v.length)
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(v.length, v.length))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      run(value)
      set('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!history.length) return
      if (histIdx.current === null) {
        draft.current = value
        histIdx.current = history.length - 1
      } else histIdx.current = Math.max(0, histIdx.current - 1)
      set(history[histIdx.current])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx.current === null) return
      if (histIdx.current >= history.length - 1) {
        histIdx.current = null
        set(draft.current)
      } else {
        histIdx.current += 1
        set(history[histIdx.current])
      }
    } else if (e.key === 'Tab') {
      if (!value.trim()) return // let Tab move focus when the line is empty
      e.preventDefault()
      const r = complete(value)
      if (r.options.length) printOptions(r.options)
      set(r.value)
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      useApp.getState().clearTerm()
    } else if (e.key === 'c' && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault()
      useApp.getState().pushTerm({ kind: 'input', prompt, text: value + '^C' })
      set('')
    }
  }

  const syncCursor = () => setCursor(inputRef.current?.selectionStart ?? value.length)
  const before = value.slice(0, cursor)
  const at = value[cursor] ?? ' '
  const after = value.slice(cursor + 1)

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Interactive terminal"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#070910]/90 shadow-[0_30px_80px_-30px_var(--accent)] backdrop-blur-xl focus-within:border-accent/70 focus-within:shadow-[0_0_0_1px_var(--accent),0_30px_80px_-30px_var(--accent)]"
    >
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
        </span>
        <span className="flex-1 truncate text-center font-mono text-xs text-muted">{prompt.replace(/\$$/, '')}</span>
        {header}
      </div>

      <div
        ref={scrollRef}
        onClick={() => {
          if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true })
        }}
        className="term-out thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-[1.6] text-ink/90 sm:text-[13px]"
      >
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Terminal output">
          {entries.map((e) => (
            <Entry key={e.id} entry={e} onRun={run} />
          ))}
        </div>
        <div className="flex min-h-[1.5em] items-start">
          <label htmlFor={inputId} className="shrink-0">
            <Prompt text={prompt} />
            <span className="sr-only"> Type a command and press Enter. Type help for a list.</span>
          </label>
          <span className="relative ml-[1ch] min-w-0 flex-1">
            <span aria-hidden="true" className="whitespace-pre-wrap break-all text-ink">
              {before}
              <span
                className={
                  focused
                    ? 'term-caret bg-accent text-bg'
                    : 'outline outline-1 -outline-offset-1 outline-accent/70'
                }
              >
                {at}
              </span>
              {after}
            </span>
            <input
              ref={inputRef}
              id={inputId}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setCursor(e.target.selectionStart ?? e.target.value.length)
                histIdx.current = null
              }}
              onKeyDown={onKeyDown}
              onKeyUp={syncCursor}
              onSelect={syncCursor}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className="absolute inset-0 h-full w-full bg-transparent text-transparent caret-transparent outline-none selection:bg-accent/30 focus-visible:outline-none"
            />
          </span>
        </div>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-white/5 px-3 py-2.5" role="group" aria-label="Quick commands">
        {config.terminal.quickCommands.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => run(c)}
            className="shrink-0 rounded-md border border-accent/25 bg-accent/5 px-2.5 py-1 font-mono text-xs text-accent transition hover:bg-accent/15"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
