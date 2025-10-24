'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type Role = 'passenger'|'driver'|'admin'
export type Profile = {
    id: string
    full_name: string
    role: Role
    passenger_sector?: 'normal'|'estado'
    benefit?: 'none'|'student'|'police'|'firefighter'
    balance?: number | null
}

type AuthCtx = {
    userId: string | null
    email: string | null
    profile: Profile | null
    loading: boolean
    signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string|null>(null)
    const [email, setEmail] = useState<string|null>(null)
    const [profile, setProfile] = useState<Profile|null>(null)
    const [loading, setLoading] = useState(true)

    const fetchOrCreate = async (uid: string, mail: string | null) => {
        // 1) Intentar leer perfil propio (RLS: id = auth.uid() o admin)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .maybeSingle()

        if (data) { setProfile(data as Profile); return }

        // 2) Si no hay (o RLS bloquea), usar RPC que crea/retorna perfil (SECURITY DEFINER)
        const { data: ensured, error: rpcErr } = await supabase.rpc('ensure_profile', {
            p_id: uid,
            p_email: mail ?? ''
        })

        if (rpcErr) {
            console.error('[ensure_profile] error', rpcErr)
            setProfile(null)
            return
        }

        setProfile(ensured as Profile)
    }

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const uid = session?.user?.id ?? null
            const mail = session?.user?.email ?? null
            setUserId(uid); setEmail(mail)
            if (uid) await fetchOrCreate(uid, mail)
            setLoading(false)
        }
        init()

        const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
            const uid = sess?.user?.id ?? null
            const mail = sess?.user?.email ?? null
            setUserId(uid); setEmail(mail)
            if (uid) await fetchOrCreate(uid, mail)
            else setProfile(null)
        })
        return () => { sub.subscription.unsubscribe() }
    }, [])

    const signOut = async () => { await supabase.auth.signOut() }

    return (
        <Ctx.Provider value={{ userId, email, profile, loading, signOut }}>
            {children}
        </Ctx.Provider>
    )
}

export const useAuth = () => {
    const c = useContext(Ctx)
    if (!c) throw new Error('AuthProvider missing')
    return c
}