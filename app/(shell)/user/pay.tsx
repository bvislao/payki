'use client'
import { useStore, useId } from '@/lib/store'
import { Camera, CheckCircle } from 'lucide-react'

export default function Pay() {
    const { user, setBalance, addActivity } = useStore()
    const genId = useId('tx')
    const amount = 2.5
    const simulate = () => {
        if (user.balance < amount) return alert('Saldo insuficiente')
        setBalance(user.balance - amount)
        addActivity({ id: genId(), type: 'ride', label: 'Pago de pasaje QR',
            amount: -amount, date: new Date().toLocaleString() })
        alert(`Pago de S/ ${amount.toFixed(2)} realizado con éxito`)
        history.back()
    }

    return (
        <div className="max-w-lg mx-auto card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Escanear QR</h2>
            <div className="aspect-video rounded-xl border border-dashed grid
place-items-center text-gray-500">
                <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8"/>
                    <p>Simulación de cámara</p>
                </div>
            </div>
            <button onClick={simulate} className="btn w-full"><CheckCircle
                className="w-4 h-4"/> Simular Escaneo Exitoso</button>
            <p className="text-xs text-gray-500">Se descontarán S/
                {amount.toFixed(2)} del saldo.</p>
        </div>
    );
}
