const CACHE_NAME = 'payki-cache-v1';
const ASSETS = [
    '/', '/manifest.json',
    '/icons/icon-192.png', '/icons/icon-512.png'
];
self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE_NAME).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request).then(r => {
            const copy = r.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
            return r;
        }).catch(() => caches.match('/')))
    );
});

self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch {}
    const title = data.title || 'PAYKI';
    const options = {
        body: data.body || 'Notificación',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data.url || '/'
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data || '/';
    e.waitUntil(clients.openWindow(url));
});
