'use client'
import { useEffect } from 'react'

export default function SWRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return; // 👈 clave
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(console.error)
        }
    }, [])
    return null
}
