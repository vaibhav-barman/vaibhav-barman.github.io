import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sw = readFileSync('src/pwa/sw.js', 'utf8')

describe('service worker template', () => {
  it('has the markers the build fills in (version + precache list)', () => {
    expect(sw).toContain("/*VERSION*/ 'dev'")
    expect(sw).toContain('/*PRECACHE*/ []')
  })

  it('replaces old caches on activate so deploys never serve a stale site', () => {
    expect(sw).toContain('caches.delete')
    expect(sw).toContain('skipWaiting')
    expect(sw).toContain('clients.claim')
  })

  it('precaches from the network, not the HTTP cache, and revalidates pages', () => {
    expect(sw).toContain("cache: 'reload'")
    expect(sw).toContain("cache: 'no-cache'")
  })
})

describe('registration', () => {
  it('only registers in production builds', () => {
    const reg = readFileSync('src/pwa/register.js', 'utf8')
    expect(reg).toContain('import.meta.env.PROD')
    expect(reg).toContain("'serviceWorker' in navigator")
  })
})
