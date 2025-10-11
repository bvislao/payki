'use client'
import { useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'

export default function UserPayPage() {
    const { userId, profile } = useAuth()
    const [qr, setQr] = useState('') // aquí pegarías el payload del QR del bus
    const [busy, setBusy] = useState(false)

    const simulateQuote = async () => {
        // si quisieras pre-visualizar el monto: llama fare_quote con operator_id+fare_code
    }

    const pay = async () => {
        if (!userId || !qr) return
        setBusy(true)
        try {
            // payload esperado del QR generado por el conductor: { shift, fare }
            const parsed = JSON.parse(qr) as { shift:string; fare:string }
            // necesitamos datos del shift para saber vehicle/operator/driver
            const { data: s } = await supabase
                .from('driver_shifts')
                .select('id,vehicle_id,operator_id,driver_id,status')
                .eq('id', parsed.shift).eq('status','open').single()

            if (!s) throw new Error('Jornada no válida')

            const benefit = (profile?.benefit ?? 'none') as 'none'|'student'|'police'|'firefighter'
            const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ride_pay`, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    passenger_id: userId,
                    driver_id: s.driver_id,
                    vehicle_id: s.vehicle_id,
                    operator_id: s.operator_id,
                    fare_code: parsed.fare,
                    benefit
                })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error || 'Error al pagar')
            alert(`Pago de S/ ${json.tx.amount.toFixed(2)} realizado con éxito`)
            setQr('')
        } catch (e:any) {
            alert(e.message)
        } finally { setBusy(false) }
    }

    return (
        <RequireRole role="passenger">
            <div className="max-w-lg mx-auto card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Pagar Pasaje (QR)</h2>
                <div className="border rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/40">
                    <div className="text-sm mb-2">Simula la cámara pegando el contenido del QR:</div>
                    <textarea className="w-full rounded-xl border p-3 h-28" value={qr} onChange={e=>setQr(e.target.value)}
                              placeholder='{"shift":"<uuid>","fare":"troncal"}' />
                    <div className="flex gap-2">
                        <button className="btn" disabled={busy || !qr} onClick={pay}>Simular Escaneo Exitoso</button>
                        <button className="btn-outline" onClick={()=>setQr('')}>Limpiar</button>
                    </div>
                </div>
            </div>
        </RequireRole>
    )
}
