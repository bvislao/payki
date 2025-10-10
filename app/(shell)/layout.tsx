import '@/styles/globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Provider } from '@/lib/store'
import {Bus, Shield, UserRound} from 'lucide-react'

export const metadata: Metadata = {
    title: 'PAYKI',
    description: 'PWA de pagos para transporte público de Perú'
}

export default function RootLayout({ children }: { children:
        React.ReactNode }) {

    return (
        <html lang="es">
        <head>
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#00ad86" />
        </head>
        <body>
        <Provider>
            {/*<PWARegisterClient />*/}
            <header className="sticky top-0 z-30 backdrop-blur border-b bordergray-200/60 dark:border-gray-800 bg-white/70 dark:bg-gray-950/70">
                <nav className="container flex items-center justify-between
h-14">
                    <Link href="/" className="font-semibold tracking-tight">PAYKI</
                        Link>
                    <div className="flex items-center gap-2">
                       <Link className="btn-outline" href="/user"><UserRound
                            className="w-4 h-4"/> Usuario</Link>
                        <Link className="btn-outline" href="/driver"><Bus
                            className="w-4 h-4"/> Conductor</Link>
                        <Link className="btn-outline" href="/admin"><Shield
                            className="w-4 h-4"/> Admin</Link>
                    </div>
                </nav>
            </header>
            <main className="container py-6">
                {children}
            </main>
            <footer className="container py-8 text-xs text-center textgray-500">© {new Date().getFullYear()} PAYKI — Prototipo</footer>
        </Provider>
        </body>
        </html>
    )
}