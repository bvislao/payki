'use client'
import { useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { callFunction } from '@/lib/functions'
import toast from 'react-hot-toast'

export default function PayQRPage() {
    const { userId } = useAuth()
    const [raw, setRaw] = useState('{"shift":"<uuid>","fare":"troncal"}')
    const [busy, setBusy] = useState(false)

    const simulate = async () => {
        if (!userId) return toast.error('Inicia sesión')
        let obj: { shift?: string; fare?: string }
        try {
            obj = JSON.parse(raw)
            if (!obj.shift || !obj.fare) throw new Error('Formato inválido')
        } catch {
            return toast.error('Pegue un JSON válido del QR')
        }

        setBusy(true)
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token
            if (!token) throw new Error('Sin sesión')

            const res = await callFunction<{ ok: true; tx: { id: string; amount: number } }>(
                'ride_pay',
                { shift: obj.shift, fare: obj.fare, passenger_id: userId },
                token
            )

            toast.success(`Pago realizado: S/ ${Number(res.tx.amount).toFixed(2)}`)
            setRaw('') // limpiar
        } catch (e: any) {
            const msg = e?.message || ''
            if (msg.includes('NO_VEHICLE_ASSIGNED')) toast.error('Jornada sin vehículo')
            else if (msg.includes('SHIFT_CLOSED')) toast.error('Jornada finalizada')
            else if (msg.includes('FARE_NOT_FOUND')) toast.error('Tarifa no válida')
            else toast.error(msg || 'Error al pagar')
        } finally {
            setBusy(false)
        }
    }

    return (
        <RequireRole role="passenger">
            <div className="max-w-2xl mx-auto card p-6 space-y-4">
                <h2 className="text-2xl font-semibold">Pagar Pasaje (QR)</h2>

                <div className="rounded-2xl border p-4">
                    <div className="text-sm text-gray-400 mb-2">Simula la cámara pegando el contenido del QR:</div>
                    <textarea
                        className="w-full rounded-xl border px-3 py-2 min-h-[140px] bg-white dark:bg-gray-900"
                        placeholder='{"shift":"<uuid>","fare":"troncal"}'
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                    />
                    <div className="flex gap-3 mt-4">
                        <button className="btn" disabled={busy} onClick={simulate}>
                            {busy ? 'Procesando…' : 'Simular Escaneo Exitoso'}
                        </button>
                        <button className="btn-outline" onClick={() => setRaw('')}>Limpiar</button>
                    </div>
                </div>
            </div>
        </RequireRole>
    )
}
