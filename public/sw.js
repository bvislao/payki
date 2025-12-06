// sw.js (resumen clave)
const CACHE_NAME = 'payki-cache-v4'
const ASSETS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)))
    self.skipWaiting?.()
})
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients?.claim?.())
    )
})
self.addEventListener('fetch', (e) => {
    const req = e.request
    const url = new URL(req.url)
    if (req.method !== 'GET') return
    if (url.origin !== self.location.origin) return

    // Evita romper devtools/next internals
    if (url.pathname.startsWith('/_next/') || url.pathname.includes('hot-update') || url.pathname.startsWith('/__nextjs_original-stack-frame')) {
        return
    }

    // No cachear Supabase rutas proxyeadas (si existieran) ni páginas críticas
    const isDynamicPage = url.pathname.startsWith('/user') || url.pathname.startsWith('/driver') || url.pathname.startsWith('/admin')
    const isApi = url.pathname.startsWith('/api/') // Next API
    const isStatic = url.pathname.startsWith('/icons/') || ASSETS.includes(url.pathname) ||
        /\.(css|js|woff2?|png|jpg|jpeg|gif|svg|webp)$/.test(url.pathname)

    if (isStatic) {
        e.respondWith(
            caches.match(req).then((hit) => hit || fetch(req).then((res) => {
                const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); return res
            }))
        )
        return
    }

    if (isDynamicPage || isApi) {
        e.respondWith(fetch(req).catch(() => caches.match(req) || caches.match('/')))
        return
    }

    // Resto: network-first
    e.respondWith(fetch(req).catch(() => caches.match(req)))
})