// lib/loading.tsx
'use client'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Ctx = {
    pending: number
    start: () => void
    stop: () => void
}
const LoadingCtx = createContext<Ctx | null>(null)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
    const [pending, setPending] = useState(0)

    // API manual para operaciones no-HTTP (tareas pesadas)
    const start = () => setPending(p => p + 1)
    const stop  = () => setPending(p => Math.max(0, p - 1))

    // Intercepta fetch del browser (esto incluye Supabase)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const original = window.fetch
        window.fetch = async (...args) => {
            setPending(p => p + 1)
            try {
                return await original(...args as Parameters<typeof fetch>)
            } finally {
                setPending(p => Math.max(0, p - 1))
            }
        }
        return () => { window.fetch = original }
    }, [])

    const value = useMemo(() => ({ pending, start, stop }), [pending])
    return <LoadingCtx.Provider value={value}>{children}</LoadingCtx.Provider>
}

export const useLoading = () => {
    const c = useContext(LoadingCtx)
    if (!c) throw new Error('LoadingProvider missing')
    return c
}