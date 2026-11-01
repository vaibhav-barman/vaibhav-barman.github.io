import { About } from './components/sections/About'
import { Contact } from './components/sections/Contact'
import { Hero } from './components/sections/Hero'
import { Journey } from './components/sections/Journey'
import { Projects } from './components/sections/Projects'
import { Skills } from './components/sections/Skills'
import { ProjectDialog } from './components/ProjectDialog'
import { ThemeSync } from './components/ThemeSync'
import { useScrollTracker } from './hooks/useScrollTracker'

export function App() {
  useScrollTracker()
  return (
    <>
      <ThemeSync />
      <div className="fallback-bg" aria-hidden="true" />
      <main id="main">
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Journey />
        <section id="terminal" aria-label="Terminal" className="min-h-[50vh]" />
        <Contact />
      </main>
      <ProjectDialog />
    </>
  )
}
