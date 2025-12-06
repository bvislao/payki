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

/* ------------------------- Cache de perfil (12h) ------------------------- */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12h
const cacheKey = (uid: string) => `payki:profile:${uid}`
const cacheTsKey = (uid: string) => `payki:profile:${uid}:ts`

function loadCachedProfile(uid: string) {
    try {
        const raw = localStorage.getItem(cacheKey(uid))
        const ts = Number(localStorage.getItem(cacheTsKey(uid)) || 0)
        if (!raw || !Number.isFinite(ts)) return null
        if (Date.now() - ts > CACHE_TTL_MS) return null
        return JSON.parse(raw)
    } catch { return null }
}

function saveCachedProfile(uid: string, p: unknown) {
    try {
        localStorage.setItem(cacheKey(uid), JSON.stringify(p))
        localStorage.setItem(cacheTsKey(uid), String(Date.now()))
    } catch {}
}

function isCacheFresh(uid: string) {
    try {
        const ts = Number(localStorage.getItem(cacheTsKey(uid)) || 0)
        return Number.isFinite(ts) && (Date.now() - ts <= CACHE_TTL_MS)
    } catch { return false }
}
/* ------------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)

    // “booting” (loading) solo en el arranque
    const [loading, setLoading] = useState(true)
    // “syncing” para background refresh sin bloquear UI
    const [syncing, setSyncing] = useState(false)

    const [error, setError] = useState<string | null>(null)
    const mounted = useRef(true)
    useEffect(() => () => { mounted.current = false }, [])

    const fetchOrCreate = useCallback(
        async (uid: string, mail: string | null, opts?: { background?: boolean }) => {
            if (!uid) return
            if (opts?.background) setSyncing(true)
            setError(null)

            // A) Servir desde caché si está fresco (evita red y “refrescos”)
            const cached = loadCachedProfile(uid)
            if (cached && isCacheFresh(uid)) {
                if (!mounted.current) return
                setProfile(cached as Profile)
                if (opts?.background) setSyncing(false)
                return
            }

            try {
                // B) Intentar leer perfil (respeta RLS)
                const sel = await runWithTimeout(
                    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
                    3500,
                )
                if (sel.data) {
                    if (!mounted.current) return
                    setProfile(sel.data as Profile)
                    saveCachedProfile(uid, sel.data)
                    return
                }

                // C) Asegurar perfil por RPC (sin RLS)
                const ensured = await runWithTimeout(
                    supabase.rpc('ensure_profile', { p_id: uid, p_email: mail ?? '' }),
                    3500,
                )
                // @ts-expect-error tipos de supabase
                if (ensured?.error) throw ensured.error

                // D) Releer para forma completa y cachear
                const again = await runWithTimeout(
                    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
                    3500,
                )
                if (!mounted.current) return
                const pf = (again.data as Profile) ?? (ensured.data as Profile) ?? null
                setProfile(pf)
                if (pf) saveCachedProfile(uid, pf)

            } catch (err: unknown) {
                if (!mounted.current) return
                const msg = err instanceof Error ? err.message : String(err ?? 'Error')

                // Si hay caché previo, mantén la UI consistente en offline/timeout
                const cachedFallback = loadCachedProfile(uid)
                if (cachedFallback && (msg === 'Failed to fetch' || msg === 'TIMEOUT' || !navigator.onLine)) {
                    setProfile(cachedFallback as Profile)
                    return
                }

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

    // ❶ Arranque inicial: “loading=true” solo aquí
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
                    // Monta al instante desde caché si existe
                    const cached = loadCachedProfile(uid)
                    if (cached) {
                        setProfile(cached as Profile)
                        setLoading(false)
                        // Si el caché no está fresco, refresca en background (sin bloquear UI)
                        if (!isCacheFresh(uid)) void fetchOrCreate(uid, mail, { background: true })
                        return
                    }
                    // Sin caché → petición normal (solo en arranque)
                    await fetchOrCreate(uid, mail)
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
                if (mounted.current) setLoading(false) // nunca más bloqueamos la UI
            }
        }
        void init()

        // ❷ Cambios de sesión: NO bloqueamos la UI (solo syncing/background)
        const { data: sub } = supabase.auth.onAuthStateChange(async (evt, sess) => {
            if (!mounted.current) return
            setError(null)

            // Evita “parpadeos” por TOKEN_REFRESHED
            if (evt === 'TOKEN_REFRESHED') return

            const uid = sess?.user?.id ?? null
            const mail = sess?.user?.email ?? null
            setUserId(uid)
            setEmail(mail)

            if (!uid || evt === 'SIGNED_OUT') {
                setProfile(null)
                return
            }

            // Usa caché si existe; refresca en segundo plano si no está fresco
            const cached = loadCachedProfile(uid)
            if (cached) {
                setProfile(cached as Profile)
                if (!isCacheFresh(uid)) void fetchOrCreate(uid, mail, { background: true })
            } else {
                // Sin caché → refresh en background para no bloquear
                void fetchOrCreate(uid, mail, { background: true })
            }
        })

        return () => { sub.subscription.unsubscribe() }
    }, [fetchOrCreate])

    // ❸ Heartbeat de sesión (mantener viva sin parpadear la UI)
    useEffect(() => {
        const id = setInterval(() => {
            supabase.auth.getSession().catch(() => {})
        }, 15 * 60 * 1000) // cada 15 min

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
            // Cierre de sesión global
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
            // Evita estados “pegados”: limpia caches y redirige
            if (typeof window !== 'undefined') {
                try {
                    // @ts-ignore – tipos de Cache API
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