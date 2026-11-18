-- Migración para el ERP Unificado y Portal Boutique de Despachos (Stitch Reference)
-- Compatible con PostgreSQL y Supabase

-- 1. Puntos de Encuentro / Entregas Personales Seguras
CREATE TABLE IF NOT EXISTS public.puntos_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id UUID,
  nombre TEXT NOT NULL,
  direccion TEXT,
  referencia TEXT,
  horario TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Directorio de Personal y Presencia de Administradores
CREATE TABLE IF NOT EXISTS public.admin_perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alias TEXT NOT NULL UNIQUE,
  nombre TEXT,
  rol TEXT DEFAULT 'operador',
  en_linea BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Caja POS y Finanzas P&L (Movimientos de Ingresos y Egresos)
CREATE TABLE IF NOT EXISTS public.finanzas_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto_usd NUMERIC(14,2) DEFAULT 0,
  monto_ves NUMERIC(18,2) DEFAULT 0,
  metodo_pago TEXT,
  concepto TEXT NOT NULL,
  categoria TEXT DEFAULT 'venta',
  orden_id TEXT,
  comprobante_url TEXT,
  creado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ampliación de campos de Órdenes / Pedidos para PIN y Despacho
ALTER TABLE public.ordenes 
  ADD COLUMN IF NOT EXISTS pin_entrega VARCHAR(10),
  ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(50) DEFAULT 'nacional',
  ADD COLUMN IF NOT EXISTS punto_entrega_id TEXT,
  ADD COLUMN IF NOT EXISTS punto_entrega_nombre TEXT,
  ADD COLUMN IF NOT EXISTS fecha_entrega TEXT,
  ADD COLUMN IF NOT EXISTS hora_entrega TEXT,
  ADD COLUMN IF NOT EXISTS metodo_pago_sitio TEXT,
  ADD COLUMN IF NOT EXISTS denominacion_billete TEXT,
  ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(50) DEFAULT 'total_100',
  ADD COLUMN IF NOT EXISTS monto_abonado_usd NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_restante_usd NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guia_seguimiento TEXT,
  ADD COLUMN IF NOT EXISTS empresa_envio TEXT;

ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS pin_entrega VARCHAR(10),
  ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(50) DEFAULT 'nacional',
  ADD COLUMN IF NOT EXISTS punto_entrega_id TEXT,
  ADD COLUMN IF NOT EXISTS punto_entrega_nombre TEXT,
  ADD COLUMN IF NOT EXISTS fecha_entrega TEXT,
  ADD COLUMN IF NOT EXISTS hora_entrega TEXT,
  ADD COLUMN IF NOT EXISTS metodo_pago_sitio TEXT,
  ADD COLUMN IF NOT EXISTS denominacion_billete TEXT,
  ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(50) DEFAULT 'total_100',
  ADD COLUMN IF NOT EXISTS monto_abonado_usd NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_restante_usd NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guia_seguimiento TEXT,
  ADD COLUMN IF NOT EXISTS empresa_envio TEXT;

-- 5. Ampliación de Productos para atributos Stitch (características, uso, prioridad visual, tags)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS prioridad INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS caracteristicas TEXT,
  ADD COLUMN IF NOT EXISTS modo_uso TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS tag_promo TEXT;

-- 6. Mensajes de Chat (Soporte P2P y Chat Interno de Administradores)
CREATE TABLE IF NOT EXISTS public.mensajes_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id TEXT NOT NULL,
  remitente TEXT NOT NULL CHECK (remitente IN ('cliente', 'admin')),
  admin_alias TEXT,
  mensaje TEXT,
  archivo_url TEXT,
  tipo_archivo TEXT,
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS y Permisos Básicos para Lectura Pública de Puntos de Entrega
ALTER TABLE public.puntos_entrega ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Puntos entrega lectura publica" ON public.puntos_entrega;
CREATE POLICY "Puntos entrega lectura publica" ON public.puntos_entrega FOR SELECT USING (true);
DROP POLICY IF EXISTS "Puntos entrega gestion admin" ON public.puntos_entrega;
CREATE POLICY "Puntos entrega gestion admin" ON public.puntos_entrega FOR ALL USING (true);

-- Permisos mensajes_chat
ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mensajes chat lectura publica con orden" ON public.mensajes_chat;
CREATE POLICY "Mensajes chat lectura publica con orden" ON public.mensajes_chat FOR SELECT USING (true);
DROP POLICY IF EXISTS "Mensajes chat insercion" ON public.mensajes_chat;
CREATE POLICY "Mensajes chat insercion" ON public.mensajes_chat FOR INSERT WITH CHECK (true);

-- Permisos finanzas_movimientos
ALTER TABLE public.finanzas_movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finanzas acceso total" ON public.finanzas_movimientos;
CREATE POLICY "Finanzas acceso total" ON public.finanzas_movimientos FOR ALL USING (true);

-- Datos iniciales de Puntos Seguros de Entrega en Ocumare y Valles del Tuy
INSERT INTO public.puntos_entrega (nombre, direccion, referencia, horario, activo)
VALUES 
  ('Plaza Bolívar Ocumare', 'Frente a la Iglesia Matriz Nuestra Señora de Coromoto', 'Kiosco Central al lado de la estatua', 'Lunes a Sábado: 9:00 AM - 4:00 PM', true),
  ('C.C. Colonial - Entrada Principal', 'Av. Miranda, Centro de Ocumare', 'Frente a Farmatodo Colonial', 'Lunes a Sábado: 10:00 AM - 5:00 PM', true),
  ('Estación Ferrocarril Charallave Sur', 'Terminal de Pasajeros Charallave Sur', 'Torniquetes de Salida Nivel Mezzanina', 'Lunes a Viernes: 11:00 AM - 3:00 PM', true)
ON CONFLICT DO NOTHING;
