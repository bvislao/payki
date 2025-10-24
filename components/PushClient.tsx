'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bell, BellOff, Loader2 } from 'lucide-react'

import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/auth'
import { registerSW, subscribePush } from '@/lib/push'
import { detectPushSupport } from '@/lib/pushSupport'

export default function PushClient() {
    const { userId } = useAuth()
    const [busy, setBusy] = useState(false)
    const [supported, setSupported] = useState(true)
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [subscribed, setSubscribed] = useState(false)

    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

    // Chequeos iniciales: soporte, permiso y si ya existe suscripción
    useEffect(() => {
        const s = detectPushSupport()
        setSupported(s.ok)
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission)
        }
        ;(async () => {
            try {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
                const reg = await navigator.serviceWorker.ready
                const sub = await reg.pushManager.getSubscription()
                setSubscribed(!!sub)
            } catch {
                // no-op
            }
        })()
    }, [userId])

    // Activar notificaciones (registrar SW, pedir permiso, suscribir y guardar en DB)
    const enable = async () => {
        const support = detectPushSupport()
        if (!support.ok) {
            toast.error('Navegador no soportado para Web Push:\n- ' + support.reasons.join('\n- '))
            return
        }
        if (!userId) return toast.error('Inicia sesión primero')
        if (!vapid) return toast.error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')

        try {
            setBusy(true)

            await registerSW()

            // Solicita permiso si aún no se concedió
            if (typeof window !== 'undefined' && 'Notification' in window) {
                let p = Notification.permission
                if (p === 'default') {
                    p = await Notification.requestPermission()
                }
                setPermission(p)
                if (p !== 'granted') {
                    toast.error('Permiso de notificaciones denegado')
                    return
                }
            }

            await registerSW()
            await subscribePush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, async (p) => {
                await supabase.from('push_subscriptions').upsert({
                    user_id: userId,
                    endpoint: p.endpoint,
                    p256dh: p.p256dh,
                    auth: p.auth,
                    user_agent: navigator.userAgent,
                }, { onConflict: 'endpoint' })
            })

            setSubscribed(true)
            toast.success('Notificaciones activadas')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    // Desactivar notificaciones (desuscribirse y borrar de DB)
    const disable = async () => {
        try {
            setBusy(true)
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()
            if (sub) {
                const endpoint = sub.endpoint
                await sub.unsubscribe().catch(() => {})
                await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
            }
            setSubscribed(false)
            toast.success('Notificaciones desactivadas')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    // Botón deshabilitado si no hay soporte
    if (!supported) {
        return (
            <button className="btn-outline opacity-60 cursor-not-allowed" disabled title="Web Push no soportado en este navegador">
                <BellOff className="h-4 w-4 mr-2" />
                Push no disponible
            </button>
        )
    }

    // Botón con icono + estado
    return subscribed ? (
        <button
            className="btn-outline"
            onClick={disable}
            disabled={busy}
            title="Desactivar notificaciones"
            aria-label="Desactivar notificaciones"
        >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellOff className="h-4 w-4 mr-2" />}
            Desactivar Push
        </button>
    ) : (
        <button
            className="btn-outline"
            onClick={enable}
            disabled={busy || permission === 'denied'}
            title={permission === 'denied' ? 'Permiso denegado por el usuario' : 'Activar notificaciones'}
            aria-label="Activar notificaciones"
        >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            Activar Push
        </button>
    )
}