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
    /** Solo al iniciar la app por primera vez */
    loading: boolean
    /** Actualizaciones en segundo plano: no bloquean la UI */
    syncing: boolean
    error: string | null
    refreshProfile: () => Promise<void>
    signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

/** Promise con timeout para evitar “cargando infinito”. */
function runWithTimeout<T>(p: PromiseLike<T>, ms = 4000): Promise<T> {
    const real = Promise.resolve(p)
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('TIMEOUT')), ms)
        real.then(
            (v) => { clearTimeout(t); resolve(v) },
            (e) => { clearTimeout(t); reject(e) },
        )
    })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)

    // ⬇️ “booting” (loading) solo en el arranque
    const [loading, setLoading] = useState(true)
    // ⬇️ “syncing” para background refresh sin bloquear UI
    const [syncing, setSyncing] = useState(false)

    const [error, setError] = useState<string | null>(null)
    const mounted = useRef(true)
    useEffect(() => () => { mounted.current = false }, [])

    const fetchOrCreate = useCallback(
        async (uid: string, mail: string | null, opts?: { background?: boolean }) => {
            if (!uid) return
            if (opts?.background) setSyncing(true)
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

                // 3) Releer para forma completa
                const again = await runWithTimeout(
                    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
                    3500,
                )
                if (!mounted.current) return
                setProfile((again.data as Profile) ?? (ensured.data as Profile) ?? null)
            } catch (err: unknown) {
                if (!mounted.current) return
                const msg = err instanceof Error ? err.message : String(err ?? 'Error')
                if (msg === 'Failed to fetch' || !navigator.onLine) {
                    setError('Sin conexión. Intenta nuevamente.')
                } else if (msg === 'TIMEOUT') {
                    setError('La sesión tardó demasiado. Reintenta.')
                } else {
                    setError(msg || 'Error de autenticación')
                }
                setProfile(null)
            } finally {
                if (opts?.background && mounted.current) setSyncing(false)
            }
        },
        [],
    )

    const refreshProfile = useCallback(async () => {
        if (!userId) return
        try {
            setSyncing(true)
            const sess = await runWithTimeout(supabase.auth.getSession(), 4000)
            await fetchOrCreate(userId, sess.data.session?.user?.email ?? null, { background: true })
        } catch (err: unknown) {
            if (!mounted.current) return
            const msg = err instanceof Error ? err.message : String(err ?? 'Error')
            setError(msg || 'No se pudo actualizar el perfil')
        } finally {
            if (mounted.current) setSyncing(false)
        }
    }, [userId, fetchOrCreate])

    // ❶ Arranque inicial: único momento donde “loading=true”
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
                    await fetchOrCreate(uid, mail) // ⚠️ sin background: es el arranque
                }
            } catch (err: unknown) {
                if (!mounted.current) return
                const msg = err instanceof Error ? err.message : String(err ?? 'Error')
                setError(
                    msg === 'TIMEOUT'
                        ? 'La sesión tardó demasiado. Reintenta.'
                        : msg || 'Error inicializando sesión',
                )
            } finally {
                if (mounted.current) setLoading(false) // ⬅️ nunca más volvemos a bloquear la UI
            }
        }
        void init()

        // ❷ Cambios de sesión: NO bloqueamos la UI (solo syncing)
        const { data: sub } = supabase.auth.onAuthStateChange(async (evt, sess) => {
            if (!mounted.current) return
            setError(null)
            try {
                const uid = sess?.user?.id ?? null
                const mail = sess?.user?.email ?? null
                setUserId(uid)
                setEmail(mail)

                if (evt === 'SIGNED_OUT' || !uid) {
                    setProfile(null)
                    return
                }
                // Cualquier otro evento (TOKEN_REFRESHED, USER_UPDATED, SIGNED_IN)
                await fetchOrCreate(uid, mail, { background: true })
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err ?? 'Error')
                if (mounted.current) setError(msg || 'No se pudo actualizar la sesión')
            }
        })
        return () => { sub.subscription.unsubscribe() }
    }, [fetchOrCreate])

    // ❸ Heartbeat de sesión (mantener viva sin parpadear la UI)
    useEffect(() => {
        const id = setInterval(() => {
            supabase.auth.getSession().catch(() => {})
        }, 15 * 60 * 1000)
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                supabase.auth.getSession().catch(() => {})
            }
        }
        const onOnline = () => { if (userId) void refreshProfile() }
        document.addEventListener('visibilitychange', onVisible)
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
            value={{ userId, email, profile, loading, syncing, error, refreshProfile, signOut }}
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