'use client'

import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function AppClientShell({ children }: { children: React.ReactNode }) {
    const { loading, syncing } = useAuth()

    if (loading) {
        return (
            <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur">
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    Cargando tu sesión…
                </div>
            </div>
        )
    }

    return (
        <>
            {children}
            {syncing && (
                <div className="pointer-events-none fixed right-3 top-3 z-[1000] inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sincronizando…
                </div>
            )}
        </>
    )
}