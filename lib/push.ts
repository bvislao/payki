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

export async function subscribePush(
    vapidPublicKey: string,
    onSave: (p:{endpoint:string;p256dh:string;auth:string})=>Promise<void>
) {
    const reg = await navigator.serviceWorker.ready
    const newKey = urlBase64ToUint8Array(vapidPublicKey)

    const current = await reg.pushManager.getSubscription()
    if (current) {
        // ¿Se suscribió con otra applicationServerKey?
        const opts = await (current as any).getOptions?.()
        const sameKey = opts?.applicationServerKey &&
            new Uint8Array(opts.applicationServerKey).toString() === newKey.toString()
        if (!sameKey) await current.unsubscribe()
    }

    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: newKey })
    const json = sub.toJSON()
    // @ts-ignore
    await onSave({ endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
}