export function urlBase64ToUint8Array(maybeKey: string) {
    if (!maybeKey) throw new Error('VAPID public key is empty/undefined');

    // limpia espacios, saltos de línea y comillas accidentales
    const cleaned = maybeKey.trim().replace(/^"+|"+$/g, '').replace(/\s+/g, '');

    // base64url -> base64
    let base64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');

    // padding
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);

    // decode
    let binary = '';
    try {
        binary = atob(base64);
    } catch {
        throw new Error('Invalid VAPID public key (not Base64/Base64URL).');
    }

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}


type SaveFn = (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<void>;

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    return await navigator.serviceWorker.register('/sw.js');
}

export async function subscribePush(vapidPublicKey: string, save: SaveFn) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push no soportado en este navegador');
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado');

    const reg = await navigator.serviceWorker.ready; // ya registrado
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
        const keys = existing.toJSON().keys as { p256dh: string; auth: string };
        await save({ endpoint: existing.endpoint, p256dh: keys.p256dh, auth: keys.auth });
        return true;
    }

    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    const keys = sub.toJSON().keys as { p256dh: string; auth: string };
    await save({ endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth });
    return true;
}
