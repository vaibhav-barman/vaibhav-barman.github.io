import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { config } from '../config'
import { useReducedMotion } from '../hooks/useMedia'
import { useApp } from '../store/useApp'
import { Terminal } from './Terminal'

/** Global hotkey: backtick toggles the overlay (except while typing in other fields). */
export function useTerminalHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== config.terminal.toggleKey || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing && !el.id.startsWith('term-input')) return
      e.preventDefault()
      const s = useApp.getState()
      s.setTerminalOpen(!s.terminalOpen)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function TerminalOverlay() {
  const open = useApp((s) => s.terminalOpen)
  const setOpen = useApp((s) => s.setTerminalOpen)
  const reduce = useReducedMotion()
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) returnFocus.current = document.activeElement as HTMLElement | null
    else if (returnFocus.current && !returnFocus.current.id?.startsWith('term-input')) returnFocus.current.focus?.({ preventScroll: true })
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="term-overlay"
          role="dialog"
          aria-modal="false"
          aria-label="Terminal"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: reduce ? 0.1 : 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          className="fixed inset-x-2 bottom-2 z-50 h-[70svh] sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-4 sm:h-auto sm:w-[min(600px,calc(100vw-2rem))] lg:w-[min(600px,46vw)]"
        >
          <Terminal
            variant="overlay"
            autoFocus
            header={
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-white/10 px-2 py-0.5 font-mono text-[11px] text-muted hover:text-ink"
                aria-label="Close terminal"
              >
                esc
              </button>
            }
          />
        </m.div>
      )}
    </AnimatePresence>
  )
}
