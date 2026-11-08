-- ============================================================================
-- Políticas RLS para habilitar operaciones de la Tienda Online Ocumare
-- Ejecutar en el SQL Editor de Supabase (https://reuxghaeoitjzmvouuzt.supabase.co)
-- ============================================================================

-- 1. Permitir lectura y escritura en configuracion_tienda
alter table if exists public.configuracion_tienda enable row level security;
drop policy if exists "permitir_lectura_config" on public.configuracion_tienda;
create policy "permitir_lectura_config" on public.configuracion_tienda for select using (true);

drop policy if exists "permitir_escritura_config" on public.configuracion_tienda;
create policy "permitir_escritura_config" on public.configuracion_tienda for all using (true) with check (true);

-- Insertar fila de configuración inicial si no existe
insert into public.configuracion_tienda (tasa_bcv)
select 52.50
where not exists (select 1 from public.configuracion_tienda);

-- 2. Permitir lectura y gestión de productos
alter table if exists public.productos enable row level security;
drop policy if exists "permitir_lectura_productos" on public.productos;
create policy "permitir_lectura_productos" on public.productos for select using (true);

drop policy if exists "permitir_escritura_productos" on public.productos;
create policy "permitir_escritura_productos" on public.productos for all using (true) with check (true);

-- 3. Permitir creación y lectura de pedidos
alter table if exists public.pedidos enable row level security;
drop policy if exists "permitir_lectura_pedidos" on public.pedidos;
create policy "permitir_lectura_pedidos" on public.pedidos for select using (true);

drop policy if exists "permitir_crear_pedidos" on public.pedidos;
create policy "permitir_crear_pedidos" on public.pedidos for insert with check (true);

drop policy if exists "permitir_actualizar_pedidos" on public.pedidos;
create policy "permitir_actualizar_pedidos" on public.pedidos for update using (true);

-- 4. Permitir chat P2P y comprobantes
alter table if exists public.mensajes_chat enable row level security;
drop policy if exists "permitir_chat_select" on public.mensajes_chat;
create policy "permitir_chat_select" on public.mensajes_chat for select using (true);

drop policy if exists "permitir_chat_insert" on public.mensajes_chat;
create policy "permitir_chat_insert" on public.mensajes_chat for insert with check (true);

-- 5. Permitir lectura y registro de auditoria_logs
alter table if exists public.auditoria_logs enable row level security;
drop policy if exists "permitir_auditoria_select" on public.auditoria_logs;
create policy "permitir_auditoria_select" on public.auditoria_logs for select using (true);

drop policy if exists "permitir_auditoria_insert" on public.auditoria_logs;
create policy "permitir_auditoria_insert" on public.auditoria_logs for insert with check (true);

-- 6. Habilitar publicación Realtime en Postgres
alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.mensajes_chat;
alter publication supabase_realtime add table public.configuracion_tienda;
