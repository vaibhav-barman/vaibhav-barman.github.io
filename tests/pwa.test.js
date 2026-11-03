import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import raw from '../portfolio.json'
import { webManifest } from '../src/pwa/manifest.js'
import { renderHtml } from '../src/site/build.js'
import { theme } from '../src/theme.js'

describe('web manifest', () => {
  const m = webManifest('/')

  it('is an installable standalone app at the site root', () => {
    expect(m.name).toBe('Vaibhav Barman')
    expect(m.short_name).toBe('vaibhav.sh')
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.scope).toBe('/')
  })

  it('takes its colours from the theme', () => {
    expect(m.background_color).toBe('#05070a')
    expect(m.background_color).toBe(theme.background)
    expect(m.theme_color).toBe(theme.accent)
  })

  it('declares 192, 512 and maskable 512 icons that exist', () => {
    const find = (sizes, purpose) => m.icons.find((i) => i.sizes === sizes && i.purpose === purpose)
    expect(find('192x192', 'any')).toBeTruthy()
    expect(find('512x512', 'any')).toBeTruthy()
    expect(find('512x512', 'maskable')).toBeTruthy()
    for (const i of m.icons) expect(existsSync(`public${i.src}`), i.src).toBe(true)
  })

  it('prefixes paths with the base for project sites', () => {
    const p = webManifest('/repo/')
    expect(p.start_url).toBe('/repo/')
    expect(p.scope).toBe('/repo/')
    expect(p.icons[0].src.startsWith('/repo/icons/')).toBe(true)
  })
})

describe('<head> tags', () => {
  for (const [name, file, opts] of [['index', 'index.html', {}], ['resume', 'resume.html', { isResume: true }]]) {
    it(`${name}.html links the manifest and apple-touch-icon`, () => {
      const html = renderHtml(readFileSync(file, 'utf8'), raw, opts)
      expect(html).toContain('<link rel="manifest" href="/site.webmanifest">')
      expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
      expect(html).toContain('apple-mobile-web-app-capable')
      expect(existsSync('public/apple-touch-icon.png')).toBe(true)
    })
  }
})
