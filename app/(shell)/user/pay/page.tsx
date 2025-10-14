'use client'
import { useEffect, useMemo, useState } from 'react'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { callFunction } from '@/lib/functions'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
const QrReader = dynamic(
    () => import('react-qr-reader').then(m => m.QrReader),
    { ssr: false }
)

type QRPayload = { shift?: string; fare?: string }

export default function PayQRPage() {
    const { userId } = useAuth()
    const [busy, setBusy] = useState(false)
    const [manual, setManual] = useState('')              // fallback manual
    const [hasCam, setHasCam] = useState<boolean | null>(null)

    // Detecta si hay cámara disponible
    useEffect(() => {
        // El componente ya maneja detection, pero usamos esto para mostrar UI adecuada
        (async () => {
            try {
                const devices = await navigator.mediaDevices?.enumerateDevices?.()
                const cam = devices?.some(d => d.kind === 'videoinput')
                setHasCam(cam ?? false)
            } catch {
                setHasCam(false)
            }
        })()
    }, [])

    const handlePayload = async (payload: string) => {
        if (!userId) return toast.error('Inicia sesión')
        let obj: QRPayload
        try {
            obj = JSON.parse(payload)
            if (!obj.shift || !obj.fare) throw new Error('Formato inválido')
        } catch {
            return toast.error('QR inválido')
        }

        setBusy(true)
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token
            if (!token) throw new Error('Sin sesión')
            const res = await callFunction<{ ok: true; tx: { id: string; amount: number } }>(
                'ride_pay',
                { shift: obj.shift, fare: obj.fare, passenger_id: userId },
                token
            )
            toast.success(`Pago realizado: S/ ${Number(res.tx.amount).toFixed(2)}`)
            setManual('')
        } catch (e: any) {
            const msg = e?.message || ''
            if (msg.includes('NO_VEHICLE_ASSIGNED')) toast.error('Jornada sin vehículo')
            else if (msg.includes('SHIFT_CLOSED')) toast.error('Jornada finalizada')
            else if (msg.includes('FARE_NOT_FOUND')) toast.error('Tarifa no válida')
            else toast.error(msg || 'Error al pagar')
        } finally {
            setBusy(false)
        }
    }

    // Para evitar lecturas múltiples por el mismo cuadro, “debounce” sencillo:
    const [lastScan, setLastScan] = useState(0)
    const onScan = (values: string[]) => {
        const now = Date.now()
        if (now - lastScan < 1500) return
        setLastScan(now)
        if (values?.[0]) handlePayload(values[0])
    }

    return (
        <RequireRole role="passenger">
            <div className="max-w-2xl mx-auto card p-6 space-y-5">
                <h2 className="text-2xl font-semibold">Pagar Pasaje (QR)</h2>

                {/* Bloque de escaneo por cámara */}
                <div className="space-y-3">
                    <div className="text-sm text-gray-400">
                        Apunta la cámara al QR del conductor. El QR contiene un JSON como: {`{ "shift": "<uuid>", "fare": "troncal" }`}
                    </div>

                    {hasCam ? (
                        <div className="overflow-hidden rounded-2xl border">
                            <QrReader
                                constraints={{ facingMode: 'environment' }}
                                onResult={(result, error) => {
                                    if (!!result) {
                                        const text = result.getText()
                                        handlePayload(text)  // tu función
                                    }
                                    if (!!error) {
                                        // suele spamear; ignóralo o muestra un log
                                        // console.debug(error)
                                    }
                                }}
                            />
                        </div>
                    ) : hasCam === false ? (
                        <div className="rounded-xl border p-4 text-sm text-amber-600">
                            No se detectó cámara (o el navegador no dio permiso). Usa la entrada manual más abajo.
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400">Comprobando cámara…</div>
                    )}
                </div>

                {/* Fallback: pegar el payload manualmente */}
                <div className="rounded-2xl border p-4 space-y-3">
                    <div className="text-sm text-gray-400">¿No puedes usar la cámara? Pega el contenido del QR:</div>
                    <textarea
                        className="w-full rounded-xl border px-3 py-2 min-h-[120px] bg-white dark:bg-gray-900"
                        placeholder='{"shift":"<uuid>","fare":"troncal"}'
                        value={manual}
                        onChange={(e) => setManual(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button className="btn" disabled={busy} onClick={() => handlePayload(manual)}>
                            {busy ? 'Procesando…' : 'Pagar con payload'}
                        </button>
                        <button className="btn-outline" onClick={() => setManual('')}>Limpiar</button>
                    </div>
                </div>
            </div>
        </RequireRole>
    )
}
