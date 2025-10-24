const CACHE_NAME = 'payki-cache-v3';
const ASSETS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
    self.skipWaiting?.();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients?.claim?.())
    );
});

self.addEventListener('fetch', (e) => {
    const { request } = e;
    // Sólo GET y mismo origen
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    const url = new URL(request.url);

    // ⚠️ No interceptar nada de Next.js, HMR o mapas de error
    if (
        url.pathname.startsWith('/_next/') ||
        url.pathname.includes('hot-update') ||
        url.pathname.startsWith('/__nextjs_original-stack-frame')
    ) {
        return; // deja pasar
    }

    // Cache-first para assets simples; network-first para el resto
    const isAsset = ASSETS.includes(url.pathname) || url.pathname.startsWith('/icons/');
    e.respondWith(
        (isAsset
                ? caches.match(request).then((cached) => cached || fetch(request).then((r) => {
                    const copy = r.clone(); caches.open(CACHE_NAME).then(c => c.put(request, copy)); return r;
                }))
                : fetch(request).then((r) => {
                    const copy = r.clone(); caches.open(CACHE_NAME).then(c => c.put(request, copy)); return r;
                }).catch(() => caches.match(request).then((m) => m || caches.match('/')))
        )
    );
});

self.addEventListener('push', (event) => {
    let data = {}
    try { data = event.data ? event.data.json() : {} } catch {}
    event.waitUntil(self.registration.showNotification(data.title || 'PAYKI', {
        body: data.body || 'Notificación',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data.url || '/'
    }))
})
self.addEventListener('notificationclick', (e) => {
    e.notification.close()
    e.waitUntil(clients.openWindow(e.notification.data || '/'))
})