import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { faviconSvg } from './src/theme.js'

const root = import.meta.dirname
const DATA = resolve(root, 'portfolio.json')

/**
 * Renders the page from portfolio.json into index.html and resume.html at
 * build (and dev) time, plus SEO tags, theme colours and the favicon.
 * In dev, edits to portfolio.json or src/site/* reload the page.
 */
function portfolioHtml() {
  let server
  return {
    name: 'portfolio-html',
    configureServer(s) {
      server = s
      s.watcher.add(DATA)
      s.watcher.on('change', (file) => {
        if (file === DATA || file.includes('/src/site/') || file.endsWith('/src/theme.js') || file.endsWith('/src/config.js')) {
          s.moduleGraph.invalidateAll()
          s.ws.send({ type: 'full-reload' })
        }
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
      return renderHtml(html, raw, { isResume: ctx.filename.endsWith('resume.html') })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: faviconSvg() })
    },
  }
}

// User site (vaibhav-barman.github.io) is served from the domain root, so base is "/".
// For a project site (username.github.io/repo) set base to "/repo/".
export default defineConfig({
  base: '/',
  plugins: [portfolioHtml()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        resume: resolve(root, 'resume.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
})
