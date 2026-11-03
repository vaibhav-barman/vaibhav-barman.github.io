/** Registers the service worker (production builds only, so dev never serves cached files). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const base = import.meta.env.BASE_URL
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).catch(() => {
      // Offline support is a bonus: the site works the same without it.
    })
  })
}
