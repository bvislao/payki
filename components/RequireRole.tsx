'use client'
import { useAuth } from '@/lib/auth'

export default function RequireRole({
                                        role, children
                                    }: { role: 'driver'|'passenger'|'admin', children: React.ReactNode }) {
    const { userId,profile, loading } = useAuth()
    if (loading) return <div className="card p-6">Cargando…</div>
    if (!userId) return <div className="card p-6">Inicia sesión.</div>
    if(!profile) return <div className="card p-6">Perfil no encontrado.</div>
    if (role === 'passenger' && profile.role !== 'passenger') return <div className="card p-6">Solo para pasajeros.</div>
    if (role === 'driver' && profile.role !== 'driver') return <div className="card p-6">Solo para conductores.</div>
    if (role === 'admin' && profile.role !== 'admin') return <div className="card p-6">Solo admins.</div>
    return <>{children}</>
}
