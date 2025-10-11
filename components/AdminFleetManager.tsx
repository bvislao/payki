'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { callFunction } from '@/lib/functions'
import toast from "react-hot-toast";

type Operator = { id: string; name: string }
type Fleet = { id: string; name: string; operator_id: string }
type Vehicle = {
    id: string
    code: string
    plate: string
    fleet_id: string | null
    operator_id: string | null
}
type Driver = { id: string; full_name: string }

export function AdminFleetManager() {
    const [operators, setOperators] = useState<Operator[]>([])
    const [fleets, setFleets] = useState<Fleet[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [drivers, setDrivers] = useState<Driver[]>([])

    // form crear/editar flota
    const [fleetName, setFleetName] = useState('')
    const [operatorId, setOperatorId] = useState('')
    const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
    const [busy, setBusy] = useState(false)

    // form asignar chofer
    const [driverId, setDriverId] = useState('')
    const [vehicleId, setVehicleId] = useState('')

    // Helper: pide token sin usar "!."
    async function requireToken(): Promise<string> {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error('No hay sesión activa')
        return token
    }

    useEffect(() => {
        ;(async () => {
            const { data: ops } = await supabase.from('operators').select('id,name').order('name')
            setOperators((ops as Operator[] | null) ?? [])

            const { data: fl } = await supabase.from('fleets').select('id,name,operator_id').order('name')
            setFleets((fl as Fleet[] | null) ?? [])

            const { data: vs } = await supabase
                .from('vehicles')
                .select('id,code,plate,fleet_id,operator_id')
                .order('code')
            setVehicles((vs as Vehicle[] | null) ?? [])

            const { data: ds } = await supabase
                .from('profiles')
                .select('id,full_name')
                .eq('role', 'driver')
                .order('full_name')
            setDrivers((ds as Driver[] | null) ?? [])
        })()
    }, [])

    const toggleVehicle = (id: string) => {
        setSelectedVehicles((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    const saveFleet = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setBusy(true)
        try {
            const token = await requireToken()
            const res = await callFunction<{ ok: true; fleet_id: string }>(
                'admin_upsert_fleet',
                {
                    name: fleetName,
                    operator_id: operatorId,
                    // si tu función espera "vehicles", dime y lo adapto
                    vehicle_ids: selectedVehicles,
                },
                token
            )
            toast.success(`Flota guardada: ${res.fleet_id}`)
            setFleetName('')
            setOperatorId('')
            setSelectedVehicles([])

            // refrescar listados
            const { data: fl } = await supabase.from('fleets').select('id,name,operator_id').order('name')
            setFleets((fl as Fleet[] | null) ?? [])
            const { data: vs } = await supabase
                .from('vehicles')
                .select('id,code,plate,fleet_id,operator_id')
                .order('code')
            setVehicles((vs as Vehicle[] | null) ?? [])
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            toast.error(msg)
        } finally {
            setBusy(false)
        }
    }

    const assignDriver = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!driverId || !vehicleId) {
            toast('Selecciona chofer y vehículo', { })
            return
        }
        setBusy(true)
        try {
            const token = await requireToken()
            await callFunction('admin_assign_driver', { driver_id: driverId, vehicle_id: vehicleId }, token)
            toast.success('Asignación creada')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            toast.error(msg)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Crear/editar flota */}
            <form onSubmit={saveFleet} className="card p-4 space-y-3">
                <h3 className="font-semibold">Crear / Editar Flota</h3>
                <label className="text-sm">
                    Nombre de flota
                    <input
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={fleetName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFleetName(e.target.value)}
                    />
                </label>
                <label className="text-sm">
                    Operador
                    <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={operatorId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOperatorId(e.target.value)}
                    >
                        <option value="">— selecciona —</option>
                        {operators.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="text-sm font-medium mt-2">Vehículos (marcar para incluir en la flota)</div>
                <div className="max-h-56 overflow-auto border rounded-2xl p-3 grid md:grid-cols-2 gap-2">
                    {vehicles.map((v) => (
                        <label key={v.id} className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={selectedVehicles.includes(v.id)}
                                onChange={() => toggleVehicle(v.id)}
                            />
                            <span>
                {v.code} · {v.plate} {v.fleet_id ? `(flota actual)` : ''}
              </span>
                        </label>
                    ))}
                </div>

                <button className="btn" disabled={busy || !fleetName || !operatorId}>
                    {busy ? 'Guardando…' : 'Guardar flota'}
                </button>
            </form>

            {/* Asignar chofer a vehículo */}
            <form onSubmit={assignDriver} className="card p-4 space-y-3">
                <h3 className="font-semibold">Asignar Chofer a Vehículo</h3>
                <label className="text-sm">
                    Chofer
                    <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={driverId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDriverId(e.target.value)}
                    >
                        <option value="">— chofer —</option>
                        {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.full_name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-sm">
                    Vehículo
                    <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={vehicleId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVehicleId(e.target.value)}
                    >
                        <option value="">— vehículo —</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.code} · {v.plate} {v.fleet_id ? '· (en flota)' : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="btn" disabled={busy || !driverId || !vehicleId}>
                    {busy ? 'Asignando…' : 'Asignar'}
                </button>
            </form>

            {/* Listado de flotas */}
            <div className="card p-4 overflow-x-auto">
                <h3 className="font-semibold mb-3">Flotas</h3>
                <table className="table">
                    <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Operador</th>
                        <th>Activa</th>
                    </tr>
                    </thead>
                    <tbody>
                    {fleets.map((f) => {
                        const opName = operators.find((o) => o.id === f.operator_id)?.name ?? '—'
                        return (
                            <tr key={f.id}>
                                <td>{f.name}</td>
                                <td>{opName}</td>
                                <td>✔</td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
