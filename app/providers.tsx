'use client'
import { AuthProvider } from '@/lib/auth'
import { LoadingProvider } from '@/lib/loading'
import GlobalLoadingOverlay from '@/components/GlobalLoadingOverlay'

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LoadingProvider>
            <AuthProvider>
                {children}
                <GlobalLoadingOverlay />
            </AuthProvider>
        </LoadingProvider>
    )
}