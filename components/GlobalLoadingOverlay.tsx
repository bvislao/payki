'use client'
import { useLoading } from '@/lib/loading'

export default function GlobalLoadingOverlay() {
    const { pending } = useLoading()
    if (pending <= 0) return null
    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-2xl bg-white/90 dark:bg-gray-900/90 px-5 py-3 shadow-xl">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Cargando…</span>
            </div>
        </div>
    )
}