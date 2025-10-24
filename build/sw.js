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

// En tu /public/sw.js
self.addEventListener('fetch', (e) => {
    const req = e.request;
    const url = new URL(req.url);

    // 1) NO tocar preflight ni CORS (otra origin), y solo manejar GET
    if (req.method === 'OPTIONS') return;
    if (url.origin !== self.location.origin) return;
    if (req.method !== 'GET') return;

    // 2) Ignorar rutas especiales de Next.js (HMR, errores, etc.)
    if (
        url.pathname.startsWith('/_next/') ||
        url.pathname.includes('hot-update') ||
        url.pathname.startsWith('/__nextjs_original-stack-frame')
    ) {
        return; // dejar pasar al navegador
    }

    // 3) Clasificación simple por tipo de recurso/estrategia
    const isIcon = url.pathname.startsWith('/icons/');
    const isPrecachedAsset = (typeof ASSETS !== 'undefined') && ASSETS.includes(url.pathname);
    const isStaticAsset =
        isIcon ||
        isPrecachedAsset ||
        /\.(?:css|js|woff2?|png|jpg|jpeg|gif|svg|webp)$/.test(url.pathname);

    const isApi = url.pathname.startsWith('/api/'); // Next API same-origin (opcional)
    const isNavigation = req.mode === 'navigate';

    // 4) Navegaciones (páginas): Network-first con fallback a cache (o '/')
    if (isNavigation) {
        e.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(async () => (await caches.match(req)) || (await caches.match('/')))
        );
        return;
    }

    // 5) Assets estáticos: Cache-first + revalidación en background
    if (isStaticAsset) {
        e.respondWith(
            caches.match(req).then((cached) => {
                const fetchAndUpdate = fetch(req)
                    .then((res) => {
                        if (res && res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                        }
                        return res;
                    })
                    .catch(() => cached); // si falla red, devolvemos el cache (si existe)

                return cached || fetchAndUpdate;
            })
        );
        return;
    }

    // 6) API same-origin: Network-first (no cachear por defecto)
    if (isApi) {
        e.respondWith(
            fetch(req).catch(() => caches.match(req)) // opcional: sin cache, o con fallback si antes se guardó
        );
        return;
    }

    // 7) Resto de GET same-origin: Network-first con fallback desde cache
    e.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                }
                return res;
            })
            .catch(() => caches.match(req))
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