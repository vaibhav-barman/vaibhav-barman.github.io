/** resume.html: web fonts + the "Save as PDF" button. */
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'

document.getElementById('print')?.addEventListener('click', () => window.print())
if (new URLSearchParams(location.search).has('print')) addEventListener('load', () => setTimeout(() => window.print(), 300))
