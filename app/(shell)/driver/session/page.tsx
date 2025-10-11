'use client'
import { useEffect, useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { callFunction } from '@/lib/functions'
import QRModal from '@/components/QRModal'
import toast from "react-hot-toast";

type Shift = {
    id: string
    vehicle_id: string
    operator_id: string
    driver_id: string
    started_at: string
    status: 'open' | 'closed'
}
type Fare = { id: string; code: string; label: string; base_amount: number }
type Benefit = 'none' | 'student' | 'police' | 'firefighter'
type TxRow = { id: string; label: string; amount: number }

export default function DriverSession() {
    const { userId, profile } = useAuth()
    const [shift, setShift] = useState<Shift | null>(null)
    const [fares, setFares] = useState<Fare[]>([])
    const [txs, setTxs] = useState<TxRow[]>([])
    const [busy, setBusy] = useState(false)

    // Helper: exige token sin usar non-null assertion
    async function requireToken(): Promise<string> {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error('No hay sesión activa')
        return token
    }

    useEffect(() => {
        if (!userId) return
            ;(async () => {
            const { data } = await supabase
                .from('driver_shifts')
                .select('*')
                .eq('driver_id', userId)
                .eq('status', 'open')
                .maybeSingle()
            if (data) setShift(data as Shift)
        })()
    }, [userId])

    useEffect(() => {
        if (!shift) return
            ;(async () => {
            const { data } = await supabase
                .from('fares')
                .select('id,code,label,base_amount')
                .eq('operator_id', shift.operator_id)
            setFares((data as Fare[] | null) ?? [])
        })()
    }, [shift])

    const start = async () => {
        if (!userId) return
        setBusy(true)
        try {
            const token = await requireToken()
            const res = await callFunction<{ ok: true; shift: Shift }>(
                'start_shift',
                { driver_id: userId },
                token
            )
            setShift(res.shift)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            const friendly =
                msg === 'FORBIDDEN'
                    ? 'No eres admin'
                    : msg === 'NO_VEHICLE_ASSIGNED'
                        ? 'No tienes vehículo asignado'
                        : msg
            toast.success(friendly)
        } finally {
            setBusy(false)
        }
    }

    const registerFare = async (f: Fare) => {
        if (!userId || !shift) return
        setBusy(true)
        try {
            // para demo: toma el primer pasajero que encuentre
            const { data: p } = await supabase
                .from('profiles')
                .select('id,benefit')
                .eq('role', 'passenger')
                .limit(1)

            const passenger = p?.[0] as { id: string; benefit?: Benefit } | undefined
            const benefit: Benefit = passenger?.benefit ?? 'none'
            const token = await requireToken()

            const res = await callFunction<{ ok: true; tx: { id: string; amount: number } }>(
                'ride_pay',
                {
                    passenger_id: passenger?.id,
                    driver_id: userId,
                    vehicle_id: shift.vehicle_id,
                    operator_id: shift.operator_id,
                    fare_code: f.code,
                    benefit,
                },
                token
            )

            setTxs((prev) => [
                { id: res.tx.id, label: `Cobro ${f.label}`, amount: res.tx.amount },
                ...prev,
            ])
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            toast.error(msg)
        } finally {
            setBusy(false)
        }
    }

    const finish = async () => {
        if (!shift) return
        const { count, sum } = txs.reduce(
            (a, t) => ({ count: a.count + 1, sum: a.sum + t.amount }),
            { count: 0, sum: 0 }
        )
        toast.success(`Jornada finalizada. Pasajeros: ${count} | Ingresos: S/ ${sum.toFixed(2)}`)
        await supabase
            .from('driver_shifts')
            .update({ status: 'closed', ended_at: new Date().toISOString() })
            .eq('id', shift.id)
        setShift(null)
        setTxs([])
    }

    return (
        <RequireRole role="driver">
            {!shift ? (
                <div className="max-w-xl mx-auto card p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Iniciar Jornada</h2>
                    <button className="btn w-full" disabled={busy} onClick={start}>
                        {busy ? 'Validando…' : 'Iniciar Jornada'}
                    </button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="card p-6 space-y-2">
                        <h2 className="text-xl font-semibold">Jornada Activa</h2>
                        <p className="text-sm text-gray-500">
                            Conductor {profile?.full_name} — Vehículo {shift.vehicle_id}
                        </p>
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                            {fares.map((f) => (
                                <div key={f.id} className="space-y-2">
                                    <div className="text-sm font-medium">
                                        {f.label} S/ {Number(f.base_amount).toFixed(2)}
                                    </div>
                                    <QRModal value={JSON.stringify({ shift: shift.id, fare: f.code })} />
                                    <button className="btn w-full" disabled={busy} onClick={() => registerFare(f)}>
                                        Registrar Cobro
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className="btn w-full mt-4" onClick={finish}>
                            Terminar Jornada
                        </button>
                    </div>

                    <div className="card p-6">
                        <h3 className="font-semibold mb-3">Transacciones del día</h3>
                        <ul className="space-y-2 text-sm">
                            {txs.map((t) => (
                                <li key={t.id} className="flex items-center justify-between">
                                    <span>{t.label}</span>
                                    <span className="text-green-600">+S/ {t.amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </RequireRole>
    )
}
