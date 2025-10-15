'use client'
import {useEffect, useRef, useState} from 'react'
//deprecated
export default function CameraProbe() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [log, setLog] = useState<string>('Pulsa “Activar cámara”')

    const start = async () => {
        try {
            setLog('Solicitando cámara...')
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false
            })
            if (!videoRef.current) return
            videoRef.current.srcObject = stream
            await videoRef.current.play()
            setLog('Cámara activa ✅')
        } catch (e: any) {
            setLog(`Error: ${e?.name || e?.message || e}`)
        }
    }

    useEffect(() => {
        return () => {
            const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks() || []
            tracks.forEach(t => t.stop())
        }
    }, [])

    return (
        <div className="w-full max-w-md mx-auto">
            <button className="btn w-full mb-3" onClick={start}>Activar cámara</button>
            <div className="relative w-full rounded-2xl border overflow-hidden bg-black/40" style={{height: 320}}>
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    autoPlay
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                />
            </div>
            <div className="text-xs mt-2 text-gray-500">{log}</div>
        </div>
    )
}
