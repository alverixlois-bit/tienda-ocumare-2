/**
 * Contrato de la base de datos de OcumareHub para el cliente de Supabase.
 *
 * IMPORTANTE: estos tipos son la representacion tipada del esquema creado por
 * `supabase/migrations/0001_init.sql`. Si el esquema cambia, regenerar con:
 *
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 *
 * Reglas:
 *   - Las columnas monetarias y de cantidad son NUMERIC y llegan como string.
 *   - Nunca convertir estos valores a `number` para operar: usar decimal.js.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Moneda base elegible por el vendedor para precios del catalogo y ordenes. */
export type MonedaBase = "USD" | "VES";

// ---------------------------------------------------------------------------
// tiendas
// ---------------------------------------------------------------------------

export type TiendaRow = {
  id: string;
  propietario_id: string;
  nombre: string;
  slug: string | null;
  descripcion: string | null;
  telefono: string | null;
  activo: boolean;
  tasa_bcv?: number | string | null;
  modo_ofertas?: boolean | null;
  permite_abono?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type TiendaInsert = {
  id?: string;
  propietario_id: string;
  nombre: string;
  slug?: string | null;
  descripcion?: string | null;
  telefono?: string | null;
  activo?: boolean;
  tasa_bcv?: number | string | null;
  modo_ofertas?: boolean | null;
  permite_abono?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type TiendaUpdate = {
  id?: string;
  propietario_id?: string;
  nombre?: string;
  slug?: string | null;
  descripcion?: string | null;
  telefono?: string | null;
  activo?: boolean;
  tasa_bcv?: number | string | null;
  modo_ofertas?: boolean | null;
  permite_abono?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// categorias
// ---------------------------------------------------------------------------

export type CategoriaRow = {
  id: string;
  tienda_id: string;
  nombre: string;
  slug: string | null;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type CategoriaInsert = {
  id?: string;
  tienda_id: string;
  nombre: string;
  slug?: string | null;
  descripcion?: string | null;
  activo?: boolean;
  orden?: number;
  created_at?: string;
  updated_at?: string;
};

export type CategoriaUpdate = {
  id?: string;
  tienda_id?: string;
  nombre?: string;
  slug?: string | null;
  descripcion?: string | null;
  activo?: boolean;
  orden?: number;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// productos
// ---------------------------------------------------------------------------

export type ProductoRow = {
  id: string;
  tienda_id: string;
  categoria_id: string | null;
  titulo: string;
  nombre?: string;
  descripcion: string | null;
  /** Moneda base exacta fijada por el vendedor. */
  moneda_base: MonedaBase;
  /** Precio exacto en `moneda_base`. */
  precio_base: string;
  precio_usd?: number | string;
  unidad_medida: string;
  permite_decimales: boolean;
  stock: string;
  activo: boolean;
  imagen_url?: string | null;
  imagenes?: string[] | null;
  imagen?: string | null;
  video_url?: string | null;
  en_oferta?: boolean | null;
  precio_oferta?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductoInsert = {
  id?: string;
  tienda_id: string;
  categoria_id?: string | null;
  titulo?: string;
  nombre?: string;
  descripcion?: string | null;
  moneda_base?: MonedaBase;
  precio_base?: string;
  precio_usd?: number | string;
  unidad_medida?: string;
  permite_decimales?: boolean;
  stock?: string | number;
  activo?: boolean;
  imagen_url?: string | null;
  imagenes?: string[] | null;
  imagen?: string | null;
  video_url?: string | null;
  en_oferta?: boolean | null;
  precio_oferta?: string | number | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductoUpdate = {
  id?: string;
  tienda_id?: string;
  categoria_id?: string | null;
  titulo?: string;
  nombre?: string;
  descripcion?: string | null;
  moneda_base?: MonedaBase;
  precio_base?: string;
  precio_usd?: number | string;
  unidad_medida?: string;
  permite_decimales?: boolean;
  stock?: string | number;
  activo?: boolean;
  imagen_url?: string | null;
  imagenes?: string[] | null;
  imagen?: string | null;
  video_url?: string | null;
  en_oferta?: boolean | null;
  precio_oferta?: string | number | null;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// grupos_opciones
// ---------------------------------------------------------------------------

export type GrupoOpcionesRow = {
  id: string;
  producto_id: string;
  nombre: string;
  requerido: boolean;
  permite_multiple: boolean;
  orden: number;
  created_at: string;
};

type GrupoOpcionesInsert = {
  id?: string;
  producto_id: string;
  nombre: string;
  requerido?: boolean;
  permite_multiple?: boolean;
  orden?: number;
  created_at?: string;
};

type GrupoOpcionesUpdate = {
  id?: string;
  producto_id?: string;
  nombre?: string;
  requerido?: boolean;
  permite_multiple?: boolean;
  orden?: number;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// opciones_variantes
// ---------------------------------------------------------------------------

export type OpcionVarianteRow = {
  id: string;
  grupo_id: string;
  nombre: string;
  /** Moneda base exacta fijada por el vendedor para el adicional. */
  moneda_base: MonedaBase;
  /** Adicional exacto en `moneda_base`, por unidad. */
  precio_base: string;
  activo: boolean;
  orden: number;
  created_at: string;
};

type OpcionVarianteInsert = {
  id?: string;
  grupo_id: string;
  nombre: string;
  moneda_base?: MonedaBase;
  precio_base?: string;
  activo?: boolean;
  orden?: number;
  created_at?: string;
};

type OpcionVarianteUpdate = {
  id?: string;
  grupo_id?: string;
  nombre?: string;
  moneda_base?: MonedaBase;
  precio_base?: string;
  activo?: boolean;
  orden?: number;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// ordenes
// ---------------------------------------------------------------------------

export type EstadoOrden =
  | "pendiente"
  | "pendiente_abono"
  | "pagada"
  | "abono_verificado"
  | "procesando"
  | "en_preparacion"
  | "despachado"
  | "completada"
  | "entregado"
  | "cancelada";

export type OrdenRow = {
  id: string;
  numero: string;
  tienda_id: string;
  cliente_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  direccion_entrega: string | null;
  metodo_entrega: "zoom" | "mrw" | "tealca" | "personal";
  modalidad_pago: "completo" | "abono";
  estado: EstadoOrden;
  moneda_base: MonedaBase;
  tasa_cambio_bcv: string;
  subtotal_usd: string;
  total_usd: string;
  total_ves_exacto: string;
  total_ves: string;
  monto_inicial_usd: string;
  monto_inicial_ves: string;
  saldo_pendiente_usd: string;
  saldo_pendiente_ves: string;
  redondeo_ves_entero: boolean;
  comprobante_url: string | null;
  referencia_pago?: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type MetodoEntrega = "zoom" | "mrw" | "tealca" | "personal";

export type OrdenInsert = {
  id?: string;
  numero?: string;
  tienda_id: string;
  cliente_id?: string | null;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  direccion_entrega?: string | null;
  metodo_entrega?: MetodoEntrega;
  modalidad_pago?: "completo" | "abono";
  estado?: EstadoOrden;
  moneda_base?: MonedaBase;
  tasa_cambio_bcv: string;
  subtotal_usd: string;
  total_usd: string;
  total_ves_exacto: string;
  total_ves: string;
  monto_inicial_usd?: string;
  monto_inicial_ves?: string;
  saldo_pendiente_usd?: string;
  saldo_pendiente_ves?: string;
  redondeo_ves_entero?: boolean;
  comprobante_url?: string | null;
  referencia_pago?: string | null;
  notas?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OrdenUpdate = {
  id?: string;
  numero?: string;
  tienda_id?: string;
  cliente_id?: string | null;
  cliente_nombre?: string;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  direccion_entrega?: string | null;
  metodo_entrega?: "zoom" | "mrw" | "tealca" | "personal";
  modalidad_pago?: "completo" | "abono";
  estado?: EstadoOrden;
  moneda_base?: MonedaBase;
  tasa_cambio_bcv?: string;
  subtotal_usd?: string;
  total_usd?: string;
  total_ves_exacto?: string;
  total_ves?: string;
  monto_inicial_usd?: string;
  monto_inicial_ves?: string;
  saldo_pendiente_usd?: string;
  saldo_pendiente_ves?: string;
  redondeo_ves_entero?: boolean;
  comprobante_url?: string | null;
  referencia_pago?: string | null;
  notas?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// orden_items
// ---------------------------------------------------------------------------

export type OrdenItemRow = {
  id: string;
  orden_id: string;
  producto_id: string | null;
  producto_titulo: string;
  unidad_medida: string;
  /** Moneda base exacta con la que se congelo el item. */
  moneda_base: MonedaBase;
  /** Precio unitario exacto en `moneda_base` (incluye variante). */
  precio_base: string;
  /** Precio unitario congelado en USD. */
  precio_unitario_usd: string;
  /** Precio unitario congelado en VES. */
  precio_unitario_ves: string;
  variantes_seleccionadas: Json;
  cantidad: string;
  subtotal_usd: string;
  subtotal_ves_exacto: string;
  subtotal_ves: string;
  created_at: string;
};

export type OrdenItemInsert = {
  id?: string;
  orden_id: string;
  producto_id?: string | null;
  producto_titulo: string;
  unidad_medida: string;
  moneda_base?: MonedaBase;
  precio_base: string;
  precio_unitario_usd: string;
  precio_unitario_ves: string;
  variantes_seleccionadas?: Json;
  cantidad: string;
  subtotal_usd: string;
  subtotal_ves_exacto: string;
  subtotal_ves: string;
  created_at?: string;
};

export type OrdenItemUpdate = {
  id?: string;
  orden_id?: string;
  producto_id?: string | null;
  producto_titulo?: string;
  unidad_medida?: string;
  moneda_base?: MonedaBase;
  precio_base?: string;
  precio_unitario_usd?: string;
  precio_unitario_ves?: string;
  variantes_seleccionadas?: Json;
  cantidad?: string;
  subtotal_usd?: string;
  subtotal_ves_exacto?: string;
  subtotal_ves?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// mensajes_chat
// ---------------------------------------------------------------------------

export type RemitenteRol = "cliente" | "vendedor" | "sistema";

export type MensajeChatRow = {
  id: string;
  tienda_id: string;
  orden_id: string | null;
  cliente_id: string | null;
  remitente_id: string | null;
  remitente_rol: RemitenteRol;
  mensaje: string;
  leido: boolean;
  created_at: string;
};

export type MensajeChatInsert = {
  id?: string;
  tienda_id: string;
  orden_id?: string | null;
  cliente_id?: string | null;
  remitente_id?: string | null;
  remitente_rol?: RemitenteRol;
  mensaje: string;
  leido?: boolean;
  created_at?: string;
};

export type MensajeChatUpdate = {
  id?: string;
  tienda_id?: string;
  orden_id?: string | null;
  cliente_id?: string | null;
  remitente_id?: string | null;
  remitente_rol?: RemitenteRol;
  mensaje?: string;
  leido?: boolean;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// auditoria_ordenes
// ---------------------------------------------------------------------------

export type AuditoriaOrdenRow = {
  id: string;
  orden_id: string;
  tienda_id: string;
  numero_orden: string;
  accion: "creada" | "actualizada";
  estado_anterior: EstadoOrden | null;
  estado_nuevo: EstadoOrden;
  cambios: Json;
  actor_id: string | null;
  created_at: string;
};

type AuditoriaOrdenInsert = {
  id?: string;
  orden_id: string;
  tienda_id: string;
  numero_orden: string;
  accion: "creada" | "actualizada";
  estado_anterior?: EstadoOrden | null;
  estado_nuevo: EstadoOrden;
  cambios?: Json;
  actor_id?: string | null;
  created_at?: string;
};

type AuditoriaOrdenUpdate = {
  id?: string;
  orden_id?: string;
  tienda_id?: string;
  numero_orden?: string;
  accion?: "creada" | "actualizada";
  estado_anterior?: EstadoOrden | null;
  estado_nuevo?: EstadoOrden;
  cambios?: Json;
  actor_id?: string | null;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// ESQUEMA REAL SUPABASE (Ocumare 2)
// ---------------------------------------------------------------------------

export type ConfiguracionTiendaRow = {
  id: string | number;
  tasa_bcv: number | string;
  updated_at?: string;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  facebook_url?: string | null;
  whatsapp_1?: string | null;
  whatsapp_1_nombre?: string | null;
  whatsapp_2?: string | null;
  whatsapp_2_nombre?: string | null;
  whatsapp_3?: string | null;
  whatsapp_3_nombre?: string | null;
  // Métodos de Pago
  pago_movil_banco?: string | null;
  pago_movil_telefono?: string | null;
  pago_movil_cedula?: string | null;
  transferencia_banco?: string | null;
  transferencia_cuenta?: string | null;
  transferencia_beneficiario?: string | null;
  transferencia_rif?: string | null;
  binance_pay_email?: string | null;
  binance_pay_id?: string | null;
  otros_metodos_pago?: string | null;
};

export type ConfiguracionTiendaInsert = {
  id?: string | number;
  tasa_bcv: number | string;
  updated_at?: string;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  facebook_url?: string | null;
  whatsapp_1?: string | null;
  whatsapp_1_nombre?: string | null;
  whatsapp_2?: string | null;
  whatsapp_2_nombre?: string | null;
  whatsapp_3?: string | null;
  whatsapp_3_nombre?: string | null;
  // Métodos de Pago
  pago_movil_banco?: string | null;
  pago_movil_telefono?: string | null;
  pago_movil_cedula?: string | null;
  transferencia_banco?: string | null;
  transferencia_cuenta?: string | null;
  transferencia_beneficiario?: string | null;
  transferencia_rif?: string | null;
  binance_pay_email?: string | null;
  binance_pay_id?: string | null;
  otros_metodos_pago?: string | null;
};

export type ConfiguracionTiendaUpdate = {
  id?: string | number;
  tasa_bcv?: number | string;
  updated_at?: string;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  facebook_url?: string | null;
  whatsapp_1?: string | null;
  whatsapp_1_nombre?: string | null;
  whatsapp_2?: string | null;
  whatsapp_2_nombre?: string | null;
  whatsapp_3?: string | null;
  whatsapp_3_nombre?: string | null;
  // Métodos de Pago
  pago_movil_banco?: string | null;
  pago_movil_telefono?: string | null;
  pago_movil_cedula?: string | null;
  transferencia_banco?: string | null;
  transferencia_cuenta?: string | null;
  transferencia_beneficiario?: string | null;
  transferencia_rif?: string | null;
  binance_pay_email?: string | null;
  binance_pay_id?: string | null;
  otros_metodos_pago?: string | null;
};

export type ProductoDbRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_usd: number | string;
  stock: number | string;
  video_url: string | null;
  activo: boolean;
  categoria_id?: string | null;
  imagen_url?: string | null;
  imagenes?: string[] | null;
  imagen?: string | null;
  en_oferta?: boolean | null;
  precio_oferta?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductoDbInsert = {
  id?: string;
  nombre: string;
  descripcion?: string | null;
  precio_usd: number | string;
  stock?: number | string;
  video_url?: string | null;
  activo?: boolean;
  categoria_id?: string | null;
  imagen_url?: string | null;
  imagenes?: string[] | null;
  imagen?: string | null;
  en_oferta?: boolean | null;
  precio_oferta?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductoDbUpdate = {
  id?: string;
  nombre?: string;
  descripcion?: string | null;
  precio_usd?: number | string;
  stock?: number | string;
  video_url?: string | null;
  activo?: boolean;
  categoria_id?: string | null;
  imagen_url?: string | null;
  imagenes?: string[] | null;
  imagen?: string | null;
  en_oferta?: boolean | null;
  precio_oferta?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

export type PedidoDbRow = {
  id: string;
  numero_orden?: string | null;
  cliente_nombre: string;
  cliente_cedula: string;
  cliente_telefono: string;
  agencia_envio: string;
  estado_pago: EstadoOrden | string;
  referencia_pago?: string | null;
  comprobante_url?: string | null;
  created_at?: string;
};

export type PedidoDbInsert = {
  id?: string;
  numero_orden?: string | null;
  cliente_nombre: string;
  cliente_cedula: string;
  cliente_telefono: string;
  agencia_envio: string;
  estado_pago: EstadoOrden | string;
  referencia_pago?: string | null;
  comprobante_url?: string | null;
  created_at?: string;
};

export type PedidoDbUpdate = {
  id?: string;
  numero_orden?: string | null;
  cliente_nombre?: string;
  cliente_cedula?: string;
  cliente_telefono?: string;
  agencia_envio?: string;
  estado_pago?: EstadoOrden | string;
  referencia_pago?: string | null;
  comprobante_url?: string | null;
  created_at?: string;
};

export type AuditoriaLogDbRow = {
  id: string | number;
  email?: string | null;
  accion: string;
  tabla?: string | null;
  registro_id?: string | null;
  detalles: Json | string;
  created_at?: string;
};

export type AuditoriaLogDbInsert = {
  id?: string | number;
  email?: string | null;
  accion: string;
  tabla?: string | null;
  registro_id?: string | null;
  detalles: Json | string;
  created_at?: string;
};

export type AuditoriaLogDbUpdate = {
  id?: string | number;
  email?: string | null;
  accion?: string;
  tabla?: string | null;
  registro_id?: string | null;
  detalles?: Json | string;
  created_at?: string;
};

export type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      configuracion_tienda: {
        Row: ConfiguracionTiendaRow;
        Insert: ConfiguracionTiendaInsert;
        Update: ConfiguracionTiendaUpdate;
        Relationships: GenericRelationship[];
      };
      pedidos: {
        Row: PedidoDbRow;
        Insert: PedidoDbInsert;
        Update: PedidoDbUpdate;
        Relationships: GenericRelationship[];
      };
      auditoria_logs: {
        Row: AuditoriaLogDbRow;
        Insert: AuditoriaLogDbInsert;
        Update: AuditoriaLogDbUpdate;
        Relationships: GenericRelationship[];
      };
      tiendas: {
        Row: TiendaRow;
        Insert: TiendaInsert;
        Update: TiendaUpdate;
        Relationships: GenericRelationship[];
      };
      categorias: {
        Row: CategoriaRow;
        Insert: CategoriaInsert;
        Update: CategoriaUpdate;
        Relationships: GenericRelationship[];
      };
      productos: {
        Row: ProductoRow;
        Insert: ProductoInsert;
        Update: ProductoUpdate;
        Relationships: GenericRelationship[];
      };
      grupos_opciones: {
        Row: GrupoOpcionesRow;
        Insert: GrupoOpcionesInsert;
        Update: GrupoOpcionesUpdate;
        Relationships: GenericRelationship[];
      };
      opciones_variantes: {
        Row: OpcionVarianteRow;
        Insert: OpcionVarianteInsert;
        Update: OpcionVarianteUpdate;
        Relationships: GenericRelationship[];
      };
      ordenes: {
        Row: OrdenRow;
        Insert: OrdenInsert;
        Update: OrdenUpdate;
        Relationships: GenericRelationship[];
      };
      orden_items: {
        Row: OrdenItemRow;
        Insert: OrdenItemInsert;
        Update: OrdenItemUpdate;
        Relationships: GenericRelationship[];
      };
      mensajes_chat: {
        Row: MensajeChatRow;
        Insert: MensajeChatInsert;
        Update: MensajeChatUpdate;
        Relationships: GenericRelationship[];
      };
      auditoria_ordenes: {
        Row: AuditoriaOrdenRow;
        Insert: AuditoriaOrdenInsert;
        Update: AuditoriaOrdenUpdate;
        Relationships: GenericRelationship[];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      descontar_stock_item: {
        Args: {
          p_producto_id: string;
          p_cantidad: number;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
