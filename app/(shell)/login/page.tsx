'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from "react-hot-toast";

export default function Page() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [loading, setLoading] = useState(false)
    const { userId, profile, signOut } = useAuth()
    const router = useRouter()

    const handle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                toast.success("Sesión iniciada!")
                router.push('/')
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password })
                if (error) throw error

                // (opcional) si mantienes trigger/RPC ensure_profile, este insert no es necesario;
                // déjalo sólo si quieres forzar el perfil inmediatamente:
                const uid = data.user?.id
                if (uid) {
                    await supabase.from('profiles').insert({
                        id: uid,
                        full_name: email.split('@')[0],
                        role: 'passenger',
                        passenger_sector: 'normal',
                        benefit: 'none',
                    })
                }
                toast.success('Revisa tu email para el link de activación.')
                setMode('login')
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    if (userId) {
        return (
            <div className="max-w-md mx-auto card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Sesión activa</h2>
                <p className="text-sm">
                    Hola {profile?.full_name}! (<b>{profile?.role}</b>)
                </p>
                <div className="flex gap-2">
                    <button className="btn" onClick={() => router.push('/')}>Ir al inicio</button>
                    <button className="btn-outline" onClick={signOut}>Cerrar sesión</button>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handle} className="max-w-md mx-auto card p-6 space-y-4">
            <h2 className="text-xl font-semibold">
                {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>

            <label className="block text-sm">
                Email
                <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 bg-white dark:bg-gray-900"
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                />
            </label>

            <label className="block text-sm">
                Contraseña
                <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 bg-white dark:bg-gray-900"
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
            </label>

            <button className="btn w-full" disabled={loading} type="submit">
                {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
            </button>

            <div className="text-xs text-center">
                {mode === 'login' ? (
                    <>
                        ¿No tienes cuenta?{' '}
                        <button type="button" className="underline" onClick={() => setMode('signup')}>
                            Regístrate
                        </button>
                    </>
                ) : (
                    <>
                        ¿Ya tienes cuenta?{' '}
                        <button type="button" className="underline" onClick={() => setMode('login')}>
                            Inicia sesión
                        </button>
                    </>
                )}
            </div>

            <div className="text-center">
                <Link className="text-xs underline" href="/">Volver</Link>
            </div>
        </form>
    )
}
