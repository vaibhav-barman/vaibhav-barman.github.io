/**
 * Browser entry. The page itself is already rendered (from portfolio.json, at
 * build time); this file only adds interactivity on top. Every piece is
 * optional: with JavaScript off the page still reads top to bottom.
 */
import './styles/fonts.css'
import './styles/main.css'
import { initNav } from './ui/nav.js'
import { initCopy } from './ui/copy.js'
import { initReveal } from './ui/reveal.js'
import { initTyped } from './ui/typed.js'
import { initFx } from './ui/fx.js'
import { initSolids } from './ui/solids.js'
import { initShell } from './ui/shell.js'
import { initScene } from './ui/scene-loader.js'
import { registerServiceWorker } from './pwa/register.js'

initNav()
initCopy()
initReveal()
initTyped()
initFx()
initSolids()
initShell()
initScene()
registerServiceWorker()
