'use client'
import Link from 'next/link'
import {QrCode, PlusCircle} from 'lucide-react'
import {useStore} from '@/lib/store'
import ActivityList from '@/components/ActivityList'
import MapMock from "@/components/MapMock";

export default function Page() {
    const {user} = useStore();
    return (
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Hola, {user.name.split(' ')
                            [0]} </p>
                        <h2 className="text-2xl font-semibold mt-1">Saldo actual</h2>
                        <p className="text-3xl font-bold text-payki-600">S/
                            {user.balance.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Link className="btn" href="/user/pay/"><QrCode className="w-4
h-4"/> Pagar Pasaje (QR)</Link>
                        <Link className="btn-outline" href="/user/recharge/"><PlusCircle
                            className="w-4 h-4"/> Recargar Saldo</Link>
                    </div>
                </div>
                <ActivityList/>
            </div>
            <div>
                <MapMock/>
            </div>
        </div>
    );
}
