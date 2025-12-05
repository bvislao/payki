import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            persistSession: true,          // guarda la sesión
            autoRefreshToken: true,        // renueva tokens en background
            detectSessionInUrl: true,      // maneja callback de auth
            storageKey: 'payki.auth',      // clave estable (no cambiarla)
        },
    }
)