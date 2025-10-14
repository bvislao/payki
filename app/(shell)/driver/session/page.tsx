'use client'
import { useEffect, useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import DriverFareQR, { Fare } from '@/components/DriverFareQR'

type Shift = {
    id: string
    vehicle_id: string
    operator_id: string
    driver_id: string
    status: 'open' | 'closed'
    started_at: string
}

export default function DriverSession() {
    const { userId, profile } = useAuth()
    const [shift, setShift] = useState<Shift | null>(null)
    const [fares, setFares] = useState<Fare[]>([])
    const [busy, setBusy] = useState(false)

    // cargar shift activo
    useEffect(() => {
        if (!userId) return
        supabase
            .from('driver_shifts')
            .select('*')
            .eq('driver_id', userId)
            .eq('status', 'open')
            .maybeSingle()
            .then(({ data }) => data && setShift(data as Shift))
    }, [userId])

    // cargar tarifas del operador del shift
    useEffect(() => {
        if (!shift) return
        supabase
            .from('fares')
            .select('id,code,label,base_amount')
            .eq('operator_id', shift.operator_id)
            .then(({ data }) => setFares((data || []) as Fare[]))
    }, [shift])

    const startShift = async () => {
        if (!userId) return
        setBusy(true)
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token!
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('.co', '.co/functions/v1')}/start_shift`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ driver_id: userId })
                }
            )
            if (!res.ok) throw new Error(await res.text())
            const json = await res.json()
            setShift(json.shift as Shift)
        } finally {
            setBusy(false)
        }
    }

    const endShift = async () => {
        if (!shift) return
        await supabase
            .from('driver_shifts')
            .update({ status: 'closed', ended_at: new Date().toISOString() })
            .eq('id', shift.id)
        setShift(null)
    }

    return (
        <RequireRole role="driver">
            {!shift ? (
                <div className="max-w-xl mx-auto card p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Iniciar Jornada</h2>
                    <button className="btn w-full" disabled={busy} onClick={startShift}>
                        {busy ? 'Validando…' : 'Iniciar Jornada'}
                    </button>
                </div>
            ) : (
                <div className="card p-6 space-y-4">
                    <div className="text-xl font-semibold">Jornada Activa</div>
                    <p className="text-sm text-gray-500">
                        Conductor {profile?.full_name} · Vehículo {shift.vehicle_id}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {fares.map((f) => (
                            <DriverFareQR key={f.id} shiftId={shift.id} fare={f} />
                        ))}
                    </div>

                    <button className="btn w-full mt-4" onClick={endShift}>
                        Terminar Jornada
                    </button>
                </div>
            )}
        </RequireRole>
    )
}
