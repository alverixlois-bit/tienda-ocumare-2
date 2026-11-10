-- ============================================================================
-- Migración: Categorías, Redes Sociales y 3 Líneas de WhatsApp de Vendedores
-- ============================================================================

-- 1. Crear tabla de categorias si no existe
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid default '11111111-1111-4111-8111-111111111111'::uuid,
  nombre text not null check (length(btrim(nombre)) > 0),
  slug text,
  descripcion text,
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS para categorias
alter table public.categorias enable row level security;
drop policy if exists "categorias_select_all" on public.categorias;
create policy "categorias_select_all" on public.categorias for select using (true);

drop policy if exists "categorias_insert_all" on public.categorias;
create policy "categorias_insert_all" on public.categorias for insert with check (true);

drop policy if exists "categorias_update_all" on public.categorias;
create policy "categorias_update_all" on public.categorias for update using (true);

drop policy if exists "categorias_delete_all" on public.categorias;
create policy "categorias_delete_all" on public.categorias for delete using (true);

-- 2. Asegurar columna categoria_id en productos
alter table public.productos
  add column if not exists categoria_id uuid references public.categorias(id) on delete set null;

-- 3. Ampliar configuracion_tienda con Redes Sociales y 3 Vendedores WhatsApp
alter table public.configuracion_tienda
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists facebook_url text,
  add column if not exists whatsapp_1 text default '+58 412 1111111',
  add column if not exists whatsapp_1_nombre text default 'Ventas y Encargos (Asesor 1)',
  add column if not exists whatsapp_2 text default '+58 424 2222222',
  add column if not exists whatsapp_2_nombre text default 'Verificación de Pagos (Asesor 2)',
  add column if not exists whatsapp_3 text default '+58 414 3333333',
  add column if not exists whatsapp_3_nombre text default 'Despachos Zoom / MRW (Asesor 3)';

-- Insertar categorias iniciales por defecto si la tabla está vacía
insert into public.categorias (nombre, descripcion, orden)
select 'Tecnología', 'Dispositivos y accesorios electrónicos', 1
where not exists (select 1 from public.categorias where nombre = 'Tecnología');

insert into public.categorias (nombre, descripcion, orden)
select 'Ropa y Calzado', 'Moda para damas, caballeros y niños', 2
where not exists (select 1 from public.categorias where nombre = 'Ropa y Calzado');

insert into public.categorias (nombre, descripcion, orden)
select 'Hogar y Cocina', 'Artículos y utensilios para el hogar', 3
where not exists (select 1 from public.categorias where nombre = 'Hogar y Cocina');

-- 4. Bucket de Almacenamiento Supabase Storage ('productos')
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access to Productos Bucket" on storage.objects;
create policy "Public Access to Productos Bucket"
on storage.objects for select
using (bucket_id = 'productos');

drop policy if exists "Allow Upload to Productos Bucket" on storage.objects;
create policy "Allow Upload to Productos Bucket"
on storage.objects for insert
with check (bucket_id = 'productos');

drop policy if exists "Allow Update to Productos Bucket" on storage.objects;
create policy "Allow Update to Productos Bucket"
on storage.objects for update
using (bucket_id = 'productos');
