'use client'
import { FormEvent, useState } from 'react'
import { useStore, useId } from '@/lib/store'

export default function Page() {

    const { user, setBalance, addActivity } = useStore()
    const genId = useId('tx')
    const [amount, setAmount] = useState(10)
    const [card, setCard] = useState('4111111111111111')
    const [exp, setExp] = useState('12/28')
    const [cvv, setCvv] = useState('123')
    const onSubmit = (e: FormEvent) => {
        e.preventDefault()
        const a = Number(amount)
        if (!a || a <= 0) return alert('Monto inválido')
        setBalance(user.balance + a)
        addActivity({ id: genId(), type: 'topup', label: 'Recarga con tarjeta',
            amount: a, date: new Date().toLocaleString() })
        alert('Recarga realizada ')
        history.back()
    }

    return (
        <form onSubmit={onSubmit} className="max-w-lg mx-auto card p-6 spacey-4">
            <h2 className="text-xl font-semibold">Recargar saldo</h2>
            <label className="block text-sm">Monto (S/)
                <input className="mt-1 w-full rounded-xl border px-3 py-2 bg-white
dark:bg-gray-900" type="number" step="0.5" min="1" value={amount}
                       onChange={e=>setAmount(Number(e.target.value))}/>
            </label>
            <label className="block text-sm">Número de Tarjeta
                <input className="mt-1 w-full rounded-xl border px-3 py-2 bg-white
dark:bg-gray-900" value={card} onChange={e=>setCard(e.target.value)}/>
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Vencimiento
                    <input className="mt-1 w-full rounded-xl border px-3 py-2 bg-white
dark:bg-gray-900" value={exp} onChange={e=>setExp(e.target.value)}/>
                </label>
                <label className="block text-sm">CVV
                    <input className="mt-1 w-full rounded-xl border px-3 py-2 bg-white
dark:bg-gray-900" value={cvv} onChange={e=>setCvv(e.target.value)}/>
                </label>
            </div>
            <button className="btn w-full" type="submit">Confirmar Recarga</button>
        </form>
    );
}
