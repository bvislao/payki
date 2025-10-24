'use client'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function RequireRole({ role, children }:{ role:'passenger'|'driver'|'admin', children:React.ReactNode }) {
    const { loading, userId, profile } = useAuth()
    const router = useRouter()

    if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>
    if (!userId) { router.push('/login'); return null }
    if (profile?.role !== role) return <div className="p-6">Acceso denegado</div>

    return <>{children}</>
}