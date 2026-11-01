import { config } from '../../config'
import { useApp } from '../../store/useApp'
import { Terminal } from '../Terminal'
import { Kbd, Section } from '../ui'

export function TerminalSection() {
  const overlayOpen = useApp((s) => s.terminalOpen)
  return (
    <Section id="terminal" wide>
      <p className="mb-6 max-w-2xl text-muted">
        Everything on this page is also a command. Try <span className="font-mono text-accent">neofetch</span>,{' '}
        <span className="font-mono text-accent">projects 1</span> or <span className="font-mono text-accent">sudo hire-me</span>. Press{' '}
        <Kbd>{config.terminal.toggleKey}</Kbd> to take it with you as an overlay.
      </p>
      <div className="h-[min(560px,70svh)]">
        {overlayOpen ? (
          <div className="glass flex h-full items-center justify-center rounded-2xl font-mono text-sm text-muted">
            terminal is open in the overlay →
          </div>
        ) : (
          <Terminal variant="inline" />
        )}
      </div>
    </Section>
  )
}
