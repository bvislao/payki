// lib/auth.tsx
'use client'

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from 'react'
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

/** Convierte PromiseLike → Promise y aplica timeout para evitar “cargando infinito”. */
function runWithTimeout<T>(p: PromiseLike<T>, ms = 4000): Promise<T> {
    const real = Promise.resolve(p)
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('TIMEOUT')), ms)
        real.then(
            (v) => {
                clearTimeout(t)
                resolve(v)
            },
            (e) => {
                clearTimeout(t)
                reject(e)
            },
        )
    })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const mounted = useRef(true)

    useEffect(() => {
        return () => {
            mounted.current = false
        }
    }, [])

    const fetchOrCreate = useCallback(
        async (uid: string, mail: string | null) => {
            if (!uid) return
            setError(null)
            try {
                // 1) Intentar leer perfil (respeta RLS)
                const sel = await runWithTimeout(
                    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
                    3500,
                )

                if (sel.data) {
                    if (!mounted.current) return
                    setProfile(sel.data as Profile)
                    return
                }

                // 2) Asegurar perfil por RPC (sin RLS)
                const ensured = await runWithTimeout(
                    supabase.rpc('ensure_profile', { p_id: uid, p_email: mail ?? '' }),
                    3500,
                )
                if ('error' in ensured && ensured.error) throw ensured.error

                // 3) Releer para forma completa (si RLS ya lo permite)
                const again = await runWithTimeout(
                    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
                    3500,
                )
                if (!mounted.current) return
                setProfile((again.data as Profile) ?? (ensured.data as Profile) ?? null)
            } catch (err: unknown) {
                if (!mounted.current) return
                const msg =
                    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Error'
                if (msg === 'Failed to fetch' || !navigator.onLine) {
                    setError('Sin conexión. Intenta nuevamente.')
                } else if (msg === 'TIMEOUT') {
                    setError('La sesión tardó demasiado. Reintenta.')
                } else {
                    setError(msg || 'Error de autenticación')
                }
                setProfile(null)
            }
        },
        [],
    )

    const refreshProfile = useCallback(async () => {
        if (!userId) return
        try {
            const sess = await runWithTimeout(supabase.auth.getSession(), 4000)
            await fetchOrCreate(userId, sess.data.session?.user?.email ?? null)
        } catch (err: unknown) {
            if (!mounted.current) return
            const msg =
                err instanceof Error ? err.message : typeof err === 'string' ? err : 'Error'
            setError(msg || 'No se pudo actualizar el perfil')
        }
    }, [userId, fetchOrCreate])

    // ❶ Init + listener de cambios de sesión
    useEffect(() => {
        const init = async () => {
            setLoading(true)
            setError(null)
            try {
                const sess = await runWithTimeout(supabase.auth.getSession(), 4000)
                const uid = sess.data.session?.user?.id ?? null
                const mail = sess.data.session?.user?.email ?? null
                if (!mounted.current) return
                setUserId(uid)
                setEmail(mail)
                if (uid) {
                    await fetchOrCreate(uid, mail)
                }
            } catch (err: unknown) {
                if (!mounted.current) return
                const msg =
                    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Error'
                setError(
                    msg === 'TIMEOUT'
                        ? 'La sesión tardó demasiado. Reintenta.'
                        : msg || 'Error inicializando sesión',
                )
            } finally {
                if (mounted.current) setLoading(false)
            }
        }
        void init()

        const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
            if (!mounted.current) return
            setLoading(true)
            setError(null)
            try {
                const uid = sess?.user?.id ?? null
                const mail = sess?.user?.email ?? null
                setUserId(uid)
                setEmail(mail)
                if (uid) {
                    await fetchOrCreate(uid, mail)
                } else {
                    setProfile(null)
                }
            } catch (err: unknown) {
                const msg =
                    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Error'
                if (mounted.current) setError(msg || 'No se pudo actualizar la sesión')
            } finally {
                if (mounted.current) setLoading(false)
            }
        })
        return () => {
            sub.subscription.unsubscribe()
        }
    }, [fetchOrCreate])

    // ❷ Heartbeat de sesión: ping periódico + al volver a primer plano
    useEffect(() => {
        // Ping silencioso cada 15 minutos para mantener viva la sesión/refresh token
        const id = setInterval(() => {
            supabase.auth.getSession().catch(() => {
                /* no-op */
            })
        }, 15 * 60 * 1000)

        // Refresca cuando la pestaña vuelve a ser visible
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                supabase.auth.getSession().catch(() => {
                    /* no-op */
                })
            }
        }
        document.addEventListener('visibilitychange', onVisible)

        // Al volver a estar online, refrescar perfil si había usuario
        const onOnline = () => {
            if (userId) void refreshProfile()
        }
        window.addEventListener('online', onOnline)

        return () => {
            clearInterval(id)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('online', onOnline)
        }
    }, [userId, refreshProfile])

    const signOut = async () => {
        await supabase.auth.signOut()
        if (!mounted.current) return
        setUserId(null)
        setEmail(null)
        setProfile(null)
        setError(null)
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