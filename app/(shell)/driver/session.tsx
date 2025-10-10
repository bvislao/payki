'use client'
import { useStore, useId } from '@/lib/store'
import QRModal from '@/components/QRModal'

export default function Session() {
    const { driverSession, startShift, endShift } = useStore()
    const genId = useId('drvtx')
    if (!driverSession) {
    // iniciar por defecto con d1
        return (
            <div className="max-w-xl mx-auto card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Iniciar Jornada</h2>
                <button className="btn w-full" onClick={() => startShift('d1')}
                >Iniciar Jornada</button>
            </div>
        )
    }
    const { driverId, unitId, route, fares, transactions } = driverSession
    const makeQR = (label: string, amount: number) => {
        const payload = JSON.stringify({ id: genId(), amount, unitId, driverId,
            ts: Date.now(), label })
// Simulamos que mostrar el QR también genera una transacción de ingreso para el resumen de fin de jornada
        transactions.push({ id: genId(), type: 'topup', label: `Cobro ${label}`,
            amount, date: new Date().toLocaleString() })
        return payload
    }
    const finish = () => {
        const res = endShift()
        alert(`Jornada finalizada. Pasajeros: ${res.count} | Ingresos: S/ $
{res.total.toFixed(2)}`)
        history.back()
    }
    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6 space-y-2">
                <h2 className="text-xl font-semibold">Jornada Activa</h2>
                <p className="text-sm text-gray-500">Conductor {driverId} — Bus
                    {unitId} — {route}</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                    {fares.map(f => (
                        <div key={f.label} className="space-y-2">
                            <div className="text-sm font-medium">{f.label} S/
                                {f.amount.toFixed(2)}</div>
                            <QRModal value={makeQR(f.label, f.amount)} />
                        </div>
                    ))}
                </div>
                <button className="btn w-full mt-4" onClick={finish}>Terminar
                    Jornada</button>
            </div>
            <div className="card p-6">
                <h3 className="font-semibold mb-3">Transacciones del día</h3>
                <ul className="space-y-2 text-sm">
                    {transactions.map(t => (
                        <li key={t.id} className="flex items-center justify-between">
                            <span>{t.label}</span>
                            <span className="text-green-600">+S/ {t.amount.toFixed(2)}</
                                span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
