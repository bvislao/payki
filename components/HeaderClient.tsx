'use client'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import PushClient from '@/components/PushClient'

export default function HeaderClient() {
    const { userId, email, profile, signOut } = useAuth()

    return (
        <nav className="container flex items-center justify-between h-14">
            <Link href="/" aria-label="Inicio">
                <div className="flex items-center gap-2">
                    {/* LOGO SVG INLINE */}
                    <img src="/logo-bg.svg" alt="PAYKI" className="h-7 w-auto" />

                    {/* Texto accesible (oculto visualmente) */}
                    <span className="sr-only">PAYKI</span>
                </div>
            </Link>

            <div className="flex items-center gap-3">
                {userId && (
                    <span className="text-xs text-gray-600 dark:text-gray-300">
            Hola <b>{email}</b>! (<b>{profile?.role}</b>)
          </span>
                )}
                {!!userId && <PushClient />}

                {/*<Link className="btn-outline" href="/user">Usuario</Link>
                <Link className="btn-outline" href="/driver">Conductor</Link>
                <Link className="btn-outline" href="/admin">Admin</Link>*/}

                {userId ? (
                    <button className="btn-outline" onClick={async () => { await signOut(); window.location.href = '/' }}>
                        Cerrar sesión
                    </button>
                ) : (
                    <Link className="btn" href="/login">Login</Link>
                )}
            </div>
        </nav>
    )
}
