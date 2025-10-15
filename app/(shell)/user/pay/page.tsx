'use client'
import { useEffect, useMemo, useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { callFunction } from '@/lib/functions'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import QRScanner from "@/components/QRScanner";
import {useRouter} from "next/navigation";

export default function PayQRPage() {
    const router = useRouter()
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
        let shift: string | undefined, fare: string | undefined
        try {
            if (text.startsWith('http') || text.startsWith('payki://')) {
                const u = new URL(text.replace('payki://', 'https://payki.local/'))
                shift = u.searchParams.get('shift') || undefined
                fare  = u.searchParams.get('fare')  || undefined
            } else {
                const obj = JSON.parse(text)
                shift = obj.shift; fare = obj.fare
            }
        } catch { toast.error('QR inválido'); return }

        if (!shift || !fare) { toast.error('QR incompleto'); return }
        if (!userId) { toast.error('Inicia sesión'); return }

        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token!
            const idem = crypto.randomUUID()
            const res = await callFunction<any>('ride_pay', { passenger_id: userId, shift, fare, idempotencyKey: idem }, token)
            const row = res?.tx ?? null;
            //const id = row?.id ?? row?.tx_id ?? null;
            const amount = row?.amount ?? row?.tx_amount ?? null;
            if (!res?.ok || Number.isNaN(amount)) throw new Error('Transacción inválida')
            toast.success(`Pago realizado: S/ ${amount.toFixed(2)}`)
            // regresar a /user
            router.push('/user')
        } catch (e: any) {
            toast.error(e?.message ?? 'Error al pagar')
        }
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
