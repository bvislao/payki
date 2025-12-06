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

/* ---------- Caché de perfil (12 horas) ---------- */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12h
const cacheKey   = (uid: string) => `payki:profile:${uid}`
const cacheTsKey = (uid: string) => `payki:profile:${uid}:ts`

function loadCachedProfile(uid: string): Profile | null {
    try {
        if (typeof localStorage === 'undefined') return null
        const raw = localStorage.getItem(cacheKey(uid))
        const ts  = Number(localStorage.getItem(cacheTsKey(uid)) || 0)
        if (!raw || !Number.isFinite(ts)) return null
        if (Date.now() - ts > CACHE_TTL_MS) return null
        return JSON.parse(raw) as Profile
    } catch { return null }
}

function saveCachedProfile(uid: string, p: Profile | null) {
    try {
        if (typeof localStorage === 'undefined' || !p) return
        localStorage.setItem(cacheKey(uid), JSON.stringify(p))
        localStorage.setItem(cacheTsKey(uid), String(Date.now()))
    } catch {}
}

/* ------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId]     = useState<string | null>(null)
    const [email,  setEmail]      = useState<string | null>(null)
    const [profile, setProfile]   = useState<Profile | null>(null)
    const [loading, setLoading]   = useState(true)   // solo en el boot
    const [syncing, setSyncing]   = useState(false)  // refrescos bg
    const [error, setError]       = useState<string | null>(null)
    const mounted = useRef(true)
    useEffect(() => () => { mounted.current = false }, [])

    const fetchOrCreate = useCallback(
        async (uid: string, mail: string | null, opts?: { background?: boolean }) => {
            if (!uid) return
            if (opts?.background) setSyncing(true)
            setError(null)

            // Mostrar caché inmediatamente si existe (no bloquea UI)
            const cached = loadCachedProfile(uid)
            if (cached && !opts?.background) setProfile(cached)

            try {
                // 1) Intentar leer perfil (respeta RLS)
                const sel = await runWithTimeout(
                    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
                    3500,
                )
                if (sel.data) {
                    if (!mounted.current) return
                    setProfile(sel.data as Profile)
                    saveCachedProfile(uid, sel.data as Profile)
                    return
                }

                // 2) Asegurar perfil por RPC (sin RLS)
                const ensuredResp = await runWithTimeout(
                    supabase.rpc('ensure_profile', { p_id: uid, p_email: mail ?? '' }),
                    3500
                )
                if (ensuredResp.error) throw ensuredResp.error

// 3) Releer para forma completa
                const againResp = await runWithTimeout(
                    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
                    3500
                )

                if (!mounted.current) return
                const finalProfile =
                    (againResp.data as Profile) ?? (ensuredResp.data as Profile) ?? null

                setProfile(finalProfile)
                saveCachedProfile(uid, finalProfile)
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
                // Si había caché, mantenla; si no, limpia.
                if (!cached) setProfile(null)
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

    // ❶ Arranque: usa caché si existe y refresca en bg
    useEffect(() => {
        const init = async () => {
            setLoading(true)
            setError(null)
            try {
                const sess = await runWithTimeout(supabase.auth.getSession(), 4000)
                const uid  = sess.data.session?.user?.id ?? null
                const mail = sess.data.session?.user?.email ?? null
                if (!mounted.current) return
                setUserId(uid)
                setEmail(mail)

                if (uid) {
                    const cached = loadCachedProfile(uid)
                    if (cached) setProfile(cached)
                    // refresca en segundo plano si había cache; si no, espera data real
                    await fetchOrCreate(uid, mail, { background: !!cached })
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
                if (mounted.current) setLoading(false)
            }
        }
        void init()

        // ❷ Cambios de sesión: no bloquear UI (solo syncing)
        const { data: sub } = supabase.auth.onAuthStateChange(async (evt, sess) => {
            if (!mounted.current) return
            setError(null)
            try {
                const uid  = sess?.user?.id ?? null
                const mail = sess?.user?.email ?? null
                setUserId(uid)
                setEmail(mail)

                if (evt === 'SIGNED_OUT' || !uid) {
                    setProfile(null)
                    return
                }
                await fetchOrCreate(uid, mail, { background: true })
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err ?? 'Error')
                if (mounted.current) setError(msg || 'No se pudo actualizar la sesión')
            }
        })
        return () => { sub.subscription.unsubscribe() }
    }, [fetchOrCreate])

    // ❸ Heartbeat de sesión
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
        try {
            // (Opcional) Limpia subs de push del usuario actual
            if (userId) {
                try { await supabase.from('push_subscriptions').delete().eq('user_id', userId) } catch {}
            }

            // Cierre de sesión global (revoca refresh tokens)
            const { error } = await supabase.auth.signOut({ scope: 'global' })
            if (error) throw error
        } catch (e) {
            console.warn('[signOut]', e)
        } finally {
            if (mounted.current) {
                setUserId(null)
                setEmail(null)
                setProfile(null)
                setError(null)
            }
            // Forzar revalidación limpiando caches y redirigiendo
            if (typeof window !== 'undefined') {
                try {
                    // @ts-ignore – navigator.caches puede no estar tipeado
                    caches?.keys?.().then((keys: string[]) => keys.forEach(k => caches.delete(k)))
                } catch {}
                window.location.replace('/login')
            }
        }
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