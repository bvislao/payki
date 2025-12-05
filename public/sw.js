// sw.js — PAYKI
const CACHE_NAME = 'payki-cache-v4';
const ASSETS = [
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
    self.skipWaiting?.();
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        // Limpia caches viejos
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        // Habilita Navigation Preload (mejora 1st paint con SW activo)
        try { await self.registration.navigationPreload?.enable?.(); } catch {}
        await self.clients?.claim?.();
    })());
});

// Utilidad: fetch con timeout para no “pegarnos” esperando red
async function fetchWithTimeout(req, ms = 3000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(req, { signal: ctrl.signal });
    } finally {
        clearTimeout(t);
    }
}

self.addEventListener('fetch', (e) => {
    const req = e.request;
    const url = new URL(req.url);

    // Solo GET same-origin; no interceptar preflight/CORS ni orígenes externos (Supabase)
    if (req.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    // Ignora rutas especiales de Next.js (HMR, dev errors)
    if (
        url.pathname.startsWith('/_next/') ||
        url.pathname.includes('hot-update') ||
        url.pathname.startsWith('/__nextjs_original-stack-frame')
    ) {
        return;
    }

    const isIcon = url.pathname.startsWith('/icons/');
    const isPrecached = ASSETS.includes(url.pathname);
    const isStatic = isIcon || isPrecached || /\.(?:css|js|woff2?|png|jpg|jpeg|gif|svg|webp)$/.test(url.pathname);
    const isNavigation = req.mode === 'navigate';
    const isApi = url.pathname.startsWith('/api/');

    // 1) Navegaciones: intenta preload/red con timeout; fallback a caché
    if (isNavigation) {
        e.respondWith((async () => {
            try {
                // si hay preload, úsalo
                const preload = await e.preloadResponse;
                if (preload) {
                    caches.open(CACHE_NAME).then(c => c.put(req, preload.clone()));
                    return preload;
                }
            } catch {}

            // red con timeout
            try {
                const net = await fetchWithTimeout(req, 3000);
                if (net && net.ok) {
                    const copy = net.clone();
                    caches.open(CACHE_NAME).then(c => c.put(req, copy));
                }
                return net;
            } catch {
                // fallback cache (HTML de la última vez) o raíz si existiera
                return (await caches.match(req)) || (await caches.match('/')) || Response.error();
            }
        })());
        return;
    }

    // 2) Assets estáticos: cache-first con revalidación
    if (isStatic) {
        e.respondWith(
            caches.match(req).then((cached) => {
                const update = fetch(req).then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(req, copy));
                    }
                    return res;
                }).catch(() => cached);
                return cached || update;
            })
        );
        return;
    }

    // 3) API same-origin: network-first, opcional fallback cache si hubo
    if (isApi) {
        e.respondWith(
            fetch(req).catch(() => caches.match(req))
        );
        return;
    }

    // 4) Resto: network-first con fallback cache
    e.respondWith(
        fetch(req).then((res) => {
            if (res && res.ok) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(req, copy));
            }
            return res;
        }).catch(() => caches.match(req))
    );
});

// Push
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch {}
    event.waitUntil(self.registration.showNotification(data.title || 'PAYKI', {
        body: data.body || 'Notificación',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data.url || '/'
    }));
});
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data || '/'));
});