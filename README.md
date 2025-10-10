# PAYKI — Sistema de Pagos para Transporte Público de Perú

**Stack:** Next.js 15 (App Router) + React (Hooks) + Tailwind CSS + lucide-react + qrcode.react.

Incluye PWA (manifest + service worker), navegación entre roles (Usuario, Conductor, Administrador) y datos simulados (JSON) en memoria. Todo es _client-side_ para facilitar la demo.

---

## Estructura del proyecto
```
payki/
├─ app/
│  ├─ (shell)/
│  │  ├─ layout.tsx
│  │  ├─ session.tsx                # Home: selección rápida de rol
│  │  ├─ user/
│  │  │  ├─ session.tsx
│  │  │  ├─ recharge.tsx
│  │  │  └─ pay.tsx
│  │  ├─ driver/
│  │  │  ├─ session.tsx
│  │  │  └─ session.tsx
│  │  └─ admin/
│  │     └─ session.tsx
│  └─ api/
│     └─ ping/route.ts           # Sanity check
├─ components/
│  ├─ Nav.tsx
│  ├─ Cards.tsx
│  ├─ ActivityList.tsx
│  ├─ MapMock.tsx
│  ├─ QRModal.tsx
│  ├─ PWARegisterClient.tsx
│  └─ ui/ (shadcn opcional)
├─ lib/
│  ├─ store.tsx                  # Contexto global simulado
│  └─ mockdata.ts                # JSON estático
├─ public/
│  ├─ manifest.json
│  ├─ sw.js
│  ├─ icons/
│  │  ├─ icon-192.png
│  │  └─ icon-512.png
│  └─ placeholder-map.jpg        #map simulado
├─ styles/
│  └─ globals.css
├─ package.json
├─ tailwind.config.ts
├─ postcss.config.js
├─ tsconfig.json
└─ next.config.ts
```