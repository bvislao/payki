'use client'
import { useEffect } from 'react'

export default function SWRegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .catch((err) => console.error('[SW] register error', err))
        }
    }, [])
    return null
}