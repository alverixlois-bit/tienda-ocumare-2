-- ============================================================================
-- Migración: Auditoría Completa, Referencias de Pago y Comprobantes
-- ============================================================================

-- 1. Asegurar tabla auditoria_logs y nuevas columnas
create table if not exists public.auditoria_logs (
  id bigint generated always as identity primary key,
  email text,
  accion text not null,
  tabla text,
  registro_id text,
  detalles jsonb,
  created_at timestamptz not null default now()
);

alter table public.auditoria_logs
  add column if not exists email text,
  add column if not exists tabla text,
  add column if not exists registro_id text;

-- RLS para auditoria_logs
alter table public.auditoria_logs enable row level security;
drop policy if exists "permitir_auditoria_select" on public.auditoria_logs;
create policy "permitir_auditoria_select" on public.auditoria_logs for select using (true);
drop policy if exists "permitir_auditoria_insert" on public.auditoria_logs;
create policy "permitir_auditoria_insert" on public.auditoria_logs for insert with check (true);

-- 2. Asegurar columnas de pago en tabla pedidos
alter table public.pedidos
  add column if not exists referencia_pago text,
  add column if not exists comprobante_url text;

-- 3. Asegurar columnas de pago en tabla ordenes
alter table public.ordenes
  add column if not exists referencia_pago text,
  add column if not exists comprobante_url text;
