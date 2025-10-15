'use client'
import { ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react'
import { useStore } from '@/lib/store'
export default function ActivityList() {
    const { activity } = useStore()
    console.log('activity', activity)
    return (
        <div className="card p-4">
            <h3 className="font-semibold mb-3">Actividad Reciente</h3>
            <ul className="space-y-2">
                {activity.map(a => (
                    <li key={a.id} className="flex items-center justify-between textsm">
                        <div className="flex items-center gap-2">
                            {a.type === 'topup' ? <ArrowUpRight className="w-4 h-4"/> :
                                <ArrowDownRight className="w-4 h-4"/>}
                            <span>{a.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
<span className={a.amount>0? 'text-green-600':'text-red-600'}
>{a.amount>0? '+':'-'}S/ {Math.abs(a.amount).toFixed(2)}</span>
                            <div className="flex items-center gap-1"><Clock className="w-3
h-3"/><span>{a.date}</span></div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}