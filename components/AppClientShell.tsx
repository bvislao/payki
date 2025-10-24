// components/AppClientShell.tsx
'use client'

import { Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function AppClientShell({ children }: { children: React.ReactNode }) {
    const { loading, error, refreshProfile } = useAuth()

    if (loading) {
        return (
            <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur">
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">Cargando tu sesión…</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-dvh flex items-center justify-center">
                <div className="card p-6 max-w-md text-center space-y-3">
                    <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
                    <h2 className="text-lg font-semibold">No pudimos obtener tu perfil</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
                    <button className="btn w-full" onClick={() => refreshProfile()}>Reintentar</button>
                </div>
            </div>
        )
    }

    return <>{children}</>
}