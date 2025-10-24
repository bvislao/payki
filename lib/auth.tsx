// lib/auth.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

export type Role = 'passenger' | 'driver' | 'admin'
export type Profile = {
    id: string
    full_name: string
    role: Role
    passenger_sector?: 'normal' | 'estado'
    benefit?: 'none' | 'student' | 'police' | 'firefighter'
    balance?: number | null
}

type AuthCtx = {
    userId: string | null
    email: string | null
    profile: Profile | null
    loading: boolean
    error: string | null
    refreshProfile: () => Promise<void>
    signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchOrCreate = useCallback(
        async (uid: string, mail: string | null) => {
            setLoading(true)
            setError(null)
            try {
                // 1) intentar leer
                const { data, error: selErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', uid)
                    .maybeSingle()

                if (selErr && selErr.code !== 'PGRST116') {
                    // PGRST116 = not found en maybeSingle
                    console.warn('[profiles select]', selErr)
                }

                if (data) {
                    setProfile(data as Profile)
                    return
                }

                // 2) crear/asegurar perfil con RPC (sin RLS)
                const { data: ensured, error: rpcErr } = await supabase.rpc('ensure_profile', {
                    p_id: uid,
                    p_email: mail ?? '',
                })

                if (rpcErr) {
                    console.error('[ensure_profile]', rpcErr)
                    throw new Error('No se pudo crear/obtener el perfil')
                }

                // 3) re-leer para tener forma completa
                const { data: again, error: againErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', uid)
                    .maybeSingle()
                if (againErr) {
                    console.warn('[profiles reselect]', againErr)
                }
                setProfile((again as Profile) ?? (ensured as Profile) ?? null)
            } catch (e: any) {
                setProfile(null)
                setError(e?.message || 'Error de autenticación')
            } finally {
                setLoading(false)
            }
        },
        []
    )

    const refreshProfile = useCallback(async () => {
        if (!userId) return
        const { data: { session } } = await supabase.auth.getSession()
        await fetchOrCreate(userId, session?.user?.email ?? null)
    }, [userId, fetchOrCreate])

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true)
                const { data: { session } } = await supabase.auth.getSession()
                const uid = session?.user?.id ?? null
                const mail = session?.user?.email ?? null
                setUserId(uid)
                setEmail(mail)
                if (uid) await fetchOrCreate(uid, mail)
                else setLoading(false)
            } catch (e: any) {
                setError(e?.message || 'Error inicializando sesión')
                setLoading(false)
            }
        }
        init()

        const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
            const uid = sess?.user?.id ?? null
            const mail = sess?.user?.email ?? null
            setUserId(uid)
            setEmail(mail)
            if (uid) await fetchOrCreate(uid, mail)
            else {
                setProfile(null)
                setLoading(false)
            }
        })
        return () => {
            sub.subscription.unsubscribe()
        }
    }, [fetchOrCreate])

    const signOut = async () => {
        await supabase.auth.signOut()
        // limpiar estado
        setUserId(null)
        setEmail(null)
        setProfile(null)
    }

    return (
        <Ctx.Provider
            value={{ userId, email, profile, loading, error, refreshProfile, signOut }}
        >
            {children}
        </Ctx.Provider>
    )
}

export const useAuth = () => {
    const c = useContext(Ctx)
    if (!c) throw new Error('AuthProvider missing')
    return c
}