'use client'
import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react'
import { users as seedUsers, recentActivity as seedAct, buses as seedB, drivers as seedD } from './mockdata'

type Activity = { id: string; type: 'ride' | 'topup'; label: string; amount: number; date: string }

export function useId(prefix: string = 'id') {
    const counterRef = useRef(0)
    return useCallback(() => {
        const id = `${prefix}-${counterRef.current}`
        counterRef.current += 1
        return id
    }, [prefix])
}

type Store = {
    user: { id: string; name: string; balance: number }
    activity: Activity[]
    setBalance: (v: number) => void
    addActivity: (a: Activity) => void
    buses: typeof seedB
    drivers: typeof seedD
    driverSession: null | {
        driverId: string
        unitId: string
        route: string
        startedAt: string
        fares: { label: string; amount: number }[]
        transactions: Activity[]
    }
    startShift: (driverId: string) => void
    endShift: () => { total: number; count: number }
}

const Ctx = createContext<Store | null>(null)

export function Provider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState(seedUsers[0])
    // @ts-expect-error [reason]: mockdata es un JSON estático con tipo implícito, por lo que puede no coincidir con Activity[] estrictamente
    const [activity, setActivity] = useState<Activity[]>(seedAct)
    const busesRef = useRef(seedB)
    const [drivers, setDrivers] = useState(seedD)
    const [driverSession, setDriverSession] = useState<Store['driverSession']>(null)

    const setBalance = useCallback((v: number) => {
        setUser((u) => ({ ...u, balance: Number(v.toFixed(2)) }))
    }, [])

    const addActivity = useCallback((a: Activity) => {
        setActivity((prev) => [a, ...prev].slice(0, 20))
    }, [])

    const startShift = useCallback((driverId: string) => {
        setDrivers((currentDrivers) => {
            const d = currentDrivers.find((x) => x.id === driverId) || currentDrivers[0]
            const unit = busesRef.current.find((b) => b.id === (d.unitId ?? busesRef.current[0].id)) || busesRef.current[0]
            const route = unit.route

            setDriverSession({
                driverId: d.id,
                unitId: unit.id,
                route,
                startedAt: new Date().toISOString(),
                fares: [
                    { label: 'General', amount: 2.5 },
                    { label: 'Universitario', amount: 1.25 },
                    { label: 'Escolar', amount: 1.0 },
                ],
                transactions: [],
            })

            return currentDrivers.map((x) => (x.id === d.id ? { ...x, onShift: true, unitId: unit.id } : x))
        })
    }, [])

    const endShift = useCallback(() => {
        const result = { total: 0, count: 0 }

        setDriverSession((session) => {
            if (session) {
                result.total = session.transactions.reduce(
                    (s, t) => s + (t.amount > 0 ? t.amount : 0),
                    0
                )
                result.count = session.transactions.length

                setDrivers((ds) =>
                    ds.map((x) => (x.id === session.driverId ? { ...x, onShift: false } : x))
                )
            }
            return null
        })

        return result
    }, [])

    const value = useMemo<Store>(
        () => ({
            user,
            activity,
            setBalance,
            addActivity,
            buses: busesRef.current,
            drivers,
            driverSession,
            startShift,
            endShift,
        }),
        [user, activity, drivers, driverSession, setBalance, addActivity, startShift, endShift]
    )

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => {
    const c = useContext(Ctx)
    if (!c) throw new Error('Store missing Provider')
    return c
}