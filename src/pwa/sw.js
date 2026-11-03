/**
 * Service worker template. At build time vite.config.js copies it to dist/sw.js
 * and fills in the two markers below: a version hash of every built file and the
 * list of files to precache. Any change to the site changes the hash, so the
 * browser installs the new worker and the old cache is deleted.
 *
 *  - Pages and other files: network first, cache as the offline fallback, so a
 *    new deploy shows up on the next visit and is never hidden by an old cache.
 *  - /assets/*: file names contain a content hash, so cache first is always safe.
 */
const VERSION = /*VERSION*/ 'dev'
const PRECACHE = /*PRECACHE*/ []

const PREFIX = 'portfolio-'
const CACHE = PREFIX + VERSION
// '/' on a user site, '/repo/' on a project site: the folder this worker was registered for.
const SCOPE = new URL(self.registration.scope).pathname
// Precached requests carry no Origin header but module scripts and fonts do, so a host that
// answers with `Vary: Origin` would make those lookups miss. We only cache our own files.
const MATCH = { ignoreVary: true, ignoreSearch: true }

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // cache: 'reload' skips the browser's HTTP cache so we never precache a stale copy.
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

async function networkFirst(request, fallbacks = []) {
  const cache = await caches.open(CACHE)
  try {
    // 'no-cache' revalidates with the server instead of trusting the HTTP cache.
    const response = await fetch(request, { cache: 'no-cache' })
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    for (const key of [request, ...fallbacks]) {
      const hit = await cache.match(key, MATCH)
      if (hit) return hit
    }
    throw err
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request, MATCH)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Offline: the exact page, then /page.html (GitHub Pages serves /resume as resume.html), then home.
    event.respondWith(networkFirst(request, [url.pathname.replace(/\/$/, '') + '.html', SCOPE]))
  } else if (url.pathname.startsWith(SCOPE + 'assets/')) {
    event.respondWith(cacheFirst(request))
  } else {
    event.respondWith(networkFirst(request))
  }
})
