/**
 * Browser entry. The page itself is already rendered (from portfolio.json, at
 * build time); this file only adds interactivity on top.
 */
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './styles/main.css'
import { initNav } from './ui/nav.js'

initNav()
import { initTerminal } from './ui/terminal.js'

initTerminal()
import { initScene } from './ui/scene-loader.js'

initScene()
import { initSceneLinks } from './ui/links.js'

initSceneLinks()
import { registerServiceWorker } from './pwa/register.js'

registerServiceWorker()
