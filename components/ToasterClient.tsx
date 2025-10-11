'use client'
import { Toaster } from 'react-hot-toast'

export default function ToasterClient() {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                duration: 3000,
                // Puedes ajustar estilos base para que combinen con Tailwind (claro/oscuro)
                style: { fontSize: '0.9rem', borderRadius: '0.75rem',background: 'var(--toast-bg)', color: 'var(--toast-fg)' },
                success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } }
            }}
        />
    )
}
