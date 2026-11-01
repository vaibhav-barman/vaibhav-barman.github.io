import { About } from './components/sections/About'
import { Contact } from './components/sections/Contact'
import { Hero } from './components/sections/Hero'
import { Journey } from './components/sections/Journey'
import { Projects } from './components/sections/Projects'
import { Skills } from './components/sections/Skills'
import { TerminalSection } from './components/sections/TerminalSection'
import { LazyMotion, domAnimation } from 'framer-motion'
import { Cursor } from './components/Cursor'
import { Footer } from './components/Footer'
import { Hud } from './components/Hud'
import { Loader } from './components/Loader'
import { Scene3D } from './components/Scene3D'
import { ProjectDialog } from './components/ProjectDialog'
import { TerminalOverlay, useTerminalHotkey } from './components/TerminalOverlay'
import { ThemeSync } from './components/ThemeSync'
import { useScrollTracker } from './hooks/useScrollTracker'

export function App() {
  useScrollTracker()
  useTerminalHotkey()
  return (
    <LazyMotion features={domAnimation} strict>
      <ThemeSync />
      <div className="fallback-bg" aria-hidden="true" />
      <Scene3D />
      <div className="fx-overlay" aria-hidden="true" />
      <div className="fx-scanlines" aria-hidden="true" />
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
      <Footer />
      <TerminalOverlay />
      <ProjectDialog />
      <Loader />
      <Cursor />
    </LazyMotion>
  )
}
