'use client'
import { useEffect, useState } from 'react'
import RequireRole from '@/components/RequireRole'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { fetchPassengerSummary, type Activity } from '@/lib/balance'

export default function UserHome() {
    const { userId, email, profile } = useAuth()
    const [balance, setBalance] = useState(0)
    const [recent, setRecent] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        const load = async () => {
            if (!userId) { setLoading(false); return }
            const s = await fetchPassengerSummary(userId)
            if (!alive) return
            setBalance(s.balance)
            setRecent(s.recent)
            setLoading(false)
        }
        load()
        return () => { alive = false }
    }, [userId])

    return (
        <RequireRole role="passenger">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="card p-6 space-y-3">
                    <h2 className="text-xl font-semibold">Hola {email}</h2>
                    <div className="text-sm text-gray-500">Rol: <b>{profile?.role}</b></div>
                    <div className="text-2xl font-bold">Saldo: S/ {balance.toFixed(2)}</div>
                    <div className="grid grid-cols-2 gap-3">
                        <Link className="btn w-full" href="/user/pay">Pagar Pasaje (QR)</Link>
                        <Link className="btn-outline w-full" href="/user/recharge">Recargar Saldo</Link>
                    </div>
                </div>

                <div className="card p-6">
                    <h3 className="font-semibold mb-3">Actividad reciente (últimos 15)</h3>
                    {loading ? (
                        <div className="text-sm text-gray-500">Cargando…</div>
                    ) : recent.length === 0 ? (
                        <div className="text-sm text-gray-500">Sin movimientos.</div>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {recent.map(a => (
                                <li key={a.id} className="flex items-center justify-between">
                                    <span className="truncate pr-3">{a.label}</span>
                                    <span className={a.type === 'topup' ? 'text-green-600' : 'text-red-600'}>
                    {a.type === 'topup' ? '+' : '-'}S/ {a.amount.toFixed(2)}
                  </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <Link className="btn-outline" href="/user/nearby">Ver unidades cercanas</Link>
            </div>
        </RequireRole>
    )
}