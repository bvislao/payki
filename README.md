
# Documentación Técnica PAYKI
**Versión del Documento:** 1.0  
**Fecha de Creación:** 2025-10-14  
**Autor:** Equipo PAYKI ( UTP - Proyecto Final )

---

## Índice
1. Introducción
2. Prerrequisitos
3. Autenticación (Supabase Auth)
4. Almacenamiento (Supabase Storage)
5. Funciones Edge (Supabase Edge Functions)
6. Variables de Entorno 
7. Despliegue y Migraciones 
8. Troubleshooting

---

## Introducción
**Propósito de la Aplicación:**  
PAYKI es una PWA para pagos de transporte público en Perú. Permite a **pasajeros** pagar su pasaje escaneando un **QR** generado por el **conductor**; este opera por jornadas y cobra tarifas definidas por **operadores**. Un **administrador** gestiona operadores, flotas, vehículos, choferes, tarifas y notificaciones.

**Arquitectura del Backend:**
- **Supabase (BaaS)**: PostgreSQL + RLS, Auth, Storage (opcional), Edge Functions (Deno).
- **Next.js (PWA)** se comunica por **HTTPS** con Supabase **PostgREST**, **RPC** y **Edge Functions**.
- **Edge Functions** usan **Service Role Key** para operaciones privilegiadas (bypass RLS).
- **Web Push** para notificar (VAPID).

**Pila Tecnológica:**
- **Supabase**, **PostgreSQL**, **RLS**, **Edge Functions (Deno/TS)**
- **Next.js 15 (App Router), React 19, Tailwind v4**, Service Worker, Web Push
- **react-qr-code** (generar QR), **react-qr-reader / yudiel scanner** (leer QR)
- **react-hot-toast** (feedback UI)

---

## Prerrequisitos
**Software Requerido:**
- Node.js 18+ y pnpm/npm
- Supabase CLI: `npm i -g supabase`
- Deno (para Edge Functions en local, CLI lo resuelve)

**Cuentas y Acceso:**
- Cuenta en Supabase y un proyecto creado
- (Opcional) GitHub para CI/CD

**Credenciales externas:**
- **VAPID** (Web Push): generar par de claves pública/privada (por ej. usando web-push)
- (Opcional) SMTP o proveedor email si personalizas plantillas

---

## Autenticación (Supabase Auth)
- Email/Password habilitado.
- Creación/aseguramiento de perfil vía `ensure_profile` en el primer login.
- Admin según `admin_whitelist` + `is_admin()`.

---

## Almacenamiento (Supabase Storage)
No requerido inicialmente. Añadir bucket y políticas si se usa.

---

## Funciones Edge
- `ride_pay`, `start_shift`, `admin_create_user`, `admin_upsert_operator`, `admin_upsert_fleet`, `admin_assign_driver`, `notify_all` (opcional).
- Despliegue: `supabase functions deploy <name>`

---

## Variables de Entorno
**Web (.env.example)**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

**Edge Functions**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

**Seguridad**: No subir `.env` al repo.
```gitignore
.env
.env.*
supabase/.branches/*/.env
```

---

## Despliegue y Migraciones
```bash
supabase db diff -f init_payki_schema
supabase db push
supabase functions deploy ride_pay start_shift admin_create_user admin_upsert_operator admin_upsert_fleet admin_assign_driver
```

---

## Troubleshooting
- CORS/403 → revisar RLS, headers y JWT.
- Ambiguedad `id` → calificar columnas y evitar usar OUT `id` en selects.
- Saldo insuficiente con recargas → usar `topup_balance` (impacta profiles.balance).
- RPC devuelve vacío → en funciones `RETURNS TABLE` usar `RETURN NEXT` antes de `RETURN`.
- Cámara sin preview → altura fija, `ssr:false`, permisos y HTTPS/localhost.



## Arquitectura del Proyecto (según repo GitHub)

