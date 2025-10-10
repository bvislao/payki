'use client'
import { createContext, useContext, useMemo, useState } from 'react'
import { users as seedUsers, recentActivity as seedAct, buses as seedB, drivers as seedD } from './mockdata'


type Activity = { id: string; type: 'ride'|'topup'; label: string; amount: number; date: string }


export function useId(prefix: string = 'id') {
    const [n, setN] = useState(0)
    return () => { setN(v=>v+1); return `${prefix}-${n+1}` }
}


type Store = {
    user: { id: string; name: string; balance: number }
    activity: Activity[]
    setBalance: (v: number) => void
    addActivity: (a: Activity) => void
    buses: typeof seedB
    drivers: typeof seedD
    driverSession: null | { driverId: string; unitId: string; route: string; startedAt: string; fares: {label:string; amount:number}[]; transactions: Activity[] }
    startShift: (driverId: string) => void
    endShift: () => { total: number; count: number }
}


const Ctx = createContext<Store | null>(null)


export function Provider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState(seedUsers[0])
    // @ts-ignore
    const [activity, setActivity] = useState<Activity[]>(seedAct)
    const [buses, setBuses] = useState(seedB)
    const [drivers, setDrivers] = useState(seedD)
    const [driverSession, setDriverSession] = useState<Store['driverSession']>(null)


    const setBalance = (v: number) => setUser(u => ({ ...u, balance: Number(v.toFixed(2)) }))
    const addActivity = (a: Activity) => setActivity(prev => [a, ...prev].slice(0, 20))


    const startShift = (driverId: string) => {
        const d = drivers.find(x => x.id === driverId) || drivers[0]
        const unit = buses.find(b => b.id === (d.unitId ?? buses[0].id)) || buses[0]
        const route = unit.route
        setDrivers(ds => ds.map(x => x.id===d.id ? { ...x, onShift: true, unitId: unit.id } : x))
        setDriverSession({
            driverId: d.id,
            unitId: unit.id,
            route,
            startedAt: new Date().toISOString(),
            fares: [
                { label: 'General', amount: 2.5 },
                { label: 'Universitario', amount: 1.25 },
                { label: 'Escolar', amount: 1.0 }
            ],
            transactions: []
        })
    }
    const endShift = () => {
        const total = driverSession?.transactions.reduce((s, t) => s + (t.amount>0? t.amount : 0), 0) ?? 0
        const count = driverSession?.transactions.length ?? 0
        setDrivers(ds => ds.map(x => x.id===driverSession?.driverId ? { ...x, onShift: false } : x))
        setDriverSession(null)
        return { total, count }
    }


    const value = useMemo<Store>(() => ({
        user, activity, setBalance, addActivity, buses, drivers, driverSession, startShift, endShift
    }), [user, activity, buses, drivers, driverSession])


    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}


export const useStore = () => {
    const c = useContext(Ctx)
    if (!c) throw new Error('Store missing Provider')
    return c
}