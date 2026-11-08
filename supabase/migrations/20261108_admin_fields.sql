-- ============================================================================
-- Migración complementaria: Campos de Admin, Tasa BCV, Ofertas y Media
-- ============================================================================

-- 1. Campos para la tienda (Tasa BCV y Ofertas)
alter table public.tiendas
  add column if not exists tasa_bcv numeric(14, 4) not null default 52.50,
  add column if not exists modo_ofertas boolean not null default false,
  add column if not exists permite_abono boolean not null default true;

-- 2. Campos para productos (Imágenes, videos y ofertas)
alter table public.productos
  add column if not exists imagen_url text,
  add column if not exists video_url text,
  add column if not exists en_oferta boolean not null default false,
  add column if not exists precio_oferta numeric(14, 4);

-- 3. Permitir estados extendidos en ordenes
alter table public.ordenes
  drop constraint if exists ordenes_estado_check;

alter table public.ordenes
  add constraint ordenes_estado_check
  check (estado in (
    'pendiente', 'pendiente_abono',
    'pagada', 'abono_verificado',
    'procesando', 'en_preparacion',
    'despachado',
    'completada', 'entregado',
    'cancelada'
  ));

-- 4. Habilitar publicación Realtime en caso de que no esté
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'mensajes_chat'
  ) then
    alter publication supabase_realtime add table public.mensajes_chat;
  end if;
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'ordenes'
  ) then
    alter publication supabase_realtime add table public.ordenes;
  end if;
end $$;
