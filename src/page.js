/**
 * Entry for the standalone project and note pages: styles, fonts, the nav
 * and the copy button. No terminal and no 3D.
 */
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './styles/main.css'
import { initCopy } from './ui/copy.js'
import { initNav } from './ui/nav.js'
import { registerServiceWorker } from './pwa/register.js'

initNav()
initCopy()
registerServiceWorker()
