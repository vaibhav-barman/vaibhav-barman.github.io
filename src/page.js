/**
 * Entry for the standalone project and note pages: styles, fonts, the nav,
 * the copy button, the diagram pause/resume and the footer's chrome sphere.
 * No terminal and no 3D hero, so they load instantly and print well.
 */
import './styles/fonts.css'
import './styles/main.css'
import { initCopy } from './ui/copy.js'
import { initFx } from './ui/fx.js'
import { initNav } from './ui/nav.js'
import { initReveal } from './ui/reveal.js'
import { registerServiceWorker } from './pwa/register.js'

initNav()
initCopy()
initReveal()
initFx()
registerServiceWorker()
