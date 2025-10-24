'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Page() {
    const [email, setEmail] = useState('demo@payki.pe')
    const [password, setPassword] = useState('demo1234')
    const [mode, setMode] = useState<'login'|'signup'>('login')
    const [loadingForm, setLoadingForm] = useState(false)
    const { userId, profile, loading, signOut } = useAuth()
    const router = useRouter()

    // 👉 Si ya tengo sesión y el perfil está cargado, me voy al inicio
    useEffect(() => {
        if (!loading && userId && profile) {
            router.replace('/')
        }
    }, [loading, userId, profile, router])

    const handle = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoadingForm(true)
        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                // onAuthStateChange + useEffect harán el redirect cuando cargue el perfil
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                // Perfil se crea vía ensure_profile al primer load
                alert('Cuenta creada. Revisa tu correo si se requiere confirmación y luego inicia sesión.')
                setMode('login')
            }
        } catch (err: any) {
            alert(err.message ?? 'Error')
        } finally {
            setLoadingForm(false)
        }
    }

    // Estados de espera
    if (loading) {
        return <div className="max-w-md mx-auto card p-6 text-sm text-gray-500">Cargando…</div>
    }

    // Si hay sesión pero aún no hay perfil, muestro “esperando perfil…”
    if (userId && !profile) {
        return (
            <div className="max-w-md mx-auto card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Sesión activa</h2>
                <p className="text-sm text-gray-500">Esperando perfil…</p>
                <div className="flex gap-2">
                    <button className="btn" onClick={() => router.push('/')}>Ir al inicio</button>
                    <button className="btn-outline" onClick={signOut}>Cerrar sesión</button>
                </div>
            </div>
        )
    }

    // Form de login/signup
    return (
        <form onSubmit={handle} className="max-w-md mx-auto card p-6 space-y-4">
            <h2 className="text-xl font-semibold">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
            <label className="block text-sm">Email
                <input className="mt-1 w-full rounded-xl border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">Contraseña
                <input className="mt-1 w-full rounded-xl border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </label>
            <button className="btn w-full" disabled={loadingForm} type="submit">
                {loadingForm ? 'Procesando…' : (mode==='login' ? 'Entrar' : 'Registrarme')}
            </button>
            <div className="text-xs text-center">
                {mode==='login' ? (
                    <>¿No tienes cuenta? <button type="button" className="underline" onClick={()=>setMode('signup')}>Regístrate</button></>
                ) : (
                    <>¿Ya tienes cuenta? <button type="button" className="underline" onClick={()=>setMode('login')}>Inicia sesión</button></>
                )}
            </div>
            <div className="text-center"><Link className="text-xs underline" href="/">Volver</Link></div>
        </form>
    )
}