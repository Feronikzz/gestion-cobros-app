# Gestión de cobros y reparto

Proyecto base en **Next.js + TypeScript + Tailwind + Supabase**.

## Instalar

```bash
npm install
```

## Variables de entorno

Crea `.env.local` a partir de `.env.example` y rellena:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Base de datos

Ejecuta `supabase/schema.sql` en SQL Editor de Supabase.

## Arrancar

```bash
npm run dev
```

## Incluye

- App Router
- middleware de protección
- cliente Supabase browser/server
- páginas: dashboard, clientes, cobros, repartos, cierre
- datos mock para arrancar

## Siguiente paso

Conectar cada página a Supabase real con `select`, `insert`, `update` y `delete`.
