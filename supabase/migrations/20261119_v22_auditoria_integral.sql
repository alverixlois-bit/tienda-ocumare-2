-- ═══════════════════════════════════════════════════════════════════════
-- Migración v2.2 — Auditoría y Corrección Integral
-- Encargos Boutique / OcumareHub
-- Fecha: 2026-11-19
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Tabla de Perfiles de Administradores ───────────────────────────
CREATE TABLE IF NOT EXISTS public.perfiles_admin (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE NOT NULL,
  alias        TEXT NOT NULL,
  email        TEXT,
  nombre_completo TEXT,
  grado        INT DEFAULT 1,
  avatar_url   TEXT,
  en_linea     BOOLEAN DEFAULT FALSE,
  ultima_conexion TIMESTAMPTZ,
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS para perfiles_admin
ALTER TABLE public.perfiles_admin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfiles admin lectura total" ON public.perfiles_admin;
CREATE POLICY "Perfiles admin lectura total" ON public.perfiles_admin
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Perfiles admin gestion propia" ON public.perfiles_admin;
CREATE POLICY "Perfiles admin gestion propia" ON public.perfiles_admin
  FOR ALL USING (true);

-- Alias heredado de admin_perfiles si existe
ALTER TABLE public.admin_perfiles
  ADD COLUMN IF NOT EXISTS grado INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS ultima_conexion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nombre_completo TEXT;

-- Insertar los 3 Administradores Principales (upsert seguro)
INSERT INTO public.perfiles_admin (user_id, alias, email, nombre_completo, grado, en_linea)
VALUES
  ('6cb39b48-b5c0-430b-98c6-cb2b0c038959', '@admin1', 'alverixlois@gmail.com',      'Administrador Principal 1', 1, false),
  ('078cfad5-1b91-4718-9e06-34ef7ba9bf4f', '@admin2', 'mariangel.darkmcg@gmail.com', 'Administrador Principal 2', 1, false),
  ('b1836edc-09e4-4d94-be04-d65d146defae', '@admin3', 'rebete.r04@gmail.com',         'Administrador Principal 3', 1, false)
ON CONFLICT (user_id) DO UPDATE SET
  grado           = EXCLUDED.grado,
  email           = EXCLUDED.email,
  nombre_completo = EXCLUDED.nombre_completo;

-- ─── 2. Tabla de Cuentas Bancarias y Métodos de Pago (CRUD dinámico) ──
CREATE TABLE IF NOT EXISTS public.cuentas_bancarias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id  TEXT DEFAULT '11111111-1111-4111-8111-111111111111',
  tipo       TEXT NOT NULL CHECK (tipo IN ('pago_movil','transferencia','binance','zelle','efectivo','otro')),
  nombre     TEXT NOT NULL,
  datos      JSONB NOT NULL DEFAULT '{}',
  activo     BOOLEAN DEFAULT TRUE,
  orden      INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cuentas bancarias acceso total" ON public.cuentas_bancarias;
CREATE POLICY "Cuentas bancarias acceso total" ON public.cuentas_bancarias FOR ALL USING (true);

-- ─── 3. Tabla de Canales de Contacto y Redes Sociales (CRUD dinámico) ─
CREATE TABLE IF NOT EXISTS public.canales_contacto (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id  TEXT DEFAULT '11111111-1111-4111-8111-111111111111',
  tipo       TEXT NOT NULL CHECK (tipo IN ('whatsapp','instagram','tiktok','telegram','facebook','email','otro')),
  valor      TEXT NOT NULL,
  etiqueta   TEXT,
  activo     BOOLEAN DEFAULT TRUE,
  orden      INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.canales_contacto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Canales contacto acceso total" ON public.canales_contacto;
CREATE POLICY "Canales contacto acceso total" ON public.canales_contacto FOR ALL USING (true);

-- ─── 4. Tabla mensajes_chat — asegurar columnas necesarias ────────────
CREATE TABLE IF NOT EXISTS public.mensajes_chat (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id    TEXT NOT NULL,
  remitente   TEXT NOT NULL CHECK (remitente IN ('cliente', 'admin')),
  admin_alias TEXT,
  mensaje     TEXT,
  archivo_url TEXT,
  tipo_archivo TEXT,
  leido       BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Agregar columnas faltantes si la tabla ya existía sin ellas
ALTER TABLE public.mensajes_chat
  ADD COLUMN IF NOT EXISTS admin_alias  TEXT,
  ADD COLUMN IF NOT EXISTS archivo_url  TEXT,
  ADD COLUMN IF NOT EXISTS tipo_archivo TEXT;

ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mensajes chat select" ON public.mensajes_chat;
CREATE POLICY "Mensajes chat select" ON public.mensajes_chat FOR SELECT USING (true);
DROP POLICY IF EXISTS "Mensajes chat insert" ON public.mensajes_chat;
CREATE POLICY "Mensajes chat insert" ON public.mensajes_chat FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Mensajes chat update" ON public.mensajes_chat;
CREATE POLICY "Mensajes chat update" ON public.mensajes_chat FOR UPDATE USING (true);

-- ─── 5. Tabla auditoria_logs — columnas de trazabilidad de admin ──────
ALTER TABLE public.auditoria_logs
  ADD COLUMN IF NOT EXISTS admin_id UUID,
  ADD COLUMN IF NOT EXISTS admin_alias TEXT,
  ADD COLUMN IF NOT EXISTS grado INT DEFAULT 1;

-- ─── 6. Columnas de marca en configuracion_tienda ─────────────────────
ALTER TABLE public.configuracion_tienda
  ADD COLUMN IF NOT EXISTS nombre_tienda    TEXT DEFAULT 'Encargos Boutique',
  ADD COLUMN IF NOT EXISTS slogan           TEXT DEFAULT 'Tu Boutique Digital de Encargos & Despachos Asegurados',
  ADD COLUMN IF NOT EXISTS telefono_tienda  TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_principal TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url     TEXT,
  ADD COLUMN IF NOT EXISTS telegram_url     TEXT;

-- Limpiar fila de configuración (asegurar que exista la fila id=1)
INSERT INTO public.configuracion_tienda (id, tasa_bcv)
VALUES (1, 64.50)
ON CONFLICT (id) DO NOTHING;

-- ─── 7. Índices de rendimiento ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_orden_id ON public.mensajes_chat(orden_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_created  ON public.mensajes_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_tipo ON public.cuentas_bancarias(tipo);
CREATE INDEX IF NOT EXISTS idx_canales_contacto_tipo  ON public.canales_contacto(tipo);
CREATE INDEX IF NOT EXISTS idx_perfiles_admin_user    ON public.perfiles_admin(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_admin_id     ON public.auditoria_logs(admin_id);

-- ─── 8. Función para actualizar updated_at automáticamente ───────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cuentas_updated_at ON public.cuentas_bancarias;
CREATE TRIGGER trg_cuentas_updated_at
  BEFORE UPDATE ON public.cuentas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_canales_updated_at ON public.canales_contacto;
CREATE TRIGGER trg_canales_updated_at
  BEFORE UPDATE ON public.canales_contacto
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_perfiles_updated_at ON public.perfiles_admin;
CREATE TRIGGER trg_perfiles_updated_at
  BEFORE UPDATE ON public.perfiles_admin
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
