/**
 * Minimal headless-Chrome driver over the DevTools protocol (no dependencies;
 * uses Node's built-in fetch and WebSocket). Used by scripts/qa.mjs.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' }

/** Serves a folder (like `vite preview`: /projects/x.html and / → index.html). Resolves to { url, close }. */
export function serve(dir) {
  const root = resolve(dir)
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url ?? '/').split('?')[0])
    if (p.endsWith('/')) p += 'index.html'
    const file = normalize(join(root, p))
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(readFileSync(file))
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })))
}

const freePort = () =>
  new Promise((ok) => {
    const s = createNetServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => ok(port))
    })
  })

export function findChrome() {
  return [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
    .filter(Boolean)
    .find((p) => existsSync(p))
}

export async function launch({ webgl = true } = {}) {
  const exe = findChrome()
  if (!exe) throw new Error('Chrome not found. Set CHROME_PATH=/path/to/chrome')
  const port = await freePort()
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'qa-chrome-'))}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--mute-audio',
    ...(webgl ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : []),
    'about:blank',
  ]
  const proc = spawn(exe, args, { stdio: 'ignore' })
  for (let i = 0; i < 100; i++) {
    try {
      await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
      break
    } catch {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  return {
    port,
    async newPage() {
      const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
      return connect(t.webSocketDebuggerUrl)
    },
    close() {
      proc.kill()
    },
  }
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const listeners = new Map()
  const opened = new Promise((ok, no) => {
    ws.addEventListener('open', ok)
    ws.addEventListener('error', no)
  })
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      const { ok, no } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? no(new Error(`${msg.error.message} ${msg.error.data ?? ''}`)) : ok(msg.result)
    } else if (msg.method) for (const fn of listeners.get(msg.method) ?? []) fn(msg.params)
  })
  const send = async (method, params = {}) => {
    await opened
    return new Promise((ok, no) => {
      const i = ++id
      pending.set(i, { ok, no })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  }
  const on = (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn])
  const once = (method) => new Promise((ok) => on(method, ok))

  const page = {
    send,
    on,
    async viewport(width, height, { dpr = 1, mobile = false } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile, screenWidth: width, screenHeight: height })
      await send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
      await send('Emulation.setEmitTouchEventsForMouse', { enabled: mobile, configuration: 'mobile' }).catch(() => {})
    },
    async media(features) {
      await send('Emulation.setEmulatedMedia', { features })
    },
    async goto(url, { settle = 600 } = {}) {
      await send('Page.enable')
      await send('Runtime.enable')
      const loaded = once('Page.loadEventFired')
      await send('Page.navigate', { url })
      await loaded
      await new Promise((r) => setTimeout(r, settle))
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
      return r.result.value
    },
    async shot(file, { fullPage = false, clip } = {}) {
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })
      const { writeFileSync } = await import('node:fs')
      writeFileSync(file, Buffer.from(data, 'base64'))
      return file
    },
    async scrollTo(y) {
      await page.eval(`window.scrollTo(0, ${y})`)
      await new Promise((r) => setTimeout(r, 250))
    },
    async tap(x, y) {
      for (const type of ['touchStart', 'touchEnd']) {
        await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchStart' ? [{ x, y }] : [] })
      }
    },
    async move(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    },
    async click(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    },
    close() {
      ws.close()
    },
  }
  return page
}
