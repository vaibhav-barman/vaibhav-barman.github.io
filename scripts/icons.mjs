#!/usr/bin/env node
/**
 * Regenerates the PWA icons in public/ from src/theme.js (the ">_" mark on the
 * dark background) using a locally installed Chrome/Chromium in headless mode.
 * Run: npm run icons    Set CHROME_PATH if Chrome isn't in a standard location.
 *
 *   icons/icon-192.png, icons/icon-512.png   purpose "any"
 *   icons/icon-maskable-512.png              purpose "maskable" (mark inside the safe zone)
 *   apple-touch-icon.png                     180×180, opaque, iOS home screen
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { appIconSvg } from '../src/theme.js'

const root = resolve(import.meta.dirname, '..')
const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chrome = candidates.find((p) => existsSync(p))
if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH=/path/to/chrome')
  process.exit(1)
}

// scale 1 keeps the mark inside the maskable safe zone (a circle of 40% of the icon).
const icons = [
  { file: 'icons/icon-192.png', size: 192, scale: 1.25 },
  { file: 'icons/icon-512.png', size: 512, scale: 1.25 },
  { file: 'icons/icon-maskable-512.png', size: 512, scale: 1 },
  { file: 'apple-touch-icon.png', size: 180, scale: 1.2 },
]

mkdirSync(join(root, 'public/icons'), { recursive: true })
const dir = mkdtempSync(join(tmpdir(), 'icons-'))
for (const { file, size, scale } of icons) {
  const html = join(dir, `${size}-${scale}.html`)
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}svg{display:block;width:${size}px;height:${size}px}</style>${appIconSvg(undefined, scale)}`)
  const out = join(root, 'public', file)
  execFileSync(
    chrome,
    ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--screenshot=${out}`, `--window-size=${size},${size}`, `file://${html}`],
    { stdio: 'ignore' },
  )
  console.log(`wrote public/${file} (${size}×${size})`)
}
