'use client'
import { useState } from 'react'
import { broadcastPush } from '@/lib/functions'
import { useAuth } from '@/lib/auth'
import { useLoading } from '@/lib/loading'
import toast from 'react-hot-toast'

export default function AdminBroadcastForm() {
    const { profile } = useAuth()
    const { start, stop } = useLoading()
    const [title, setTitle] = useState('Aviso PAYKI')
    const [body, setBody]   = useState('Mensaje general')
    const [url, setUrl]     = useState('/')

    if (profile?.role !== 'admin') return null

    const sendAll = async (e: React.FormEvent) => {
        e.preventDefault()
        start()
        try {
            const res = await broadcastPush(title, body, url)
            toast.success(`Notificado: ${res.sent ?? 0} (fallidos: ${res.failed ?? 0})`)
        } catch (err: any) {
            toast.error(err.message || 'Error enviando notificaciones')
        } finally {
            stop()
        }
    }

    return (
        <form onSubmit={sendAll} className="card p-4 space-y-3">
            <h3 className="font-semibold">Notificación a todos</h3>
            <input className="rounded-xl border px-3 py-2" placeholder="Título"
                   value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="rounded-xl border px-3 py-2" placeholder="Mensaje"
                      value={body} onChange={e=>setBody(e.target.value)} />
            <input className="rounded-xl border px-3 py-2" placeholder="URL al abrir"
                   value={url} onChange={e=>setUrl(e.target.value)} />
            <button className="btn w-full">Enviar a todos</button>
        </form>
    )
}