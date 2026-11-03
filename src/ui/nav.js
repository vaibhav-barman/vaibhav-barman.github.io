/** Highlights the nav link of the section in view and closes the mobile menu after a tap. */
export function initNav() {
  const links = [...document.querySelectorAll('[data-nav]')]
  const menu = document.querySelector('.nav-menu')
  menu?.addEventListener('click', (e) => {
    if (e.target.closest('a')) menu.removeAttribute('open')
  })
  document.addEventListener('click', (e) => {
    if (menu?.open && !menu.contains(e.target)) menu.removeAttribute('open')
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu?.open) {
      menu.removeAttribute('open')
      menu.querySelector('summary')?.focus()
    }
  })

  const sections = [...new Set(links.map((a) => a.dataset.nav))].map((id) => document.getElementById(id)).filter(Boolean)
  const setActive = (id) => {
    for (const a of links) {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'true')
      else a.removeAttribute('aria-current')
    }
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
    },
    { rootMargin: '-45% 0px -50% 0px' },
  )
  sections.forEach((s) => io.observe(s))
  // Above the first section (the hero): nothing active.
  const hero = document.getElementById('hero')
  if (hero) new IntersectionObserver(([e]) => e.isIntersecting && setActive(null), { rootMargin: '-45% 0px -50% 0px' }).observe(hero)
}
