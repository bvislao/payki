'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import {broadcastPush, callFunction} from '@/lib/functions'
import { AdminFleetManager } from '@/components/AdminFleetManager'
import { AdminVehiclesByFleet } from '@/components/AdminFleetVehicleManager'
import toast from "react-hot-toast";
import AdminBroadcastForm from '@/components/AdminBroadcastForm'

type FareRow = { code: string; label: string; base_amount: number }
type Vehicle = { id: string; code: string; plate: string; active: boolean }
type Driver = { id: string; full_name: string }
type Tx = { amount: number; type: 'ride' | 'topup'; ts: string }

export default function AdminPage() {
    const { profile } = useAuth()
    const [busy, setBusy] = useState(false)

    // Métricas
    const [ingresos, setIngresos] = useState(0)
    const [unidades, setUnidades] = useState(0)
    const [enRuta, setEnRuta] = useState(0)
    const [pasajeros, setPasajeros] = useState(0)
    const [buses, setBuses] = useState<Vehicle[]>([])
    const [drivers, setDrivers] = useState<Driver[]>([])

    // Form Crear Usuario
    const [uEmail, setUEmail] = useState('')
    const [uPass, setUPass] = useState('')
    const [uName, setUName] = useState('')
    const [uRole, setURole] = useState<'driver' | 'passenger'>('driver')

    // Form Operador
    const [opName, setOpName] = useState('')
    const [fares, setFares] = useState<FareRow[]>([
        { code: 'general', label: 'General', base_amount: 2.5 },
    ])

    useEffect(() => {
        ;(async () => {
            const today = new Date().toISOString().slice(0, 10)

            const { data: tx } = await supabase
                .from('transactions')
                .select('amount,type,ts')
                .gte('ts', `${today}T00:00:00Z`)

            const rides = (tx ?? []).filter((t): t is Tx => t.type === 'ride')
            setIngresos(rides.reduce((s, t) => s + Number(t.amount), 0))
            setPasajeros(rides.length)

            const { data: v } = await supabase
                .from('vehicles')
                .select('id,code,plate,active')
                .eq('active', true)

            setBuses((v as Vehicle[] | null) ?? [])
            setUnidades(v?.length ?? 0)

            const { data: shifts } = await supabase
                .from('driver_shifts')
                .select('status')
                .eq('status', 'open')
            setEnRuta(shifts?.length ?? 0)

            const { data: ds } = await supabase
                .from('profiles')
                .select('id,full_name')
                .eq('role', 'driver')
            setDrivers((ds as Driver[] | null) ?? [])
        })()
    }, [])

    if (profile?.role !== 'admin') {
        return <div className="card p-6">Acceso solo para administradores.</div>
    }

    const addFare = () =>
        setFares((prev) => [
            ...prev,
            { code: '', label: '', base_amount: 0 },
        ])

    const updFare = (
        i: number,
        k: keyof FareRow,
        v: string | number
    ) => {
        setFares((prev) =>
            prev.map((f, idx) =>
                idx === i
                    ? {
                        ...f,
                        [k]:
                            k === 'base_amount'
                                ? Number(v)
                                : String(v),
                    }
                    : f
            )
        )
    }

    async function requireToken(): Promise<string> {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error('No hay sesión activa')
        return token
    }

    const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setBusy(true)
        try {
            const token = await requireToken()
            await callFunction(
                'admin_create_user',
                {
                    email: uEmail,
                    password: uPass,
                    full_name: uName,
                    role: uRole,
                },
                token
            )
            toast.success('Usuario creado correctamente')
            setUEmail('')
            setUPass('')
            setUName('')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            toast.error(msg)
        } finally {
            setBusy(false)
        }
    }

    const upsertOperator = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setBusy(true)
        try {
            const token = await requireToken()
            await callFunction(
                'admin_upsert_operator',
                { name: opName, fares },
                token
            )
            toast.success('Operador y tarifas guardados')
            setOpName('')
            setFares([{ code: 'general', label: 'General', base_amount: 2.5 }])
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            toast.error(msg)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Métricas */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="text-xs text-gray-500">Ingresos Hoy</div>
                    <div className="text-2xl font-semibold">S/ {ingresos.toFixed(2)}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-gray-500">Unidades Activas</div>
                    <div className="text-2xl font-semibold">{unidades}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-gray-500">Conductores en Ruta</div>
                    <div className="text-2xl font-semibold">{enRuta}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-gray-500">Pasajeros Hoy</div>
                    <div className="text-2xl font-semibold">{pasajeros}</div>
                </div>
            </div>

            {/*<form
                onSubmit={async (e) => {
                    e.preventDefault()
                    const title = (e.currentTarget.elements.namedItem('title') as HTMLInputElement).value
                    const body  = (e.currentTarget.elements.namedItem('body') as HTMLInputElement).value
                    await broadcastPush(title, body, '/')
                    toast.success('Enviado a todos los suscritos')
                }}
                className="card p-4 space-y-3"
            >
                <h3 className="font-semibold">Enviar notificación (broadcast)</h3>
                <input name="title" className="rounded-xl border px-3 py-2" placeholder="Título" />
                <input name="body"  className="rounded-xl border px-3 py-2" placeholder="Mensaje" />
                <button className="btn">Enviar</button>
            </form>*/}
            <AdminBroadcastForm />

            <AdminFleetManager />

            {/* Crear usuario (chofer/pasajero) */}
            <form onSubmit={createUser} className="card p-4 space-y-3">
                <h3 className="font-semibold">Crear usuario</h3>
                <div className="grid md:grid-cols-2 gap-3">
                    <label className="text-sm">
                        Email
                        <input
                            className="mt-1 w-full rounded-xl border px-3 py-2"
                            value={uEmail}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setUEmail(e.target.value)
                            }
                        />
                    </label>
                    <label className="text-sm">
                        Contraseña
                        <input
                            className="mt-1 w-full rounded-xl border px-3 py-2"
                            type="password"
                            value={uPass}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setUPass(e.target.value)
                            }
                        />
                    </label>
                </div>
                <label className="text-sm">
                    Nombre completo
                    <input
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={uName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUName(e.target.value)
                        }
                    />
                </label>
                <label className="text-sm">
                    Rol
                    <select
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={uRole}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setURole(e.target.value as 'driver' | 'passenger')
                        }
                    >
                        <option value="driver">Chofer</option>
                        <option value="passenger">Pasajero</option>
                    </select>
                </label>
                <button className="btn" disabled={busy}>
                    {busy ? 'Creando…' : 'Crear usuario'}
                </button>
            </form>

            {/* Crear/editar operador + tarifas */}
            <form onSubmit={upsertOperator} className="card p-4 space-y-3">
                <h3 className="font-semibold">Operador y tarifas</h3>
                <label className="text-sm">
                    Nombre del operador
                    <input
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={opName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setOpName(e.target.value)
                        }
                    />
                </label>
                <div className="space-y-2">
                    <div className="text-sm font-medium">Tarifas</div>
                    {fares.map((f, i) => (
                        <div key={i} className="grid md:grid-cols-3 gap-2">
                            <input
                                placeholder="code"
                                className="rounded-xl border px-3 py-2"
                                value={f.code}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updFare(i, 'code', e.target.value)
                                }
                            />
                            <input
                                placeholder="label"
                                className="rounded-xl border px-3 py-2"
                                value={f.label}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updFare(i, 'label', e.target.value)
                                }
                            />
                            <input
                                placeholder="base_amount"
                                type="number"
                                step="0.01"
                                className="rounded-xl border px-3 py-2"
                                value={f.base_amount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updFare(i, 'base_amount', e.target.value)
                                }
                            />
                        </div>
                    ))}
                    <button type="button" className="btn-outline" onClick={addFare}>
                        + Agregar tarifa
                    </button>
                </div>
                <button className="btn" disabled={busy}>
                    {busy ? 'Guardando…' : 'Guardar operador'}
                </button>
            </form>

            <AdminVehiclesByFleet />

            {/* Tablas rápidas */}
            <div className="card p-4 overflow-x-auto">
                <h3 className="font-semibold mb-3">Flota</h3>
                <table className="table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Código</th>
                        <th>Placa</th>
                        <th>Estado</th>
                    </tr>
                    </thead>
                    <tbody>
                    {buses.map((b) => (
                        <tr key={b.id}>
                            <td>{b.id}</td>
                            <td>{b.code}</td>
                            <td>{b.plate}</td>
                            <td>{b.active ? 'Activo' : 'Inactivo'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="card p-4 overflow-x-auto">
                <h3 className="font-semibold mb-3">Conductores</h3>
                <table className="table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                    </tr>
                    </thead>
                    <tbody>
                    {drivers.map((d) => (
                        <tr key={d.id}>
                            <td>{d.id}</td>
                            <td>{d.full_name}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
