import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { defineConfig } from 'vitest/config'
import { webManifest } from './src/pwa/manifest.js'
import { loadNotes } from './src/site/notes.js'
import { faviconSvg } from './src/theme.js'

const root = import.meta.dirname
const DATA = resolve(root, 'portfolio.json')
const NOTES = resolve(root, 'notes')
// NOTES_DRAFTS=1 npm run dev  → preview draft notes locally (never set in CI).
const notes = () => loadNotes(NOTES, { includeDrafts: process.env.NOTES_DRAFTS === '1' })
// Deploy path. https://vaibhav-barman.github.io/ is a user site, so it is served from the root.
const BASE = '/'

/**
 * Renders the page from portfolio.json into index.html and resume.html at
 * build (and dev) time, plus SEO tags, theme colours and the favicon.
 * Also writes the standalone pages (/projects/<slug>.html, /notes/<slug>.html)
 * from page.html, and sitemap.xml.
 * In dev, edits to portfolio.json, notes/ or src/site/* reload the page.
 */
function portfolioHtml() {
  let server
  return {
    name: 'portfolio-html',
    configureServer(s) {
      server = s
      s.watcher.add([DATA, NOTES])
      s.watcher.on('all', (_event, file) => {
        if (file === DATA || file.startsWith(NOTES) || file.includes('/src/site/') || file.endsWith('/src/theme.js') || file.endsWith('/src/config.js')) {
          s.moduleGraph.invalidateAll()
          s.ws.send({ type: 'full-reload' })
        }
      })
      s.middlewares.use('/site.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(JSON.stringify(webManifest(BASE)))
      })
      // Standalone pages: /projects/<slug>.html and /notes/<slug>.html
      s.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (!/^\/(projects|notes)\/[\w-]+\.html$/.test(url)) return next()
        try {
          const { renderPages } = await s.ssrLoadModule('/src/site/build.js')
          const template = await s.transformIndexHtml(url, readFileSync(resolve(root, 'page.html'), 'utf-8'))
          const raw = JSON.parse(readFileSync(DATA, 'utf-8'))
          const found = renderPages(template, raw, { notes: notes() }).find((p) => '/' + p.path === url)
          if (!found) return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(found.html)
        } catch (err) {
          next(err)
        }
      })
      s.middlewares.use('/sitemap.xml', async (_req, res) => {
        const { sitemapXml } = await s.ssrLoadModule('/src/site/pages.js')
        const { model } = await s.ssrLoadModule('/src/site/build.js')
        res.setHeader('Content-Type', 'application/xml')
        res.end(sitemapXml(model(JSON.parse(readFileSync(DATA, 'utf-8')), { notes: notes() })))
      })
      s.middlewares.use('/favicon.svg', async (_req, res) => {
        const { faviconSvg: icon } = await s.ssrLoadModule('/src/theme.js')
        res.setHeader('Content-Type', 'image/svg+xml')
        res.end(icon())
      })
    },
    async transformIndexHtml(html, ctx) {
      const { renderHtml } = server ? await server.ssrLoadModule('/src/site/build.js') : await import('./src/site/build.js')
      const raw = JSON.parse(readFileSync(DATA, 'utf-8'))
      return renderHtml(html, raw, { isResume: ctx.filename.endsWith('resume.html'), notes: notes() })
    },
    // Runs before the service worker plugin lists dist/, so the new pages are precached.
    writeBundle: {
      sequential: true,
      order: 'pre',
      async handler(options) {
        const dir = options.dir
        const templateFile = resolve(dir, 'page.html')
        const { renderPages } = await import('./src/site/build.js')
        const { sitemapXml } = await import('./src/site/pages.js')
        const { model } = await import('./src/site/build.js')
        const raw = JSON.parse(readFileSync(DATA, 'utf-8'))
        for (const p of renderPages(readFileSync(templateFile, 'utf-8'), raw, { notes: notes() })) {
          const file = resolve(dir, p.path)
          mkdirSync(dirname(file), { recursive: true })
          writeFileSync(file, p.html)
        }
        // page.html is only a template.
        rmSync(templateFile)
        writeFileSync(resolve(dir, 'sitemap.xml'), sitemapXml(model(raw, { notes: notes() })))
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: faviconSvg() })
      this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: JSON.stringify(webManifest(BASE), null, 2) })
    },
  }
}

/**
 * Inlines the (small) site stylesheet into the HTML in production builds,
 * removing a render-blocking request before first paint.
 */
function inlineCss() {
  return {
    name: 'inline-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        return html.replace(/<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"[^>]*>/g, (tag, file) => {
          const asset = ctx.bundle[file]
          return asset && asset.type === 'asset' ? `<style>${asset.source}</style>` : tag
        })
      },
    },
  }
}

/**
 * Writes dist/sw.js from src/pwa/sw.js: lists the built files to precache and
 * stamps a version hash of their contents, so every deploy that changes the site
 * also changes the worker (and the browser replaces the old cache).
 */
function serviceWorker() {
  const SKIP = new Set(['sw.js', 'robots.txt', 'sitemap.xml', 'og-image.png'])
  // Unused big images in public/ are not worth precaching (they are still cached if requested).
  // Everything in assets/ is the app itself (including the 3D chunk), so it is always kept.
  const MAX_STATIC_BYTES = 300 * 1024
  return {
    name: 'service-worker',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir
      const template = readFileSync(resolve(root, 'src/pwa/sw.js'), 'utf-8')
      const files = readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && !SKIP.has(e.name) && !e.name.startsWith('.'))
        .map((e) => resolve(e.parentPath, e.name))
        .map((f) => ({ f, rel: f.slice(dir.length).split(sep).join('/') }))
        .filter(({ f, rel }) => rel.startsWith('/assets/') || statSync(f).size <= MAX_STATIC_BYTES)
        .map(({ rel }) => rel)
        .sort()
      const hash = createHash('sha256').update(template)
      for (const f of files) hash.update(f).update(readFileSync(resolve(dir, '.' + f)))
      const urls = files.map((f) => (f === '/index.html' ? BASE : BASE + f.slice(1)))
      const sw = template
        .replace("/*VERSION*/ 'dev'", `'${hash.digest('hex').slice(0, 12)}'`)
        .replace('/*PRECACHE*/ []', JSON.stringify(urls, null, 2))
      writeFileSync(resolve(dir, 'sw.js'), sw)
    },
  }
}

// For a project site (username.github.io/repo) set BASE to "/repo/".
export default defineConfig({
  base: BASE,
  plugins: [portfolioHtml(), inlineCss(), serviceWorker()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        resume: resolve(root, 'resume.html'),
        page: resolve(root, 'page.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
})
