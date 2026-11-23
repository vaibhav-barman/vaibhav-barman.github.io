/** resume.html: web fonts + the "Save as PDF" button. */
import './styles/fonts.css'

document.getElementById('print')?.addEventListener('click', () => window.print())
if (new URLSearchParams(location.search).has('print')) addEventListener('load', () => setTimeout(() => window.print(), 300))
