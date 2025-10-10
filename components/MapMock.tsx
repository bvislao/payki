'use client'
import { MapPin, Bus } from 'lucide-react'
import { useStore } from '@/lib/store'
export default function MapMock() {
    const { buses } = useStore()
    return (
        <div className="card p-4">
            <h3 className="font-semibold mb-3">Unidades Cercanas (simulado)</h3>
            <div className="relative h-64 w-full rounded-xl bg-gradient-to-br fromsky-100 to-emerald-100 dark:from-sky-900/40 dark:to-emerald-900/30 overflowhidden">
                {/* ubicación fija del usuario */}
                <div className="absolute left-[45%] top-[60%] -translate-x-1/2 -
translate-y-1/2 flex items-center gap-1 text-xs">
                    <MapPin className="w-5 h-5 text-payki-600"/>
                    <span>Tú</span>
                </div>
                {/* buses simulados */}
                {buses.map(b => (
                    <div key={b.id} className="absolute" style={{left: `${b.pos.x}%`,
                        top: `${b.pos.y}%`}}>
                        <div className="flex items-center gap-1 text-xs">
                            <Bus className="w-4 h-4"/> <span>{b.id}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}