**Monorepo / App única (Next.js App Router):**
```
payki/
├─ app/
│  ├─ (shell)/
│  │  ├─ layout.tsx                       # Layout principal (header, nav, Toaster, etc.)
│  │  ├─ page.tsx                         # Home: selección rápida de rol / dashboard general
│  │  ├─ user/
│  │  │  ├─ page.tsx                      # Dashboard usuario (saldo, actividad)
│  │  │  ├─ recharge/page.tsx             # Recargar saldo (topup_balance)
│  │  │  └─ pay-qr/page.tsx               # Pagar con QR (lector, ride_pay)
│  │  ├─ driver/
│  │  │  ├─ page.tsx                      # Pantalla para iniciar jornada (start_shift)
│  │  │  └─ session/page.tsx              # Jornada activa: generar QR y cobrar
│  │  └─ admin/
│  │     └─ page.tsx                      # Panel admin (operadores, flotas, choferes, métricas)
│  └─ api/
│     └─ ping/route.ts                    # Sanity check API route
├─ components/
│  ├─ Nav.tsx                             # Barra superior, enlaces a roles y logout
│  ├─ QRModal.tsx                         # Modal con QR grande (react-qr-code)
│  ├─ RequireRole.tsx                     # HOC de autorización por rol (admin, driver, passenger)
│  ├─ AdminFleetManager.tsx               # Crear/editar flotas y asignar chofer a vehículo
│  ├─ AdminFleetVehicleManager.tsx        # Gestionar vehículos por flota
│  ├─ PWARegisterClient.tsx               # Registro del Service Worker y Push
│  └─ ...                                 # Otros UI helpers (Cards, MapMock, etc.)
├─ lib/
│  ├─ supabaseClient.ts                   # Instancia de Supabase (URL/ANON env)
│  ├─ auth.tsx                            # Contexto de autenticación y perfil (ensure_profile)
│  ├─ functions.ts                        # Helper para llamar Edge Functions con bearer
│  └─ types.ts                            # Tipos compartidos (Role, Profile, etc.)
├─ public/
│  ├─ manifest.json                       # PWA manifest
│  ├─ sw.js                               # Service worker: cache y push
│  └─ icons/                              # PNG 192x192 y 512x512
├─ styles/
│  └─ globals.css                         # Tailwind v4 layers (base, components, utilities)
├─ supabase/
│  ├─ functions/
│  │  ├─ ride_pay/index.ts                # Edge: cobra ticket (usa RPC ride_charge)
│  │  ├─ start_shift/index.ts             # Edge: abrir jornada con validación
│  │  ├─ admin_create_user/index.ts       # Edge: alta de usuario y perfil
│  │  ├─ admin_upsert_operator/index.ts   # Edge: operador + tarifas
│  │  ├─ admin_upsert_fleet/index.ts      # Edge: flota y sus vehículos
│  │  └─ admin_assign_driver/index.ts     # Edge: asignar chofer a vehículo
│  └─ migrations/                         # DDL y policies (RLS), funciones SQL
├─ tailwind.config.ts                     # Tailwind v4 (content: app/**/*, components/**/*)
├─ postcss.config.mjs                     # PostCSS (tailwindcss, autoprefixer)
├─ next.config.ts                         # PWA headers, SW, imágenes remotas, etc.
├─ eslint.config.mjs                      # Reglas TS/React y @typescript-eslint
├─ package.json                           # Scripts: dev, build, start, lint
└─ .env.example                           # Variables: NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, VAPID_PUBLIC_KEY
```

**Front-end (Next.js App Router):**
- Tres “sub-apps” de demostración en la misma app: **Usuario**, **Conductor**, **Admin**.
- Todo es **CSR** en páginas de interacción (lector de QR, generador QR, forms) y el layout puede usar **SSR/Static** si se requiere.
- **Tailwind v4**: clases utilitarias y `@layer` para componentes (`btn`, `card`, `table`).

**BFF / Edge Functions (Supabase):**
- `ride_pay`: valida jornada, calcula tarifa y beneficio, cobra con **idempotencia** (RPC `ride_charge`).
- `start_shift`: valida que el chofer tenga un vehículo asignado y abre jornada para ese vehículo.
- `admin_*`: endpoints para tareas privilegiadas (crear usuario, operador+tarifas, flotas, asignar chofer).  
  Usan **Service Role Key** y aplican validaciones de negocio.

**Base de Datos (Postgres + RLS):**
- **profiles**, **operators**, **fares**, **fleets**, **vehicles**, **driver_vehicle_assignments**, **driver_shifts**, **transactions** (con `idempotency_key`), **push_subscriptions**, **admin_whitelist**.
- Funciones SQL seguras: **is_admin**, **ensure_profile**, **topup_balance**, **ride_charge**.

**PWA y Notificaciones:**
- `public/manifest.json` con nombre, íconos 192/512.
- `public/sw.js`: cache first, offline y `push` con **VAPID**.
- Suscripción desde `PWARegisterClient.tsx` (PushManager) y almacenamiento en `push_subscriptions`.

**Protocolos de comunicación:**
- **HTTPS** entre cliente y Supabase: PostgREST (`/rest/v1`), **RPC** y **functions/v1**.
- **JWT** en Authorization Bearer.
- **Web Push** entre SW y servidor (VAPID).
