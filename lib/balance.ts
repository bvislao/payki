// lib/balance.ts
import { supabase } from '@/lib/supabaseClient'

type RawTx = {
    id: string
    type: 'ride' | 'topup'
    amount: number
    ts: string
    meta?: Record<string, any> | null
}

export type Activity = {
    id: string
    type: 'ride' | 'topup'
    label: string
    amount: number
    date: string
}

const dtfPE = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
})

function mapFareCode(code?: string | null): string | null {
    if (!code) return null
    const dict: Record<string, string> = {
        troncal: 'Troncal',
        integrada: 'Integrada',
        interburano: 'Interburbano',
        interurbano: 'Interburbano',
        urbano: 'Urbano',
        zonal: 'Zonal',
        general: 'General',
        universitario: 'Universitario',
        escolar: 'Escolar',
    }
    return dict[String(code).toLowerCase()] ?? String(code)
}

export async function fetchPassengerSummary(uid: string): Promise<{ balance: number; recent: Activity[] }> {
    // 1) saldo
    const { data: prof } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', uid)
        .maybeSingle()

    // 2) últimos 15 movimientos (ride/topup), ordenados por fecha desc
    const { data: txs } = await supabase
        .from('transactions')
        .select('id,type,amount,ts,meta')
        .eq('passenger_id', uid)
        .in('type', ['ride', 'topup'])
        .order('ts', { ascending: false })
        .limit(15)

    const recent: Activity[] = (txs || []).map((t: RawTx) => {
        const when = dtfPE.format(new Date(t.ts)).replace(',', '')
        const fareLabel = mapFareCode(t.meta?.fare_code) || t.meta?.fare_label || 'Pasaje'
        const label =
            t.type === 'ride'
                ? `Viaje - ${fareLabel} - ${when}`
                : `Recarga - Tarjeta - ${when}`

        return {
            id: t.id,
            type: t.type,
            label,
            amount: Number(t.amount),
            date: t.ts,
        }
    })

    return { balance: Number(prof?.balance || 0), recent }
}