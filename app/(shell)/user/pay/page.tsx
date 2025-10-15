'use client'
import { useEffect, useMemo, useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { callFunction } from '@/lib/functions'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import QRScanner from "@/components/QRScanner";
const QrReader = dynamic(
    () => import('react-qr-reader').then(m => m.QrReader),
    { ssr: false }
)

type QRPayload = { shift?: string; fare?: string }

export default function PayQRPage() {
    const {userId} = useAuth()
    const [busy, setBusy] = useState(false)
    const [manual, setManual] = useState('')              // fallback manual
    const [hasCam, setHasCam] = useState<boolean | null>(null)

    // Detecta si hay cámara disponible
    useEffect(() => {
        // El componente ya maneja detection, pero usamos esto para mostrar UI adecuada
        (async () => {
            try {
                const devices = await navigator.mediaDevices?.enumerateDevices?.()
                const cam = devices?.some(d => d.kind === 'videoinput')
                setHasCam(cam ?? false)
            } catch {
                setHasCam(false)
            }
        })()
    }, [])

    const handleText = async (text: string) => {
        // Acepta URL tipo: payki://ride?shift=...&fare=... o https://.../user/pay-qr?... o JSON
        let shift: string | undefined
        let fare: string | undefined
        try {
            if (text.startsWith('http') || text.startsWith('payki://')) {
                const u = new URL(text.replace('payki://', 'https://payki.local/'))
                shift = u.searchParams.get('shift') || undefined
                fare  = u.searchParams.get('fare')  || undefined
            } else {
                const obj = JSON.parse(text)
                shift = obj.shift
                fare  = obj.fare
            }
        } catch {
            toast.error('Formato de QR no válido')
            return
        }
        if (!shift || !fare) { toast.error('Faltan datos en el QR'); return }

        if (!userId) { toast.error('Inicia sesión'); return }
        setBusy(true)
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token!
            const idem = crypto.randomUUID()
            const res = await callFunction<any>('ride_pay', { passenger_id: userId, shift, fare, idempotencyKey: idem }, token)

            const row = res?.tx ?? null;
            //const id = row?.id ?? row?.tx_id ?? null;
            const amount = row?.amount ?? row?.tx_amount ?? null;
            if (!res?.ok || Number.isNaN(amount)) throw new Error('Transacción inválida')

            toast.success(`Pago realizado: S/ ${amount.toFixed(2)}`)
        } catch (e:any) {
            toast.error(e?.message ?? 'Error al pagar')
        } finally { setBusy(false) }
    }

    return (
        <RequireRole role="passenger">
            <div className="max-w-2xl mx-auto card p-6 space-y-4">
                <h2 className="text-2xl font-semibold">Pagar Pasaje (QR)</h2>
                <QRScanner onText={handleText} height={360} />
                <button className="btn w-full mt-3" disabled={busy}>
                    {busy ? 'Procesando…' : 'Listo'}
                </button>
            </div>
        </RequireRole>
    )
}
