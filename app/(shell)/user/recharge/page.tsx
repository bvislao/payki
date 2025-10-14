'use client'
import { useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function RechargePage() {
    const { userId } = useAuth()
    const [amount, setAmount] = useState<number>(10)
    const [card, setCard] = useState('4111 1111 1111 1111')
    const [exp, setExp] = useState('12/28')
    const [cvv, setCvv] = useState('123')
    const [busy, setBusy] = useState(false)

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!userId) return
        if (!amount || amount <= 0) return toast.error('Monto inválido')
        setBusy(true)
        try {
            const { error } = await supabase
                .from('transactions')
                .insert({
                    type: 'topup',
                    passenger_id: userId,
                    amount: Number(amount),
                    meta: { method: 'card', card_last4: card.slice(-4), exp }
                })

            if (error) throw error

            toast.success('Recarga exitosa')
            // opcional: limpiar campos
            // setAmount(10); setCard('4111 1111 1111 1111'); setExp('12/28'); setCvv('123');
            // opcional: refrescar balance/actividad si tu UI lo calcula
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            toast.error(msg)
        } finally {
            setBusy(false)
        }
    }

    return (
        <RequireRole role="passenger">
            <form onSubmit={submit} className="max-w-md mx-auto card p-6 space-y-3">
                <h2 className="text-xl font-semibold">Recargar Saldo</h2>

                <label className="text-sm">Monto (S/)
                    <input
                        type="number"
                        step="0.5"
                        min={0.5}
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                    />
                </label>

                <label className="text-sm">Número de Tarjeta
                    <input
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={card}
                        onChange={e => setCard(e.target.value)}
                    />
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">Vencimiento
                        <input
                            className="mt-1 w-full rounded-xl border px-3 py-2"
                            value={exp}
                            onChange={e => setExp(e.target.value)}
                        />
                    </label>
                    <label className="text-sm">CVV
                        <input
                            className="mt-1 w-full rounded-xl border px-3 py-2"
                            value={cvv}
                            onChange={e => setCvv(e.target.value)}
                        />
                    </label>
                </div>

                <button className="btn w-full" disabled={busy}>
                    {busy ? 'Procesando…' : 'Confirmar Recarga'}
                </button>
            </form>
        </RequireRole>
    )
}
