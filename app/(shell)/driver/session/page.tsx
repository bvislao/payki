'use client'
import {useEffect, useState} from 'react'
import RequireRole from '@/components/RequireRole'
import {useAuth} from '@/lib/auth'
import {supabase} from '@/lib/supabaseClient'
import DriverFareQR, {Fare} from '@/components/DriverFareQR'
import {callFunction} from "@/lib/functions";
import toast from "react-hot-toast";

type Shift = {
    id: string
    vehicle_id: string
    operator_id: string
    driver_id: string
    status: 'open' | 'closed'
    started_at: string
}

type Tx = { id: string; amount: number; type: 'ride' | 'topup'; ts?: string }


export default function DriverSession() {
    const {userId, profile} = useAuth()
    const [txs, setTxs] = useState<Tx[]>([])
    const [count, setCount] = useState(0)
    const [sum, setSum] = useState(0)
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
            .then(({data}) => data && setShift(data as Shift))

        // 1) Carga inicial opcional (de hoy)
        ;(async () => {
            const today = new Date().toISOString().slice(0, 10)
            const {data} = await supabase
                .from('transactions')
                .select('id, amount, type, ts')
                .eq('driver_id', userId)
                .eq('type', 'ride')
                .gte('ts', `${today}T00:00:00Z`)
                .order('ts', {ascending: false})
            const list = (data || []) as Tx[]
            setTxs(list)
            setCount(list.length)
            setSum(list.reduce((s, t) => s + Number(t.amount || 0), 0))
        })()

        const channel = supabase
            .channel(`tx_driver_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `driver_id=eq.${userId}`
                },
                (payload) => {
                    const row = payload.new as any
                    if (row?.type !== 'ride') return
                    const amt = Number(row.amount ?? 0)
                    setTxs(prev => [{id: row.id, amount: amt, type: 'ride', ts: row.ts}, ...prev])
                    setCount(prev => prev + 1)
                    setSum(prev => prev + amt)
                    // opcional: vibración/sonido
                    if (navigator.vibrate) navigator.vibrate(60)
                }
            )
            .subscribe((status) => {
                // opcional: logging
                // console.log('Realtime status', status)
            })
        return () => {
            supabase.removeChannel(channel)
        }

    }, [userId])

    // cargar tarifas del operador del shift
    useEffect(() => {
        if (!shift) return
        supabase
            .from('fares')
            .select('id,code,label,base_amount')
            .eq('operator_id', shift.operator_id)
            .then(({data}) => setFares((data || []) as Fare[]))
    }, [shift])

    const startShift = async () => {
        if (!userId) return
        setBusy(true)
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token!
            const res = await callFunction<{ ok: true; shift: any }>('start_shift', {driver_id: userId}, token)
            setShift(res.shift)
        } catch (e: any) {
            const msg = e?.message || ''
            if (msg.includes('NO_VEHICLE_ASSIGNED')) toast.error('No tienes vehículo asignado')
            else if (msg.includes('SHIFT_OPEN_EXISTS')) toast.error('Ya tienes una jornada abierta')
            else toast.error(msg)
        } finally {
            setBusy(false)
        }
    }

    const endShift = async () => {
        if (!shift) return
        await supabase
            .from('driver_shifts')
            .update({status: 'closed', ended_at: new Date().toISOString()})
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
                    <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-1 rounded-full bg-emerald-600/10 text-emerald-700">
            Pasajeros: {count}
          </span>
                        <span className="px-2 py-1 rounded-full bg-blue-600/10 text-blue-700">
            S/ {sum.toFixed(2)}
          </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {fares.map((f) => (
                            <DriverFareQR key={f.id} shiftId={shift.id} fare={f}/>
                        ))}
                    </div>

                    <h3 className="font-semibold mt-2">Transacciones recientes</h3>
                    <ul className="text-sm divide-y">
                        {txs.map(t => (
                            <li key={t.id} className="py-2 flex justify-between">
                                <span>Pago de pasaje</span>
                                <span className="text-green-600">+S/ {Number(t.amount).toFixed(2)}</span>
                            </li>
                        ))}
                        {txs.length === 0 && <li className="py-4 text-gray-500">Sin cobros aún.</li>}
                    </ul>

                    <button className="btn w-full mt-4" onClick={endShift}>
                        Terminar Jornada
                    </button>
                </div>
            )}
        </RequireRole>
    )
}
