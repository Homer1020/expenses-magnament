# Expenses Management

Aplicación web (PWA) para gestionar finanzas personales: transacciones en USD/Bs con tasa de cambio, categorías, cuentas de presupuesto (reparto por porcentaje), metas de gasto, transacciones recurrentes y dashboard con gráficos.

## Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS 4 + shadcn-vue (reka-ui)
- Supabase (Auth + PostgreSQL con RLS)
- TanStack Table, vee-validate + zod, ApexCharts
- PWA con `vite-plugin-pwa`

## Requisitos

- Node.js 20 o superior y npm
- Un proyecto de [Supabase](https://supabase.com) (gratuito sirve)

## Cómo correr el proyecto

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar variables de entorno**: copia `.env.example` a `.env` y completa los valores (Supabase > Project Settings > API):

   ```env
   VITE_SUPABASE_URL='https://xxxx.supabase.co'
   VITE_SUPABASE_ANON_KEY='tu-anon-key'
   ```

   Opcional, solo para el seeder por script (`npm run seed`):

   ```env
   SUPABASE_SERVICE_ROLE_KEY='tu-service-role-key'
   ```

   > ⚠️ La `service_role` salta RLS. Nunca la subas al repositorio ni la uses en el frontend. `.env` ya está en `.gitignore`.

3. **Crear el esquema** en Supabase ejecutando `database/schema.sql` (ver "Base de datos y migraciones").

4. **Levantar el servidor de desarrollo**

   ```bash
   npm run dev
   ```

   Abre la URL que muestra Vite (por defecto <http://localhost:5173>).

5. **Crear un usuario**: la ruta `/signup` está deshabilitada en el router, así que crea el usuario desde Supabase > Authentication > Users y luego inicia sesión en `/login`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR. |
| `npm run build` | Chequeo de tipos (`vue-tsc`) y build de producción en `dist/`. |
| `npm run preview` | Sirve localmente el build de producción. |
| `npm run seed` | Seeder por script (categorías y cuentas iniciales) vía API de Supabase. |
| `npm run generate-pwa-assets` | Regenera los íconos de la PWA desde `public/pwa-icon.svg`. |

## Base de datos y migraciones

El esquema vive en un solo archivo: [database/schema.sql](database/schema.sql). Incluye las tablas (`categories`, `accounts`, `transactions`, `budget_goals`, `recurring_transactions`), índices, políticas RLS y la función RPC `reset_my_data()`. Ya no hay migraciones incrementales: `schema.sql` es el estado final de la base.

### Cómo aplicarlo

1. Abre tu proyecto en Supabase > **SQL Editor > New query**.
2. Pega el contenido de `database/schema.sql` y pulsa **Run**.

Es idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`), así que puedes re-ejecutarlo sin perder datos.

### Cambios de esquema a futuro

Ejecuta el `ALTER` en el SQL Editor y actualiza `schema.sql` para que siga reflejando la base real.

### Seeders (datos iniciales)

Hay dos formas de cargar categorías y cuentas iniciales:

**Opción A: SQL** (`database/seeders/01_seed_initial_data.sql`). Ejecútalo en el SQL Editor. Toma el primer usuario de `auth.users` (o el UUID indicado en la cabecera del archivo) y crea categorías, cuentas (reparto 100%), metas y recurrentes de ejemplo.

> ⚠️ Hace `TRUNCATE ... CASCADE` de `transactions`, `budget_goals`, `recurring_transactions`, `accounts` y `categories`. **Borra todos los datos existentes.**

**Opción B: script** (`npm run seed`). Inserta categorías y cuentas por la API. Requiere `.env` y una de estas opciones para pasar RLS:

```bash
# Con SUPABASE_SERVICE_ROLE_KEY en el .env
npm run seed

# O autenticándose con un usuario existente
npm run seed -- --email=tu@correo.com --password=tu_contraseña

# O indicando el user_id destino (con service role)
npm run seed -- --user-id=<uuid>
```

El script también limpia las filas previas del usuario destino (o de todas las tablas si no se indica usuario).

Más detalle en [database/README.md](database/README.md).

## Estructura

```text
database/     Esquema (schema.sql) y seeders SQL
scripts/      Seeder por script (seed.mjs)
public/       Assets estáticos y de la PWA
src/
├── actions/      Acciones de UI (transacciones)
├── components/   Componentes compartidos y shadcn-vue (ui/)
├── composables/  Tema, ajustes, visibilidad de tarjetas
├── lib/          Supabase client, formatters, métricas de presupuesto
├── services/     Acceso a datos (Supabase) por entidad
├── views/        Páginas: dashboard, transactions, accounts, categories, budgets, recurring, auth, onboarding, profile, settings
├── router.ts
└── types.ts
```

## Despliegue

`npm run build` genera `dist/`, un sitio estático desplegable en cualquier hosting (Vercel, Netlify, Cloudflare Pages…). Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno del hosting y habilita fallback a `index.html` para el router.
