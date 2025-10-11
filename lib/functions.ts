import {supabase} from "@/lib/supabaseClient";

export async function callFunction<T>(name: string, body: unknown, token: string): Promise<T> {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Function error')
    return json as T
}


export async function broadcastPush(title: string, body: string, url?: string) {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) throw new Error('No auth')
    return callFunction('send_broadcast', { title, body, url }, token)
}

export async function segmentPush(payload: { title: string; body: string; url?: string; role?: 'admin'|'driver'|'passenger'; operator_id?: string }) {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) throw new Error('No auth')
    return callFunction('send_segment', payload, token)
}