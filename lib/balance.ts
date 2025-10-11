import { supabase } from './supabaseClient'

export async function fetchPassengerSummary(passengerId: string) {
    // lee transacciones del usuario
    const { data: tx } = await supabase
        .from('transactions')
        .select('id,type,amount,ts,meta,raw_base,fare_code')
        .eq('passenger_id', passengerId)
        .order('ts', { ascending: false })
        .limit(50)

    const list = (tx || []).map(t => ({
        id: t.id,
        type: t.type as 'ride'|'topup',
        label: t.type === 'topup' ? 'Recarga' : `Viaje ${t.fare_code || ''}`,
        amount: Number(t.amount),
        date: new Date(t.ts as string).toLocaleString()
    }))

    // balance = recargas - viajes
    const balance = list.reduce((s, t) => s + (t.type === 'topup' ? t.amount : -t.amount), 0)
    return { balance: Number(balance.toFixed(2)), recent: list }
}
