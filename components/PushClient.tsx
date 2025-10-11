'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { registerSW, subscribePush } from '@/lib/push'
import { useAuth } from '@/lib/auth'
import {detectPushSupport} from "@/lib/pushSupport";

export default function PushClient() {
    const { userId } = useAuth()
    const [busy, setBusy] = useState(false)
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

    const enable = async () => {
        const support = detectPushSupport()
        if (!support.ok) {
            alert('Navegador no soportado para Web Push:\n- ' + support.reasons.join('\n- '))
            return
        }

        if (!userId) return alert('Inicia sesión primero')
        if (!vapid) return alert('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')

        try {
            setBusy(true)
            await registerSW()
            await subscribePush(vapid, async ({ endpoint, p256dh, auth }) => {
                await supabase.from('push_subscriptions').upsert({
                    user_id: userId,
                    endpoint, p256dh, auth,
                    user_agent: navigator.userAgent,
                }, { onConflict: 'endpoint' })
            })
            alert('Notificaciones activadas')
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <button className="btn-outline" onClick={enable} disabled={busy}>
            {busy ? 'Activando…' : 'Activar notificaciones'}
        </button>
    )
}
