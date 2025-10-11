import Link from 'next/link'
import {ArrowRight, Bus, Shield, UserRound} from 'lucide-react'

export default function Page() {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            {[
                {
                    href: '/user', title: 'Usuario Pasajero', icon: <UserRound/>,
                    desc: 'Paga con QR, recarga y revisa tu actividad.'
                },
                {href: '/driver', title: 'Conductor', icon: <Bus/>, desc: 'Inicia jornada, genera QR y cobra tarifas.'},
                {href: '/admin', title: 'Administrador', icon: <Shield/>, desc: 'Métricas, flota y conductores.'},
            ].map((c) => (
                <Link key={c.href} href={c.href} className="card p-6 flex flex-col
gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center
gap-2">{c.icon} {c.title}</h2>
                        <ArrowRight className="w-5 h-5"/>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{c.desc}</
                        p>
                </Link>
            ))}
        </div>
    )
}
