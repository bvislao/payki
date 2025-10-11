'use client'
import Link from 'next/link'
import RequireRole from '@/components/RequireRole'
import { useAuth } from '@/lib/auth'

export default function DriverHome() {
    const { profile } = useAuth()
    return (
        <RequireRole role="driver">
            <div className="max-w-xl mx-auto card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Conductor — {profile?.full_name}</h2>
                <Link className="btn w-full" href="/driver/session">Ir a Jornada</Link>
            </div>
        </RequireRole>
    )
}
