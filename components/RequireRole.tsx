// components/RequireRole.tsx
'use client'

import Link from 'next/link'
import { useAuth, Role } from '@/lib/auth'
import { Loader2, LockKeyhole } from 'lucide-react'

export default function RequireRole({ role, children }: { role: Role, children: React.ReactNode }) {
    const { loading, error, userId, profile } = useAuth()

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="card p-6 text-center space-y-2">
                <div className="text-sm text-red-600">Error: {error}</div>
                <div className="text-xs text-gray-500">Refresca e inténtalo nuevamente.</div>
            </div>
        )
    }

    if (!userId) {
        return (
            <div className="card p-6 text-center space-y-3">
                <LockKeyhole className="h-6 w-6 mx-auto" />
                <div className="text-sm">Necesitas iniciar sesión para acceder.</div>
                <Link className="btn" href="/login">Ir a Login</Link>
            </div>
        )
    }

    if (profile?.role !== role) {
        return (
            <div className="card p-6 text-center space-y-2">
                <LockKeyhole className="h-6 w-6 mx-auto" />
                <div className="text-sm">Acceso restringido. Requiere rol <b>{role}</b>.</div>
            </div>
        )
    }

    return <>{children}</>
}