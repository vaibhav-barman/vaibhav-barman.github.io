import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { normalize } from './src/data/normalize'
import { resumeContent, seoHead, staticContent } from './src/data/staticHtml'
import type { RawPortfolio } from './src/data/types'

const DATA = resolve(__dirname, 'portfolio.json')

/**
 * Injects SEO tags, JSON-LD and a full text version of the site into the HTML
 * entries at build (and dev) time, all generated from portfolio.json.
 */
function portfolioHtml(): Plugin {
  return {
    name: 'portfolio-html',
    configureServer(server) {
      server.watcher.add(DATA)
      server.watcher.on('change', (file) => {
        if (file === DATA) server.ws.send({ type: 'full-reload' })
      })
    },
    transformIndexHtml(html, ctx) {
      const data = normalize(JSON.parse(readFileSync(DATA, 'utf-8')) as RawPortfolio)
      const isResume = ctx.filename.endsWith('resume.html')
      return html
        .replace(
          '<!--seo-->',
          seoHead(data, isResume ? { path: 'resume.html', title: `${data.name} · Resume` } : {}),
        )
        .replace('<!--static-content-->', staticContent(data))
        .replace('<!--resume-->', resumeContent(data))
    },
  }
}

// User site (vaibhav-barman.github.io) is served from the domain root, so base is "/".
// For a project site (username.github.io/repo) set base to "/repo/".
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), portfolioHtml()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        resume: resolve(__dirname, 'resume.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('postprocessing')) return 'postfx'
          if (id.includes('@react-three')) return 'r3f'
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
})
