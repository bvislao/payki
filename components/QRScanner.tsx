'use client'

import dynamic from 'next/dynamic'
import {useEffect, useRef, useState} from 'react'
import toast from 'react-hot-toast'

// Import dinámico sin SSR (muy importante en Next App Router)
const QrReader = dynamic(
    () => import('react-qr-reader').then(m => m.QrReader),
    { ssr: false }
)

type Props = {
    onText: (text: string) => void
    height?: number // alto del contenedor, ej. 320
}

export default function QRScanner({ onText, height = 320 }: Props) {
    const [ready, setReady] = useState(false)        // montar lector tras clic
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
    const [deviceId, setDeviceId] = useState<string | undefined>(undefined)
    const lastScanRef = useRef(0)

    // Listar cámaras
    useEffect(() => {
        if (!navigator.mediaDevices?.enumerateDevices) return
        navigator.mediaDevices.enumerateDevices().then(list => {
            const cams = list.filter(d => d.kind === 'videoinput')
            setDevices(cams)
            // si hay cámara trasera, intenta elegirla
            const back = cams.find(d => /back|trase|rear|environment/i.test(d.label))
            setDeviceId((back ?? cams[0])?.deviceId)
        }).catch(() => {})
    }, [])

    const handleDecode = (text: string) => {
        const now = Date.now()
        if (now - lastScanRef.current < 1200) return // debounce 1.2s
        lastScanRef.current = now
        onText(text)
    }

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            // Decodifica por imagen subida (fallback)
            const { BrowserQRCodeReader } = await import('@zxing/browser')
            const reader = new BrowserQRCodeReader()
            const imgUrl = URL.createObjectURL(file)
            const res = await reader.decodeFromImageUrl(imgUrl)
            URL.revokeObjectURL(imgUrl)
            handleDecode(res.getText())
        } catch (err: any) {
            toast.error('No se pudo leer el QR de la imagen')
        } finally {
            e.target.value = ''
        }
    }

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Botón para activar cámara (gesto de usuario → iOS) */}
            {!ready ? (
                <button
                    className="btn w-full mb-3"
                    onClick={() => setReady(true)}
                >
                    Activar cámara
                </button>
            ) : null}

            {/* Selector de cámara si hay varias */}
            {ready && devices.length > 1 && (
                <label className="block text-sm mb-2">
                    Cámara
                    <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={deviceId ?? ''}
                        onChange={(e) => setDeviceId(e.target.value || undefined)}
                    >
                        {devices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Cámara ${d.deviceId.slice(0,4)}…`}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {/* Contenedor con altura explícita y overflow-hidden */}
            <div
                className="relative w-full rounded-2xl border overflow-hidden bg-black/40"
                style={{ height }}
            >
                {ready ? (
                    <QrReader
                        constraints={{
                            // Si hay deviceId, úsalo; si no, pide environment
                            ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' })
                        }}
                        onResult={(result) => {
                            if (result) handleDecode(result.getText())
                        }}
                        // Asegura que el video ocupe el contenedor
                        videoContainerStyle={{ width: '100%', height: '100%' }}
                        videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center text-white/80 text-sm">
                        Permite cámara y pulsa “Activar cámara”
                    </div>
                )}

                {/* Máscara/retícula opcional */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-8 border-2 border-white/70 rounded-xl" />
                </div>
            </div>

            {/* Fallback: subir foto con el QR */}
            {/*<div className="mt-3 text-center">
                <label className="btn-outline cursor-pointer">
                    Leer desde imagen…
                    <input type="file" accept="image/*" className="hidden" onChange={onFile}/>
                </label>
            </div>*/}

            {/* Notas rápidas */}
            <ul className="mt-3 text-xs text-gray-500 space-y-1">
                <li>• En iPhone/Safari necesitas HTTPS o localhost, y dar permisos.</li>
                <li>• Si la vista es muy pequeña, aumenta el alto (prop <code>height</code>).</li>
            </ul>
        </div>
    )
}
