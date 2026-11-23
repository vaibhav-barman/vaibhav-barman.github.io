/**
 * Web app manifest + the <head> tags that make the site installable.
 * The manifest is generated at build time (see vite.config.js) so its colours
 * always match src/theme.js.
 */
import { theme } from '../theme.js'

export const APP_NAME = 'Vaibhav Barman'
export const APP_SHORT_NAME = 'vaibhav.sh'
export const APP_DESCRIPTION = 'Vaibhav Barman: AI engineer building agents, RAG and MCP systems. Open to remote AI engineering roles.'

/** Long-press / right-click jump points on the installed app's icon. `href` is relative to the base. */
export const SHORTCUTS = [
  { name: 'Flagship builds', short_name: 'Builds', description: 'The three agent pipelines', href: '#projects' },
  { name: 'Resume', short_name: 'Resume', description: 'Printable resume', href: 'resume.html' },
  { name: 'Contact', short_name: 'Contact', description: 'Email, GitHub and LinkedIn', href: '#contact' },
]

/** Icon files in public/ (made by `npm run icons`). */
export const ICONS = [
  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]
export const APPLE_TOUCH_ICON = 'apple-touch-icon.png'

/** `base` is the deploy path: '/' for https://vaibhav-barman.github.io/ (user site). */
export function webManifest(base = '/') {
  return {
    id: base,
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    lang: 'en',
    dir: 'ltr',
    categories: ['portfolio', 'developer', 'technology'],
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'any',
    background_color: theme.background,
    theme_color: theme.background,
    icons: ICONS.map((i) => ({ ...i, src: base + i.src })),
    shortcuts: SHORTCUTS.map(({ href, ...s }) => ({ ...s, url: base + href, icons: [{ src: base + ICONS[0].src, sizes: '192x192', type: 'image/png' }] })),
  }
}

/** Manifest link, iOS "Add to Home Screen" tags and the apple-touch-icon. */
export function pwaHead(base = '/') {
  return [
    `<link rel="manifest" href="${base}site.webmanifest">`,
    `<link rel="apple-touch-icon" href="${base}${APPLE_TOUCH_ICON}">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-title" content="${APP_SHORT_NAME}">`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black">`,
  ].join('\n    ')
}
