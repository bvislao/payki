import {supabase} from "@/lib/supabaseClient";

export async function callFunction<T = any>(name: string, body: unknown, token?: string): Promise<T> {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('.co', '.co/functions/v1');
    const res = await fetch(`${base}/${name}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* deja json = null */ }

    if (!res.ok) {
        const msg = (json && json.error) ? json.error : (text || res.statusText);
        throw new Error(msg);
    }
    return json as T;
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