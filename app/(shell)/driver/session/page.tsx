'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, useId } from '@/lib/store'
import QRModal from '@/components/QRModal'
import { Clock, Bus, MapPin, Users, TrendingUp } from 'lucide-react'

export default function Page() {
    const router = useRouter()
    const { driverSession, startShift, endShift, drivers } = useStore()
    const genId = useId('drvtx')
    const [qrData, setQrData] = useState<{ label: string; amount: number; payload: string } | null>(null)

    // Calcular estadísticas en tiempo real
    const stats = useMemo(() => {
        if (!driverSession) return null
        const total = driverSession.transactions.reduce((sum, t) => sum + t.amount, 0)
        const count = driverSession.transactions.length
        const avgFare = count > 0 ? total / count : 0
        return { total, count, avgFare }
    }, [driverSession])

    if (!driverSession) {
        const availableDrivers = drivers.filter(d => !d.onShift)

        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="card p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                            <Bus className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold">Iniciar Jornada</h2>
                        <p className="text-gray-500">Selecciona un conductor para comenzar</p>
                    </div>

                    <div className="space-y-3">
                        {availableDrivers.map(driver => (
                            <button
                                key={driver.id}
                                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                                onClick={() => startShift(driver.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">{driver.name}</div>
                                        <div className="text-sm text-gray-500">ID: {driver.id}</div>
                                    </div>
                                    <div className="text-blue-600 font-medium">Iniciar →</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const { driverId, unitId, route, fares, transactions, startedAt } = driverSession
    const driver = drivers.find(d => d.id === driverId)
    const duration = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000 / 60)

    const handleShowQR = (label: string, amount: number) => {
        const payload = JSON.stringify({
            id: genId(),
            amount,
            unitId,
            driverId,
            ts: Date.now(),
            label
        })
        setQrData({ label, amount, payload })
    }

    const finish = () => {
        const res = endShift()
        const confirmed = confirm(
            `¿Finalizar jornada?\n\n` +
            `Pasajeros atendidos: ${res.count}\n` +
            `Total recaudado: S/ ${res.total.toFixed(2)}\n` +
            `Duración: ${duration} minutos`
        )
        if (confirmed) {
            router.back()
        }
    }

    return (
        <div className="space-y-6">
            {/* Header con información del conductor */}
            <div className="card p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Bus className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{driver?.name || driverId}</h2>
                                <p className="text-sm text-gray-500">Jornada Activa</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Bus className="w-4 h-4 text-gray-400" />
                                <span>Unidad {unitId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{route}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>{duration} min</span>
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn btn-sm bg-red-500 hover:bg-red-600 text-white"
                        onClick={finish}
                    >
                        Finalizar
                    </button>
                </div>
            </div>

            {/* Estadísticas */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pasajeros</p>
                                <p className="text-2xl font-bold">{stats.count}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Recaudado</p>
                                <p className="text-2xl font-bold text-green-600">S/ {stats.total.toFixed(2)}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Tarifa Promedio</p>
                                <p className="text-2xl font-bold">S/ {stats.avgFare.toFixed(2)}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Tarifas y QR */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-lg font-semibold">Generar QR de Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {fares.map(f => (
                            <button
                                key={f.label}
                                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center space-y-1"
                                onClick={() => handleShowQR(f.label, f.amount)}
                            >
                                <div className="text-xs text-gray-500 uppercase">{f.label}</div>
                                <div className="text-2xl font-bold text-blue-600">S/ {f.amount.toFixed(2)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Transacciones */}
                <div className="card p-6">
                    <h3 className="font-semibold mb-4">Historial de Transacciones</h3>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {transactions.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No hay transacciones aún</p>
                                <p className="text-xs text-gray-400 mt-1">Los pagos aparecerán aquí</p>
                            </div>
                        ) : (
                            transactions.map((t, idx) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-600">
                                            {transactions.length - idx}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{t.label}</div>
                                            <div className="text-xs text-gray-500">{t.date}</div>
                                        </div>
                                    </div>
                                    <span className="text-green-600 font-semibold">
                                        +S/ {t.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {qrData && (
                <QRModal
                    value={qrData.payload}
                />
            )}
        </div>
    )
}