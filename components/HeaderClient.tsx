'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import PushClient from '@/components/PushClient'
import { useEffect, useState } from 'react'

type NavItem = { href: string; label: string; roles?: Array<'passenger'|'driver'|'admin'> }

const NAV: NavItem[] = [
    { href: '/user',   label: 'Usuario',    roles: ['passenger','admin'] },
    { href: '/driver', label: 'Conductor',  roles: ['driver','admin'] },
    { href: '/admin',  label: 'Admin',      roles: ['admin'] },
]

function cx(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(' ')
}

export default function HeaderClient() {
    const { userId, email, profile, signOut } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    // cerrar menú móvil al cambiar de ruta
    useEffect(() => { setOpen(false) }, [pathname])

    // navegación filtrada por rol
    const role = profile?.role ?? null
    const navItems = NAV.filter(i => !i.roles || (role && i.roles.includes(role)))

    return (
        <nav className="container flex items-center justify-between h-14">
            {/* Brand */}
            <Link href="/" aria-label="Inicio" className="flex items-center gap-2 shrink-0">
                <img src="/logo-bg.svg" alt="PAYKI" className="h-7 w-auto" />
                <span className="sr-only">PAYKI</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cx(
                            'px-3 py-1.5 rounded-xl text-sm transition-colors',
                            pathname.startsWith(item.href)
                                ? 'bg-emerald-600 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                    >
                        {item.label}
                    </Link>
                ))}

                {userId && <PushClient />}

                {userId ? (
                    <button
                        className="btn-outline"
                        onClick={async () => { await signOut(); window.location.href = '/' }}
                        aria-label="Cerrar sesión"
                    >
                        Cerrar sesión
                    </button>
                ) : (
                    <Link className="btn" href="/login">Login</Link>
                )}
            </div>

            {/* User pill (desktop) */}
            <div className="hidden md:block ml-3">
                {userId && (
                    <span className="text-xs text-gray-600 dark:text-gray-300">
            Hola <b className="truncate max-w-[220px] inline-block align-bottom">{email}</b> · <b>{role}</b>
          </span>
                )}
            </div>

            {/* Mobile: toggle */}
            <button
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label="Abrir menú"
            >
                <span className="sr-only">Abrir menú</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="stroke-current">
                    <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
            </button>

            {/* Mobile drawer */}
            <div
                id="mobile-menu"
                className={cx(
                    'md:hidden absolute left-0 right-0 top-14 z-40 border-b border-gray-200/60 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur',
                    open ? 'block' : 'hidden'
                )}
            >
                <div className="container py-3 flex flex-col gap-2">
                    {userId && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 px-2">
                            Hola <b>{email}</b> · <b>{role}</b>
                        </div>
                    )}

                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cx(
                                'px-3 py-2 rounded-xl text-sm',
                                pathname.startsWith(item.href)
                                    ? 'bg-emerald-600 text-white'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}

                    <div className="flex items-center gap-2 px-2">
                        {userId && <PushClient />}
                        {userId ? (
                            <button
                                className="btn-outline w-full"
                                onClick={async () => { await signOut(); window.location.href = '/' }}
                            >
                                Cerrar sesión
                            </button>
                        ) : (
                            <Link className="btn w-full" href="/login">Login</Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
