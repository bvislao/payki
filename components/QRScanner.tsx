// components/QRScanner.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import {
    BrowserQRCodeReader,
    IScannerControls,
} from '@zxing/browser'

type Props = {
    onText: (text: string) => void
    height?: number
}

export default function QRScanner({ onText, height = 360 }: Props) {
    const [ready, setReady] = useState(false)                 // gesto del usuario (iOS)
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
    const [deviceId, setDeviceId] = useState<string | undefined>(undefined)
    const [status, setStatus] = useState<string>('Pulsa “Activar cámara”')
    const videoRef = useRef<HTMLVideoElement>(null)
    const readerRef = useRef<BrowserQRCodeReader | null>(null)
    const controlsRef = useRef<IScannerControls | null>(null)
    const lastScan = useRef(0)

    // listar cámaras
    useEffect(() => {
        (async () => {
            try {
                const streamPerm = await navigator.mediaDevices.getUserMedia({ video: true })
                streamPerm.getTracks().forEach(t => t.stop())
            } catch {} // solo para forzar permiso prompt

            const all = await navigator.mediaDevices.enumerateDevices()
            const cams = all.filter(d => d.kind === 'videoinput')
            setDevices(cams)

            // intenta la trasera
            const back = cams.find(d => /back|rear|environment|trase/i.test(d.label))
            setDeviceId((back ?? cams[0])?.deviceId)
        })().catch(() => {})
    }, [])

    const stop = () => {
        controlsRef.current?.stop()
        controlsRef.current = null
        const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks() || []
        tracks.forEach(t => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
    }

    useEffect(() => () => stop(), [])

    const handleDecode = (text: string) => {
        const now = Date.now()
        if (now - lastScan.current < 1200) return // debounce
        lastScan.current = now
        onText(text)
    }

    const start = async () => {
        if (!videoRef.current) return
        try {
            setReady(true)
            setStatus('Iniciando cámara…')
            stop()

            if (!readerRef.current) readerRef.current = new BrowserQRCodeReader()

            // decodeFromVideoDevice acepta deviceId (o undefined para auto)
            controlsRef.current = await readerRef.current.decodeFromVideoDevice(
                deviceId,
                videoRef.current,
                (result, err, controls) => {
                    if (result) {
                        setStatus('QR leído ✅')
                        handleDecode(result.getText())
                    } else if (err) {
                        // errores de escaneo son normales (no spamear)
                    }
                }
            )

            setStatus('Cámara activa ✅')
        } catch (e: any) {
            setStatus(`Error: ${e?.name || e?.message || e}`)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto">
            {/* selector y botón */}
            <div className="grid gap-2 mb-3">
                <label className="text-sm">
                    Cámara
                    <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={deviceId ?? ''}
                        onChange={(e) => setDeviceId(e.target.value || undefined)}
                    >
                        {devices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Cámara ${d.deviceId.slice(0, 4)}…`}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="btn" onClick={start}>Activar cámara</button>
            </div>

            {/* contenedor con altura fija → sin alto 0 */}
            <div className="relative w-full rounded-2xl border overflow-hidden bg-black/40" style={{ height }}>
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    autoPlay
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Marco visual */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-8 border-2 border-white/70 rounded-xl" />
                </div>
            </div>

            <div className="text-xs mt-2 text-gray-500">{status}</div>
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
                <li>• iPhone/Safari/PWA: HTTPS o localhost y dar permisos de cámara.</li>
                <li>• Si queda negra, cambia de cámara en el selector y vuelve a “Activar cámara”.</li>
            </ul>
        </div>
    )
}
