'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Fleet = { id: string; name: string; operator_id: string }
type Vehicle = { id: string; code: string; plate: string; active: boolean; fleet_id: string | null }

export function AdminVehiclesByFleet() {
    const [fleets, setFleets] = useState<Fleet[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [fleetId, setFleetId] = useState('')
    const [code, setCode] = useState('')
    const [plate, setPlate] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        ;(async () => {
            const { data } = await supabase.from('fleets').select('id,name,operator_id').order('name')
            setFleets((data as Fleet[] | null) ?? [])
        })()
    }, [])

    const loadVehicles = async (fid: string) => {
        setFleetId(fid)
        if (!fid) {
            setVehicles([])
            return
        }
        const { data, error } = await supabase
            .from('vehicles')
            .select('id,code,plate,active,fleet_id')
            .eq('fleet_id', fid)
            .order('code')

        if (error) console.error('[vehicles]', error)
        setVehicles((data as Vehicle[] | null) ?? [])
    }

    const addVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!fleetId || !code || !plate) return
        setBusy(true)
        try {
            const op = fleets.find((f) => f.id === fleetId)?.operator_id ?? null
            const { error } = await supabase.from('vehicles').insert({
                code,
                plate,
                active: true,
                fleet_id: fleetId,
                operator_id: op,
            })
            if (error) throw error
            setCode('')
            setPlate('')
            await loadVehicles(fleetId)
            alert('Vehículo agregado')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            alert(msg)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="card p-4 space-y-3">
            <h3 className="font-semibold">Flota → Vehículos</h3>

            <label className="text-sm">
                Flota
                <select
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={fleetId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => loadVehicles(e.target.value)}
                >
                    <option value="">— selecciona flota —</option>
                    {fleets.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </select>
            </label>

            {fleetId && (
                <>
                    <form onSubmit={addVehicle} className="grid gap-3 md:grid-cols-3">
                        <input
                            className="rounded-xl border px-3 py-2"
                            placeholder="Código (BUS-001)"
                            value={code}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                        />
                        <input
                            className="rounded-xl border px-3 py-2"
                            placeholder="Placa (ABC-123)"
                            value={plate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlate(e.target.value)}
                        />
                        <button className="btn" disabled={busy || !code || !plate}>
                            Agregar vehículo
                        </button>
                    </form>

                    <ul className="text-sm divide-y">
                        {vehicles.map((v) => (
                            <li key={v.id} className="py-2 flex justify-between">
                <span>
                  {v.code} · {v.plate}
                </span>
                                <span className="text-gray-500">{v.active ? 'Activo' : 'Inactivo'}</span>
                            </li>
                        ))}
                        {vehicles.length === 0 && (
                            <li className="py-2 text-gray-500">Sin vehículos en esta flota.</li>
                        )}
                    </ul>
                </>
            )}
        </div>
    )
}
