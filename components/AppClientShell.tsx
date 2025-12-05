'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertTriangle, WifiOff, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function AppClientShell({ children }: { children: React.ReactNode }) {
    const { loading, error, refreshProfile } = useAuth()

    // 🔒 Evita mismatch: no muestres UI dependiente del navegador hasta montar.
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    // Conectividad: inicia “desconocido” para no condicionar SSR
    const [online, setOnline] = useState<boolean | null>(null)
    useEffect(() => {
        setOnline(navigator.onLine)
        const onOnline = () => setOnline(true)
        const onOffline = () => setOnline(false)
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => {
            window.removeEventListener('online', onOnline)
            window.removeEventListener('offline', onOffline)
        }
    }, [])

    // Reintento automático (solo tras montar para no romper SSR)
    const [retryIn, setRetryIn] = useState<number | null>(null)
    const retryTimer = useRef<number | null>(null)
    useEffect(() => {
        if (!mounted) return
        if (!error || online === false) { // si hay error pero estás offline, no intentes aún
            setRetryIn(null)
            if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null }
            return
        }
        if (error && online) {
            let left = 5
            setRetryIn(left)
            retryTimer.current = window.setInterval(() => {
                left -= 1
                setRetryIn(left)
                if (left <= 0) {
                    clearInterval(retryTimer.current!)
                    retryTimer.current = null
                    void refreshProfile()
                }
            }, 1000)
        }
        return () => { if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null } }
    }, [mounted, error, online, refreshProfile])

    const clearSwAndCaches = async () => {
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations()
                await Promise.all(regs.map(r => r.unregister()))
            }
            if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map(k => caches.delete(k)))
            }
        } finally {
            window.location.reload()
        }
    }

    if (loading) {
        return (
            <div
                className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur"
                role="status"
                aria-live="polite"
                // Este atributo ayuda a evitar warnings por diferencias menores
                suppressHydrationWarning
            >
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">Cargando tu sesión…</div>

                {/* ⚠️ Solo después de montar muestro el banner offline */}
                {mounted && online === false && (
                    <div className="mt-2 inline-flex items-center gap-2 text-xs text-amber-600">
                        <WifiOff className="h-4 w-4" /> Sin conexión — la UI seguirá cargando al volver la red
                    </div>
                )}
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-dvh flex items-center justify-center p-4" suppressHydrationWarning>
                <div className="card p-6 max-w-md text-center space-y-3">
                    <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
                    <h2 className="text-lg font-semibold">No pudimos obtener tu perfil</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>

                    {mounted && online === false && (
                        <div className="text-xs inline-flex items-center justify-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full mx-auto">
                            <WifiOff className="h-4 w-4" /> Estás sin conexión. Reintentaremos cuando vuelva la red.
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <button className="btn w-full inline-flex items-center justify-center gap-2" onClick={() => refreshProfile()}>
                            <RefreshCw className="h-4 w-4" /> Reintentar ahora
                        </button>
                        <button
                            className="btn-outline w-full inline-flex items-center justify-center gap-2"
                            onClick={clearSwAndCaches}
                            title="Borrar Service Worker y cachés locales"
                        >
                            <Trash2 className="h-4 w-4" /> Limpiar caché SW
                        </button>
                    </div>

                    {mounted && online && retryIn !== null && (
                        <div className="text-xs text-gray-500">Reintento automático en {retryIn}s…</div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Banner offline solo tras montar, para evitar mismatch */}
            {mounted && online === false && (
                <div className="sticky top-0 z-[900] bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs py-1 text-center">
                    Estás sin conexión; algunas acciones se guardarán cuando vuelva la red.
                </div>
            )}
            {children}
        </>
    )
}