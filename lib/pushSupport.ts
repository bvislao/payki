// lib/pushSupport.ts
export function detectPushSupport() {
    const reasons: string[] = []

    const isSecure = window.isSecureContext || location.protocol === 'https:'
    if (!isSecure && location.hostname !== 'localhost') {
        reasons.push('El sitio no está en HTTPS.')
    }

    const hasSW = 'serviceWorker' in navigator
    if (!hasSW) reasons.push('Este navegador no soporta Service Worker.')

    const hasPush = 'PushManager' in window
    if (!hasPush) reasons.push('Este navegador no soporta la API de Push.')

    const perm = Notification?.permission as NotificationPermission | undefined
    if (perm === 'denied') reasons.push('Las notificaciones están bloqueadas para este sitio.')

    // iOS/iPadOS: requiere PWA instalada (standalone) y iOS 16.4+
    const ua = navigator.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    const isStandalone =
        // iOS
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        // fallback iOS antiguo
        // @ts-ignore
        (window.navigator as any).standalone === true

    if (isIOS && !isStandalone) {
        reasons.push('En iOS debes instalar la PWA en la pantalla de inicio para recibir push.')
    }

    return {
        ok: reasons.length === 0,
        reasons,
        info: { isSecure, hasSW, hasPush, perm, isIOS, isStandalone },
    }
}
