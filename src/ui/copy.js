/** "Copy" buttons (e.g. next to the email address). Hidden without JS or clipboard support. */
export function initCopy() {
  if (!navigator.clipboard?.writeText) return
  for (const btn of document.querySelectorAll('[data-copy]')) {
    btn.hidden = false
    const label = btn.firstChild
    let timer
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy)
        label.textContent = 'Copied'
      } catch {
        label.textContent = 'Press Ctrl+C'
      }
      clearTimeout(timer)
      timer = setTimeout(() => (label.textContent = 'Copy'), 2000)
    })
  }
}
