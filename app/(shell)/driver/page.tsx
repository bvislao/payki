'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'

export default function Page() {
    const { driverSession } = useStore()

    return (
        <div className="max-w-xl mx-auto card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Conductor</h2>
            {!driverSession ? (
                <Link className="btn w-full" href="/driver/session/">Iniciar Jornada</
                    Link>
            ) : (
                <Link className="btn w-full" href="/driver/session/">Ir a Jornada</
                    Link>
            )}
        </div>
    )
}
