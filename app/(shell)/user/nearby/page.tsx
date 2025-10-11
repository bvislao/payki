'use client'
import RequireRole from '@/components/RequireRole'
import { Bus } from 'lucide-react'

export default function Nearby() {
    const buses = [
        { id:'B-102', x: 30, y: 40 },
        { id:'B-205', x: 55, y: 20 },
        { id:'B-311', x: 70, y: 65 },
    ]
    const user = { x: 50, y: 50 }

    return (
        <RequireRole role="passenger">
            <div className="card p-6 space-y-3">
                <h2 className="text-xl font-semibold">Unidades cercanas</h2>
                <div className="relative w-full h-72 rounded-2xl border bg-gray-100 dark:bg-gray-900 overflow-hidden">
                    {/* usuario */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left:`${user.x}%`, top:`${user.y}%` }}>
                        <div className="w-3 h-3 rounded-full bg-payki-600 border-2 border-white shadow" />
                        <div className="text-[10px] mt-1 text-gray-600">Tú</div>
                    </div>
                    {/* buses */}
                    {buses.map(b => (
                        <div key={b.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left:`${b.x}%`, top:`${b.y}%` }}>
                            <Bus className="w-5 h-5" />
                            <div className="text-[10px] mt-1 text-gray-600">{b.id}</div>
                        </div>
                    ))}
                </div>
            </div>
        </RequireRole>
    )
}
