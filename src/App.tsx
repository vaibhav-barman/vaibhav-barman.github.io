import { About } from './components/sections/About'
import { Contact } from './components/sections/Contact'
import { Hero } from './components/sections/Hero'
import { Journey } from './components/sections/Journey'
import { Projects } from './components/sections/Projects'
import { Skills } from './components/sections/Skills'
import { TerminalSection } from './components/sections/TerminalSection'
import { Hud } from './components/Hud'
import { ProjectDialog } from './components/ProjectDialog'
import { TerminalOverlay, useTerminalHotkey } from './components/TerminalOverlay'
import { ThemeSync } from './components/ThemeSync'
import { useScrollTracker } from './hooks/useScrollTracker'

export function App() {
  useScrollTracker()
  useTerminalHotkey()
  return (
    <>
      <ThemeSync />
      <div className="fallback-bg" aria-hidden="true" />
      <Hud />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Journey />
        <TerminalSection />
        <Contact />
      </main>
      <TerminalOverlay />
      <ProjectDialog />
    </>
  )
}
