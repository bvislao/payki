'use client'
import QRModal from '@/components/QRModal'

export type Fare = { id: string; code: string; label: string; base_amount: number }

export default function DriverFareQR({
                                         shiftId,
                                         fare
                                     }: {
    shiftId: string
    fare: Fare
}) {
    // Payload mínimo que el pasajero debe leer y enviar a la Edge Function `ride_pay`
    const payload = JSON.stringify({
        shift: shiftId,     // jornada activa del chofer
        fare: fare.code     // código de tarifa (p.ej., 'troncal', 'general')
    })

    return (
        <div className="space-y-2 rounded-xl border p-3">
            <div className="text-sm font-medium">
                {fare.label} · S/ {Number(fare.base_amount).toFixed(2)}
            </div>
            <QRModal value={payload} title={`Cobro ${fare.label}`} />
        </div>
    )
}
