/** Escape text for HTML. Every value from portfolio.json goes through this. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Join template parts, dropping empty/false values. */
export const html = (parts) => parts.filter(Boolean).join('')

export const pad2 = (n) => String(n).padStart(2, '0')

export function truncate(s, n) {
  if (s.length <= n) return s
  return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'
}
