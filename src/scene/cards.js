/**
 * Floating holographic project cards: one plane per featured project with
 * its title drawn on a canvas, a scanline/edge-glow shader and gentle
 * floating motion. Hovering a project on the page brings its card forward.
 */
import { AdditiveBlending, Color, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import { theme } from '../theme.js'
import { FONT_MONO, FONT_SANS, makeTexture, wrapLines } from './text.js'
import { damp } from './util.js'

const W = 640
const H = 400

function drawCard(p, accent) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = accent
  ctx.font = `700 26px ${FONT_MONO}`
  ctx.fillText(String(p.index).padStart(2, '0'), 40, 64)
  ctx.fillStyle = theme.text
  ctx.font = `500 24px ${FONT_MONO}`
  ctx.fillText(p.categoryLabel.toUpperCase(), 92, 64)
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 52px ${FONT_SANS}`
  const lines = wrapLines(ctx, p.title, W - 80, 2)
  lines.forEach((l, i) => ctx.fillText(l, 40, 150 + i * 60))
  ctx.fillStyle = theme.text
  ctx.font = `500 24px ${FONT_MONO}`
  const tags = wrapLines(ctx, p.tags.slice(0, 5).join('  ·  '), W - 80, 2)
  tags.forEach((l, i) => ctx.fillText(l, 40, H - 76 + i * 34))
  return c
}

export function createProjectCards({ projects, accent, max = 5 }) {
  const items = projects.filter((p) => p.featured).slice(0, max)
  const group = new Group()
  const geo = new PlaneGeometry(1.6, 1)
  const color = new Color(accent)
  const cards = items.map((p, i) => {
    const tex = makeTexture(drawCard(p, accent))
    const uniforms = {
      uMap: { value: tex },
      uColor: { value: color },
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uDim: { value: 0 },
      uSeed: { value: i * 1.7 },
    }
    const mat = new ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uFocus;
        uniform float uDim;
        uniform float uSeed;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          vec2 e = min(vUv, 1.0 - vUv) * vec2(1.6, 1.0);
          float edge = smoothstep(0.035, 0.0, min(e.x, e.y));
          float corner = step(min(e.x, e.y), 0.006) * step(max(e.x, e.y), 0.12);
          float scan = 0.82 + 0.18 * sin(vUv.y * 260.0 - uTime * 3.0);
          float sweep = smoothstep(0.08, 0.0, abs(fract(vUv.y - uTime * 0.12 + uSeed) - 0.5) - 0.42) * 0.35;
          float flicker = 0.94 + 0.06 * sin(uTime * 17.0 + uSeed * 9.0);
          float fill = 0.05 + 0.06 * uFocus;
          float k = (1.0 - uDim * 0.65) * flicker;
          vec3 col = uColor * (fill + edge * (0.55 + uFocus * 0.6) + corner * 0.9 + sweep * 0.25);
          col += tex.rgb * tex.a * scan * (0.85 + uFocus * 0.15);
          float a = clamp(fill + edge + tex.a * 0.9 + sweep * 0.2, 0.0, 1.0) * k;
          gl_FragColor = vec4(col * k, a);
          #include <colorspace_fragment>
        }`,
    })
    const mesh = new Mesh(geo, mat)
    const holder = new Group()
    holder.add(mesh)
    group.add(holder)
    return { p, mesh, holder, uniforms, tex, focus: 0 }
  })

  let focused = null
  const n = cards.length
  return {
    group,
    fitHeight: 2.8,
    fitWidth: 3.9,
    setAccent(c) {
      color.set(c)
      cards.forEach((card) => {
        card.tex.image = drawCard(card.p, c)
        card.tex.needsUpdate = true
      })
    },
    focus(slug) {
      focused = cards.some((c) => c.p.slug === slug) ? slug : null
    },
    update(dt, time, aspectHint = 1.8) {
      // Two rows, gently curved toward the viewer; one column on tall stages.
      const cols = aspectHint < 1.2 ? 1 : Math.ceil(n / 2)
      const rows = Math.ceil(n / cols)
      cards.forEach((c, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const cx = cols > 1 ? col / (cols - 1) - 0.5 : 0
        const cy = rows > 1 ? 0.5 - row / (rows - 1) : 0
        const isFocus = focused === c.p.slug
        c.focus += ((isFocus ? 1 : 0) - c.focus) * damp(6, dt)
        c.uniforms.uFocus.value = c.focus
        c.uniforms.uDim.value += ((focused && !isFocus ? 1 : 0) - c.uniforms.uDim.value) * damp(5, dt)
        c.uniforms.uTime.value = time
        const x = cx * 1.75 * (cols > 2 ? 2 : 1)
        const y = cy * 1.12 + Math.sin(time * 0.6 + i * 1.3) * 0.035
        const z = -Math.abs(cx) * 0.5 + c.focus * 0.6
        c.holder.position.set(x, y, z)
        c.holder.rotation.set(-cy * 0.12 + Math.sin(time * 0.4 + i) * 0.03, -cx * 0.45 + Math.sin(time * 0.3 + i) * 0.04, 0)
        c.holder.scale.setScalar(0.98 + c.focus * 0.12)
        c.holder.renderOrder = isFocus ? 10 : i
      })
    },
    dispose() {
      geo.dispose()
      cards.forEach((c) => {
        c.tex.dispose()
        c.mesh.material.dispose()
      })
    },
  }
}
