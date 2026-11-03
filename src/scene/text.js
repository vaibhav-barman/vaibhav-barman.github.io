/** Draws text onto canvases for 3D labels and card faces. */
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'
import { theme } from '../theme.js'

export const FONT_SANS = theme.fonts.sans
export const FONT_MONO = theme.fonts.mono

export function makeTexture(canvas) {
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return tex
}

/** Wrap `text` into lines that fit `maxWidth` with the context's current font. */
export function wrapLines(ctx, text, maxWidth, maxLines = 3) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    } else line = test
  }
  if (lines.length < maxLines && line) lines.push(line)
  return lines
}

/** A small label texture (text only, white on transparent). */
export function labelCanvas(text, { size = 44, color = theme.text, mono = true } = {}) {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const font = `600 ${size}px ${mono ? FONT_MONO : FONT_SANS}`
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width) + 24
  c.width = w
  c.height = Math.ceil(size * 1.5)
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 12, c.height / 2)
  return c
}
