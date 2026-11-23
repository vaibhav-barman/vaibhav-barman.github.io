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
    expect(m.background_color).toBe('#000000')
    expect(m.background_color).toBe(theme.background)
    expect(m.theme_color).toBe('#000000')
    expect(m.theme_color).toBe(theme.background)
  })

  it('declares 192, 512 and maskable 512 icons that exist', () => {
    const find = (sizes, purpose) => m.icons.find((i) => i.sizes === sizes && i.purpose === purpose)
    expect(find('192x192', 'any')).toBeTruthy()
    expect(find('512x512', 'any')).toBeTruthy()
    expect(find('512x512', 'maskable')).toBeTruthy()
    for (const i of m.icons) expect(existsSync(`public${i.src}`), i.src).toBe(true)
  })

  it('describes the app and offers shortcuts that point at real places', () => {
    expect(m.description).toMatch(/AI engineer/)
    expect(m.categories).toContain('portfolio')
    expect(m.shortcuts.map((x) => x.url)).toEqual(['/#projects', '/resume.html', '/#contact'])
    for (const x of m.shortcuts) expect(x.icons[0].src).toMatch(/^\/icons\//)
    expect(webManifest('/repo/').shortcuts[1].url).toBe('/repo/resume.html')
  })

  it('has real favicon files: a valid .ico and a 32px png', () => {
    const ico = readFileSync('public/favicon.ico')
    expect([ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([1, 1]) // icon type, one image
    expect(ico.subarray(22, 30).toString('hex')).toBe('89504e470d0a1a0a') // embedded PNG
    const png = readFileSync('public/favicon-32.png')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([32, 32])
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
      expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />')
      expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="48x48" />')
      expect(existsSync('public/apple-touch-icon.png')).toBe(true)
    })
  }
})
