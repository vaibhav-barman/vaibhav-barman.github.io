import { useMemo, useRef, useState, type FormEvent } from 'react'
import { createOfflineProvider, type AskAnswer } from '../ai/ask'
import { portfolio as d } from '../data/portfolio'

type Msg = { role: 'user' | 'bot'; text: string; sources?: string[] }

/**
 * "Ask my portfolio" chat. UI + offline retrieval only for now; replace the
 * provider in src/ai/ask.ts with an LLM-backed one to make it generative.
 */
export function AskPortfolio() {
  const provider = useMemo(() => createOfflineProvider(d), [])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const question = q.trim()
    if (!question || busy) return
    setQ('')
    setMsgs((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    const a: AskAnswer = await provider.ask(question)
    setMsgs((m) => [...m, { role: 'bot', text: a.text, sources: a.sources }])
    setBusy(false)
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))
  }

  const suggestions = ['What are your agentic projects?', 'Which LLMs have you used?', 'Where do you study?']

  return (
    <div className="glass mt-14 rounded-2xl p-5 sm:p-6" role="region" aria-labelledby="ask-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="ask-title" className="font-mono text-sm text-accent">
          ask_my_portfolio()
        </h3>
        <span className="font-mono text-[10px] text-muted">{provider.name}</span>
      </div>
      <div ref={listRef} className="thin-scroll mt-4 max-h-72 space-y-3 overflow-y-auto" aria-live="polite">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQ(s)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted transition hover:border-accent/40 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <p
              className={`inline-block max-w-[90%] rounded-xl px-3.5 py-2 text-left text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-accent/15 text-ink' : 'bg-white/5 text-ink/90'
              }`}
            >
              <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Portfolio: '}</span>
              {m.text}
            </p>
            {m.sources && m.sources.length > 0 && (
              <p className="mt-1 font-mono text-[10px] text-muted">sources: {m.sources.join(', ')}</p>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <label htmlFor="ask-input" className="sr-only">
          Ask a question about {d.firstName}
        </label>
        <input
          id="ask-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask about ${d.firstName}'s work…`}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 font-mono text-sm font-semibold text-bg disabled:opacity-50"
        >
          ask
        </button>
      </form>
    </div>
  )
}
