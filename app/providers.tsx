'use client'
import {AuthProvider} from '@/lib/auth'
import {LoadingProvider} from '@/lib/loading'
import GlobalLoadingOverlay from '@/components/GlobalLoadingOverlay'
import AppClientShell from "@/components/AppClientShell";

export default function Providers({children}: { children: React.ReactNode }) {
    return (
        <LoadingProvider>
            <AuthProvider>
                <AppClientShell>
                    {children}
                    <GlobalLoadingOverlay/>
                </AppClientShell>
            </AuthProvider>
        </LoadingProvider>
    )
}