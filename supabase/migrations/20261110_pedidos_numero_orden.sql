-- ============================================================================
-- Migración: numero_orden en tabla pedidos
-- ============================================================================

alter table public.pedidos
  add column if not exists numero_orden text;

create index if not exists idx_pedidos_numero_orden on public.pedidos(numero_orden);
create index if not exists idx_ordenes_numero on public.ordenes(numero);
