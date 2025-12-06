// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// SSR-safe: si no hay window/localStorage, usamos un storage “dummy” en memoria
const isBrowser = typeof window !== 'undefined'
const memoryStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: isBrowser ? window.localStorage : memoryStorage,
        detectSessionInUrl: isBrowser, // evita leer hash de URL en SSR
        // flowType: 'pkce', // opcional (navegadores)
    },
    global: {
        // asegura fetch disponible en SSR/Edge
        fetch: (...args) => fetch(...args as [RequestInfo, RequestInit?]),
    },
})