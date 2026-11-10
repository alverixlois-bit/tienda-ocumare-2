-- ============================================================================
-- Migración: Métodos de Pago y Datos Bancarios en configuracion_tienda
-- ============================================================================

alter table public.configuracion_tienda
  -- Pago Móvil
  add column if not exists pago_movil_banco text default '0102 - Banco de Venezuela',
  add column if not exists pago_movil_telefono text default '04121234567',
  add column if not exists pago_movil_cedula text default 'V-12345678',

  -- Transferencia Bancaria Nacional
  add column if not exists transferencia_banco text default 'Banesco Banco Universal',
  add column if not exists transferencia_cuenta text default '0134-0000-00-0000000000',
  add column if not exists transferencia_beneficiario text default 'OcumareHub C.A.',
  add column if not exists transferencia_rif text default 'J-12345678-0',

  -- Binance Pay / Cripto
  add column if not exists binance_pay_email text,
  add column if not exists binance_pay_id text,

  -- Otros Métodos / Instrucciones Libres (Zelle, Efectivo, etc.)
  add column if not exists otros_metodos_pago text;
