-- Schema completo para la aplicación de gestión de cobros y repartos
-- Ejecutar este SQL en el editor SQL de Supabase

-- Extensión necesaria para UUIDs
create extension if not exists pgcrypto;

-- Tabla de clientes
create table if not exists public.clientes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    nombre text not null,
    fecha_entrada date not null,
    concepto text,
    importe_total numeric(12,2) not null default 0,
    estado text default 'activo' check (estado in ('activo', 'pendiente', 'pagado', 'archivado')),
    notas text,
    created_at timestamptz not null default now()
);

-- Tabla de cobros
create table if not exists public.cobros (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    cliente_id uuid not null references public.clientes(id) on delete cascade,
    fecha_cobro date not null,
    importe numeric(12,2) not null,
    metodo_pago text check (metodo_pago in ('transferencia', 'efectivo', 'tarjeta', 'bizum', 'cheque', 'otro')),
    notas text,
    created_at timestamptz not null default now()
);

-- Tabla de repartos
create table if not exists public.repartos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    fecha date not null,
    mes text not null, -- Formato: 'YYYY-MM'
    categoria text check (categoria in ('Sueldos', 'Alquiler', 'Suministros', 'Material', 'Servicios', 'Impuestos', 'Marketing', 'Transporte', 'Otros')),
    destinatario text not null,
    concepto text not null,
    importe numeric(12,2) not null,
    notas text,
    created_at timestamptz not null default now()
);

-- Tabla de cierres mensuales
create table if not exists public.cierres_mensuales (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    mes text not null unique, -- Formato: 'YYYY-MM'
    arrastre_anterior numeric(12,2) not null default 0,
    cobrado_mes numeric(12,2) not null default 0,
    repartido_mes numeric(12,2) not null default 0,
    saldo_final numeric(12,2) not null default 0,
    estado text default 'abierto' check (estado in ('abierto', 'cerrado')),
    created_at timestamptz not null default now()
);

-- Habilitar Row Level Security
alter table public.clientes enable row level security;
alter table public.cobros enable row level security;
alter table public.repartos enable row level security;
alter table public.cierres_mensuales enable row level security;

-- Políticas para clientes
create policy "clientes_select_own" on public.clientes for select using (auth.uid() = user_id);
create policy "clientes_insert_own" on public.clientes for insert with check (auth.uid() = user_id);
create policy "clientes_update_own" on public.clientes for update using (auth.uid() = user_id);
create policy "clientes_delete_own" on public.clientes for delete using (auth.uid() = user_id);

-- Políticas para cobros
create policy "cobros_select_own" on public.cobros for select using (auth.uid() = user_id);
create policy "cobros_insert_own" on public.cobros for insert with check (auth.uid() = user_id);
create policy "cobros_update_own" on public.cobros for update using (auth.uid() = user_id);
create policy "cobros_delete_own" on public.cobros for delete using (auth.uid() = user_id);

-- Políticas para repartos
create policy "repartos_select_own" on public.repartos for select using (auth.uid() = user_id);
create policy "repartos_insert_own" on public.repartos for insert with check (auth.uid() = user_id);
create policy "repartos_update_own" on public.repartos for update using (auth.uid() = user_id);
create policy "repartos_delete_own" on public.repartos for delete using (auth.uid() = user_id);

-- Políticas para cierres mensuales
create policy "cierres_select_own" on public.cierres_mensuales for select using (auth.uid() = user_id);
create policy "cierres_insert_own" on public.cierres_mensuales for insert with check (auth.uid() = user_id);
create policy "cierres_update_own" on public.cierres_mensuales for update using (auth.uid() = user_id);
create policy "cierres_delete_own" on public.cierres_mensuales for delete using (auth.uid() = user_id);

-- Índices para mejor rendimiento
create index if not exists idx_clientes_user_id on public.clientes(user_id);
create index if not exists idx_clientes_estado on public.clientes(estado);
create index if not exists idx_cobros_user_id on public.cobros(user_id);
create index if not exists idx_cobros_cliente_id on public.cobros(cliente_id);
create index if not exists idx_cobros_fecha_cobro on public.cobros(fecha_cobro);
create index if not exists idx_repartos_user_id on public.repartos(user_id);
create index if not exists idx_repartos_mes on public.repartos(mes);
create index if not exists idx_repartos_categoria on public.repartos(categoria);
create index if not exists idx_cierres_user_id on public.cierres_mensuales(user_id);
create index if not exists idx_cierres_mes on public.cierres_mensuales(mes);
