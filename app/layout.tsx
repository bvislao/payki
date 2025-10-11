import '@/styles/globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth'
import HeaderClient from '@/components/HeaderClient'

export const metadata: Metadata = {
    title: 'PAYKI',
    description: 'PWA de pagos para transporte público de Perú',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
        <body suppressHydrationWarning>
        <AuthProvider>
            <header className="sticky top-0 z-30 backdrop-blur border-b border-gray-200/60 dark:border-gray-800 bg-white/70 dark:bg-gray-950/70">
                <HeaderClient />
            </header>
            <main className="container py-6">{children}</main>
            <footer className="container py-8 text-xs text-center text-gray-500">
                © {new Date().getFullYear()} PAYKI
            </footer>
        </AuthProvider>
        </body>
        </html>
    )
}
