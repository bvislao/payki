'use client'

import {useStore} from '@/lib/store'

function Stat({label, value}: { label: string; value: string }) {
    return (
        <div className="card p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
        </div>
    )
}

export default function AdminPage() {
    const {buses, drivers} = useStore()
    const ingresosHoy = drivers.reduce((s, d) => s + (d.onShift ? 50 : 0),
        0) // simulado
    const unidadesActivas = buses.filter(b => b.status === 'Activo').length
    const conductoresRuta = drivers.filter(d => d.onShift).length
    const pasajerosHoy = conductoresRuta * 40 // simulado
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
                <Stat label="Ingresos Totales del Día" value={`S/ ${ingresosHoy.toFixed(2)}`}/>
                <Stat label="Unidades Activas" value={`${unidadesActivas}`}/>
                <Stat label="Conductores en Ruta" value={`${conductoresRuta}`}/>
                <Stat label="Total de Pasajeros Hoy" value={`${pasajerosHoy}`}/>
            </div>
            <div className="card p-4 overflow-x-auto">
                <h3 className="font-semibold mb-3">Gestión de Flota</h3>
                <table className="table">
                    <thead>
                    <tr>
                        <th>Estado</th>
                        <th>Acciones</th>
                        <th>ID Unidad</th>
                        <th>Placa</th>
                        <th>Ruta</th>
                        <th>Conductor</th>
                    </tr>
                    </thead>
                    <tbody>
                    {buses.map(b => (
                        <tr key={b.id}>
                            <td>{b.id}</td>
                            <td>{b.plate}</td>
                            <td>{b.route}</td>
                            <td>{b.driverId ?? '—'}</td>
                            <td>
<span
    className={`badge ${b.status === 'Activo' ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-600'}`}>{b.status}</
    span>
                            </td>
                            <td className="space-x-2">
                                <button className="btn-outline">Ver Detalles</button>
                                <button className="btn-outline">Asignar Conductor</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            <div className="card p-4 overflow-x-auto">
                <h3 className="font-semibold mb-3">Gestión de Conductores</h3>
                <table className="table">
                    <thead>
                    <tr>
                        <th>ID Conductor</th>
                        <th>Nombre</th>
                        <th>Unidad Asignada
                        </
                            th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {drivers.map(d => (
                        <tr key={d.id}>
                            <td>{d.id}</td>
                            <td>{d.name}</td>
                            <td>{d.unitId ?? '—'}</td>
                            <td>
                                <span
                                    className={`badge ${d.onShift ? 'border-emerald-300text-emerald-700' : 'border-gray-300 text-gray-600'}`}>{d.onShift ? 'EnJornada' : 'Fuera de Servicio'}</span>
                            </td>
                            <td className="space-x-2">
                                <button className="btn-outline">Ver Perfil</button>
                                <button className="btn-outline">Editar</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}