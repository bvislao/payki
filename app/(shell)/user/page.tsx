'use client'
import { useEffect, useState } from 'react'
import RequireRole from '@/components/RequireRole'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { fetchPassengerSummary } from '@/lib/balance'

type Activity = { id:string; type:'ride'|'topup'; label:string; amount:number; date:string }

export default function UserHome() {
    const { userId, email, profile } = useAuth()
    const [balance, setBalance] = useState(0)
    const [recent, setRecent] = useState<Activity[]>([])
    useEffect(() => {
        if (!userId) return
        fetchPassengerSummary(userId).then(s => { setBalance(s.balance); setRecent(s.recent) })
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
                    <h3 className="font-semibold mb-3">Actividad reciente</h3>
                    <ul className="space-y-2 text-sm">
                        {recent.map(a => (
                            <li key={a.id} className="flex justify-between">
                                <span>{a.label}</span>
                                <span className={a.type==='topup' ? 'text-green-600':'text-red-600'}>
                  {a.type==='topup' ? '+':'-'}S/ {a.amount.toFixed(2)}
                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <Link className="btn-outline" href="/user/nearby">Ver unidades cercanas</Link>
            </div>
        </RequireRole>
    )
}
