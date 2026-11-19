"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAccionAuditoria } from "@/lib/audit";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces y Tipos de Configuración
// ─────────────────────────────────────────────────────────────────────────────

export interface TasaBCVResponse {
  success: boolean;
  tasa?: number;
  updatedAt?: string;
  error?: string;
}

export interface ConfiguracionTiendaData {
  nombre_tienda?: string | null;
  slogan?: string | null;
  telefono_tienda?: string | null;
  tasa_bcv: number;
  updated_at: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  facebook_url?: string | null;
  whatsapp_1?: string | null;
  whatsapp_1_nombre?: string | null;
  whatsapp_2?: string | null;
  whatsapp_2_nombre?: string | null;
  whatsapp_3?: string | null;
  whatsapp_3_nombre?: string | null;
  // Métodos de Pago y Datos Bancarios
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
}

export interface CuentaBancaria {
  id?: string;
  tienda_id?: string;
  tipo: "pago_movil" | "transferencia" | "binance" | "zelle" | "efectivo" | "otro";
  nombre: string;
  datos: Record<string, string>;
  activo: boolean;
  orden: number;
}

export interface CanalContacto {
  id?: string;
  tienda_id?: string;
  tipo: "whatsapp" | "instagram" | "tiktok" | "telegram" | "facebook" | "email" | "otro";
  valor: string;
  etiqueta?: string;
  activo: boolean;
  orden: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Configuración de Tienda (Legacy y General)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta la configuración completa de la tienda (tasa, marca, redes y métodos de pago).
 * Valores fallback limpios de números de prueba y cuentas ficticias.
 */
export async function obtenerConfiguracionTienda(): Promise<ConfiguracionTiendaData> {
  const fallback: ConfiguracionTiendaData = {
    nombre_tienda: "Encargos Boutique",
    slogan: "Tu Boutique Digital de Encargos & Despachos Asegurados",
    telefono_tienda: "",
    tasa_bcv: 52.5,
    updated_at: null,
    instagram_url: "",
    tiktok_url: "",
    facebook_url: "",
    whatsapp_1: "",
    whatsapp_1_nombre: "Ventas Principal",
    whatsapp_2: "",
    whatsapp_2_nombre: "Atención al Cliente",
    whatsapp_3: "",
    whatsapp_3_nombre: "Despachos y Pagos",
    // Métodos de pago limpios
    pago_movil_banco: "0102 - Banco de Venezuela",
    pago_movil_telefono: "",
    pago_movil_cedula: "",
    transferencia_banco: "Banesco Banco Universal",
    transferencia_cuenta: "",
    transferencia_beneficiario: "",
    transferencia_rif: "",
    binance_pay_email: "",
    binance_pay_id: "",
    otros_metodos_pago: "",
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("configuracion_tienda")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.warn("Aviso al consultar configuracion_tienda:", error.message);
    }

    if (data) {
      const d = data as any;
      return {
        nombre_tienda: d.nombre_tienda ?? fallback.nombre_tienda,
        slogan: d.slogan ?? fallback.slogan,
        telefono_tienda: d.telefono_tienda ?? fallback.telefono_tienda,
        tasa_bcv: Number(data.tasa_bcv) || 52.5,
        updated_at: data.updated_at || null,
        instagram_url: data.instagram_url || "",
        tiktok_url: data.tiktok_url || "",
        facebook_url: data.facebook_url || "",
        whatsapp_1: data.whatsapp_1 ?? fallback.whatsapp_1,
        whatsapp_1_nombre: data.whatsapp_1_nombre || fallback.whatsapp_1_nombre,
        whatsapp_2: data.whatsapp_2 ?? fallback.whatsapp_2,
        whatsapp_2_nombre: data.whatsapp_2_nombre || fallback.whatsapp_2_nombre,
        whatsapp_3: data.whatsapp_3 ?? fallback.whatsapp_3,
        whatsapp_3_nombre: data.whatsapp_3_nombre || fallback.whatsapp_3_nombre,
        // Métodos de pago
        pago_movil_banco: data.pago_movil_banco ?? fallback.pago_movil_banco,
        pago_movil_telefono: data.pago_movil_telefono ?? fallback.pago_movil_telefono,
        pago_movil_cedula: data.pago_movil_cedula ?? fallback.pago_movil_cedula,
        transferencia_banco: data.transferencia_banco ?? fallback.transferencia_banco,
        transferencia_cuenta: data.transferencia_cuenta ?? fallback.transferencia_cuenta,
        transferencia_beneficiario: data.transferencia_beneficiario ?? fallback.transferencia_beneficiario,
        transferencia_rif: data.transferencia_rif ?? fallback.transferencia_rif,
        binance_pay_email: data.binance_pay_email ?? fallback.binance_pay_email,
        binance_pay_id: data.binance_pay_id ?? fallback.binance_pay_id,
        otros_metodos_pago: data.otros_metodos_pago ?? fallback.otros_metodos_pago,
      };
    }

    return fallback;
  } catch (err) {
    console.warn("Excepción al consultar configuracion_tienda:", err);
    return fallback;
  }
}

/**
 * Función interna resiliente para actualizar campos en configuracion_tienda.
 * Si una columna aún no ha sido migrada en Supabase, la omite y persiste el resto sin fallar.
 */
export async function guardarEnConfiguracionTienda(
  payload: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const currentPayload: Record<string, any> = { ...payload, updated_at: new Date().toISOString() };

    for (let intento = 0; intento < 10; intento++) {
      const { data: rowCheck } = await supabase
        .from("configuracion_tienda")
        .select("id")
        .eq("id", 1)
        .maybeSingle();

      let dbError = null;
      if (rowCheck) {
        const { error } = await supabase
          .from("configuracion_tienda")
          .update(currentPayload as any)
          .eq("id", 1);
        dbError = error;
      } else {
        const { error } = await supabase
          .from("configuracion_tienda")
          .upsert({
            id: 1,
            tasa_bcv: 52.5,
            ...currentPayload,
          } as any);
        dbError = error;
      }

      if (!dbError) {
        revalidatePath("/admin");
        revalidatePath("/catalogo");
        revalidatePath("/pedido");
        revalidatePath("/");
        return { success: true };
      }

      // Si falla por columna inexistente en BD
      const msg = dbError.message || "";
      const match =
        msg.match(/column\s+["']?([a-zA-Z0-9_]+)["']?.*does not exist/i) ||
        msg.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i);
      const colFaltante = match ? match[1] : null;

      if (colFaltante && colFaltante in currentPayload) {
        console.warn(`Omitiendo columna no creada en BD '${colFaltante}' y reintentando...`);
        delete currentPayload[colFaltante];
        continue;
      }

      return { success: false, error: dbError.message };
    }

    return { success: false, error: "No se pudo actualizar la configuración tras varios intentos." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al guardar configuración";
    return { success: false, error: msg };
  }
}

/**
 * Server Action para guardar Marca de la Tienda (Nombre, Slogan, Teléfono principal).
 */
export async function guardarMarcaTienda(datos: {
  nombre_tienda: string;
  slogan: string;
  telefono_tienda: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      nombre_tienda: datos.nombre_tienda?.trim() ?? "",
      slogan: datos.slogan?.trim() ?? "",
      telefono_tienda: datos.telefono_tienda?.trim() ?? "",
    };

    const res = await guardarEnConfiguracionTienda(payload);
    if (res.success) {
      await registrarAccionAuditoria({
        accion: "marca_tienda_actualizada",
        tabla: "configuracion_tienda",
        registroId: 1,
        detalles: payload,
      });

      revalidatePath("/");
      revalidatePath("/catalogo");
      revalidatePath("/admin");
    }
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al guardar marca de la tienda";
    console.error("Error en guardarMarcaTienda:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Actualiza los enlaces de redes sociales y los contactos de WhatsApp.
 */
export async function actualizarRedesYContactos(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const campos = [
    "instagram_url",
    "tiktok_url",
    "facebook_url",
    "whatsapp_1",
    "whatsapp_1_nombre",
    "whatsapp_2",
    "whatsapp_2_nombre",
    "whatsapp_3",
    "whatsapp_3_nombre",
  ];

  const payload: Record<string, any> = {};
  for (const c of campos) {
    const val = formData.get(c);
    if (val !== null) {
      payload[c] = val.toString().trim() || null;
    }
  }

  const res = await guardarEnConfiguracionTienda(payload);
  if (res.success) {
    await registrarAccionAuditoria({
      accion: "canales_contacto_actualizados",
      tabla: "configuracion_tienda",
      registroId: 1,
      detalles: { campos: Object.keys(payload) },
    });
  }
  return res;
}

/**
 * Server Action para guardar Métodos de Pago, Datos Bancarios y Redes Sociales.
 */
export async function actualizarMetodosPago(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const campos = [
    "pago_movil_banco",
    "pago_movil_telefono",
    "pago_movil_cedula",
    "transferencia_banco",
    "transferencia_cuenta",
    "transferencia_beneficiario",
    "transferencia_rif",
    "binance_pay_email",
    "binance_pay_id",
    "otros_metodos_pago",
    "facebook_url",
    "instagram_url",
    "tiktok_url",
  ];

  const payload: Record<string, any> = {};
  for (const c of campos) {
    const val = formData.get(c);
    if (val !== null) {
      payload[c] = val.toString().trim() || null;
    }
  }

  const res = await guardarEnConfiguracionTienda(payload);
  if (res.success) {
    await registrarAccionAuditoria({
      accion: "metodos_pago_actualizados",
      tabla: "configuracion_tienda",
      registroId: 1,
      detalles: { campos: Object.keys(payload) },
    });
  }
  return res;
}

/**
 * Server Action segura para guardar Ajustes Generales y Comerciales de la Tienda.
 */
export async function actualizarDatosTienda(params: {
  tiendaId?: string;
  nombre: string;
  telefono: string;
  modoOfertas: boolean;
  permiteAbono: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const defaultTiendaId =
      params.tiendaId || process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

    const payload: Record<string, any> = {
      nombre: params.nombre.trim(),
      telefono: params.telefono.trim(),
      modo_ofertas: params.modoOfertas,
      permite_abono: params.permiteAbono,
      updated_at: new Date().toISOString(),
    };

    // Intentar update en tiendas con reintentos
    for (let intento = 0; intento < 5; intento++) {
      const { error } = await supabase
        .from("tiendas")
        .update(payload as any)
        .eq("id", defaultTiendaId);

      if (!error) break;

      const msg = (error.message || "").toLowerCase();
      if (msg.includes("modo_ofertas") && "modo_ofertas" in payload) {
        delete payload.modo_ofertas;
        continue;
      }
      if (msg.includes("permite_abono") && "permite_abono" in payload) {
        delete payload.permite_abono;
        continue;
      }
      console.warn("Aviso al actualizar tiendas:", error.message);
      break;
    }

    await registrarAccionAuditoria({
      accion: "datos_tienda_actualizados",
      tabla: "tiendas",
      registroId: defaultTiendaId,
      detalles: {
        nombre: params.nombre,
        telefono: params.telefono,
        modoOfertas: params.modoOfertas,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error en actualizarDatosTienda:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tasa BCV Oficial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta la tasa oficial BCV actual y la fecha de última actualización desde Supabase.
 */
export async function obtenerTasaBCV(): Promise<{
  tasa_bcv: number;
  updated_at: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("configuracion_tienda")
      .select("id, tasa_bcv, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.warn("Aviso al consultar tasa BCV en Supabase:", error.message);
    }

    if (data && data.tasa_bcv) {
      return {
        tasa_bcv: Number(data.tasa_bcv),
        updated_at: data.updated_at || null,
      };
    }

    // Si no existe fila con id=1, buscar la primera disponible
    const { data: firstRow } = await supabase
      .from("configuracion_tienda")
      .select("id, tasa_bcv, updated_at")
      .limit(1)
      .maybeSingle();

    if (firstRow && firstRow.tasa_bcv) {
      return {
        tasa_bcv: Number(firstRow.tasa_bcv),
        updated_at: firstRow.updated_at || null,
      };
    }

    return { tasa_bcv: 52.5, updated_at: null };
  } catch (err) {
    console.error("Error al obtener tasa BCV:", err);
    return { tasa_bcv: 52.5, updated_at: null };
  }
}

/**
 * Server Action segura para actualizar la tasa oficial BCV diaria en Supabase.
 * Valida la entrada, actualiza `configuracion_tienda` donde id = 1 y revalida las rutas.
 */
export async function actualizarTasaBCV(
  formDataOrValue: FormData | number | string
): Promise<TasaBCVResponse> {
  try {
    let valorStr = "";

    if (formDataOrValue instanceof FormData) {
      const formVal = formDataOrValue.get("tasa_bcv");
      if (typeof formVal === "string") {
        valorStr = formVal.trim();
      }
    } else if (typeof formDataOrValue === "number") {
      valorStr = formDataOrValue.toString();
    } else if (typeof formDataOrValue === "string") {
      valorStr = formDataOrValue.trim();
    }

    // 1. Validaciones de seguridad
    if (!valorStr) {
      return { success: false, error: "El valor de la tasa BCV no puede estar vacío." };
    }

    // Reemplazar coma por punto por si el usuario ingresó formato local (ej. 52,45)
    valorStr = valorStr.replace(",", ".");
    const tasaNumerica = parseFloat(valorStr);

    if (isNaN(tasaNumerica) || !isFinite(tasaNumerica)) {
      return { success: false, error: "La tasa ingresada no es un número válido." };
    }

    if (tasaNumerica <= 0) {
      return { success: false, error: "La tasa BCV debe ser un valor mayor a 0." };
    }

    // Formatear a 4 decimales numéricos
    const tasaFinal = Number(tasaNumerica.toFixed(4));
    const nowIso = new Date().toISOString();

    const supabase = await createClient();

    // 2. Comprobar si existe la fila id=1
    const { data: rowCheck } = await supabase
      .from("configuracion_tienda")
      .select("id")
      .eq("id", 1)
      .maybeSingle();

    let dbError = null;

    if (rowCheck) {
      const { error } = await supabase
        .from("configuracion_tienda")
        .update({
          tasa_bcv: tasaFinal,
          updated_at: nowIso,
        })
        .eq("id", 1);
      dbError = error;
    } else {
      const { error } = await supabase
        .from("configuracion_tienda")
        .upsert({
          id: 1,
          tasa_bcv: tasaFinal,
          updated_at: nowIso,
        });
      dbError = error;
    }

    if (dbError) {
      console.error("Error Supabase al actualizar tasa BCV:", dbError);
      return {
        success: false,
        error: `Error de persistencia en Supabase: ${dbError.message}`,
      };
    }

    // Registrar en auditoría
    await registrarAccionAuditoria({
      accion: "tasa_bcv_actualizada",
      tabla: "configuracion_tienda",
      registroId: 1,
      detalles: { tasa_bcv: tasaFinal },
    });

    // 3. Revalidación de rutas de Next.js App Router
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/catalogo");

    return {
      success: true,
      tasa: tasaFinal,
      updatedAt: nowIso,
    };
  } catch (err: unknown) {
    console.error("Error inesperado en Server Action actualizarTasaBCV:", err);
    const msg = err instanceof Error ? err.message : "Error interno del servidor.";
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cuentas Bancarias y Métodos de Pago Dinámicos (CRUD)
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerCuentasBancarias(): Promise<CuentaBancaria[]> {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const { data, error } = await sb
      .from("cuentas_bancarias")
      .select("*")
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Aviso al obtener cuentas_bancarias:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tienda_id: row.tienda_id,
      tipo: row.tipo,
      nombre: row.nombre,
      datos: typeof row.datos === "object" && row.datos !== null ? row.datos : {},
      activo: Boolean(row.activo),
      orden: Number(row.orden) || 0,
    }));
  } catch (err) {
    console.warn("Excepción al obtener cuentas bancarias:", err);
    return [];
  }
}

export async function guardarCuentaBancaria(
  cuenta: CuentaBancaria
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const defaultTiendaId =
      cuenta.tienda_id || process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

    const payload: Record<string, any> = {
      tipo: cuenta.tipo,
      nombre: cuenta.nombre.trim(),
      datos: cuenta.datos || {},
      activo: cuenta.activo !== undefined ? cuenta.activo : true,
      orden: typeof cuenta.orden === "number" ? cuenta.orden : 0,
      tienda_id: defaultTiendaId,
      updated_at: new Date().toISOString(),
    };

    let savedData: any = null;

    if (cuenta.id) {
      const { data, error } = await sb
        .from("cuentas_bancarias")
        .update(payload)
        .eq("id", cuenta.id)
        .select()
        .single();

      if (error) throw error;
      savedData = data;
    } else {
      const { data, error } = await sb
        .from("cuentas_bancarias")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      savedData = data;
    }

    await registrarAccionAuditoria({
      accion: cuenta.id ? "cuenta_bancaria_actualizada" : "cuenta_bancaria_creada",
      tabla: "cuentas_bancarias",
      registroId: savedData?.id || cuenta.id || 0,
      detalles: { nombre: cuenta.nombre, tipo: cuenta.tipo },
    });

    revalidatePath("/admin");
    revalidatePath("/pedido");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, data: savedData };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al guardar cuenta bancaria";
    console.error("Error en guardarCuentaBancaria:", msg);
    return { success: false, error: msg };
  }
}

export async function eliminarCuentaBancaria(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const { error } = await sb
      .from("cuentas_bancarias")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await registrarAccionAuditoria({
      accion: "cuenta_bancaria_eliminada",
      tabla: "cuentas_bancarias",
      registroId: id,
      detalles: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/pedido");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al eliminar cuenta bancaria";
    console.error("Error en eliminarCuentaBancaria:", msg);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Canales de Contacto y Redes Dinámicas (CRUD)
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerCanalesContacto(): Promise<CanalContacto[]> {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const { data, error } = await sb
      .from("canales_contacto")
      .select("*")
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Aviso al obtener canales_contacto:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tienda_id: row.tienda_id,
      tipo: row.tipo,
      valor: row.valor,
      etiqueta: row.etiqueta || "",
      activo: Boolean(row.activo),
      orden: Number(row.orden) || 0,
    }));
  } catch (err) {
    console.warn("Excepción al obtener canales de contacto:", err);
    return [];
  }
}

export async function guardarCanalContacto(
  canal: CanalContacto
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const defaultTiendaId =
      canal.tienda_id || process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

    const payload: Record<string, any> = {
      tipo: canal.tipo,
      valor: canal.valor.trim(),
      etiqueta: canal.etiqueta ? canal.etiqueta.trim() : null,
      activo: canal.activo !== undefined ? canal.activo : true,
      orden: typeof canal.orden === "number" ? canal.orden : 0,
      tienda_id: defaultTiendaId,
      updated_at: new Date().toISOString(),
    };

    let savedData: any = null;

    if (canal.id) {
      const { data, error } = await sb
        .from("canales_contacto")
        .update(payload)
        .eq("id", canal.id)
        .select()
        .single();

      if (error) throw error;
      savedData = data;
    } else {
      const { data, error } = await sb
        .from("canales_contacto")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      savedData = data;
    }

    await registrarAccionAuditoria({
      accion: canal.id ? "canal_contacto_actualizado" : "canal_contacto_creado",
      tabla: "canales_contacto",
      registroId: savedData?.id || canal.id || 0,
      detalles: { tipo: canal.tipo, valor: canal.valor },
    });

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, data: savedData };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al guardar canal de contacto";
    console.error("Error en guardarCanalContacto:", msg);
    return { success: false, error: msg };
  }
}

export async function eliminarCanalContacto(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const { error } = await sb
      .from("canales_contacto")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await registrarAccionAuditoria({
      accion: "canal_contacto_eliminado",
      tabla: "canales_contacto",
      registroId: id,
      detalles: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al eliminar canal de contacto";
    console.error("Error en eliminarCanalContacto:", msg);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Presencia y Perfiles de Administrador
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Heartbeat de presencia para el panel administrativo.
 * Actualiza perfiles_admin set en_linea=true, ultima_conexion=now() where id=adminId.
 * Si no existe, lo inserta con el alias indicado.
 */
export async function actualizarPresenciaAdmin(
  adminId: string,
  alias: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const nowIso = new Date().toISOString();

    // Intentar actualizar por id
    const { data: updated, error: updateErr } = await sb
      .from("perfiles_admin")
      .update({ en_linea: true, ultima_conexion: nowIso, updated_at: nowIso })
      .eq("id", adminId)
      .select("id");

    if (!updateErr && updated && updated.length > 0) return;

    // Insertar si no existe
    const insertData: Record<string, any> = {
      alias: alias.startsWith("@") ? alias : `@${alias}`,
      en_linea: true,
      ultima_conexion: nowIso,
    };
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId);
    if (isUuid) insertData.id = adminId;
    await sb.from("perfiles_admin").insert(insertData);
  } catch (err) {
    console.warn("Aviso al actualizar presencia de admin:", err);
  }
}

/**
 * Consulta el perfil de un administrador por su identificador único (id o user_id).
 */
export async function obtenerPerfilAdmin(userId: string): Promise<{
  id: string;
  alias: string;
  email: string;
  nombre: string;
  grado: number;
  avatar_url: string | null;
  en_linea: boolean;
  ultima_conexion: string | null;
} | null> {
  try {
    const supabase = await createClient();

    const sb2 = supabase as any;
    let { data, error } = await sb2
      .from("perfiles_admin")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!data) {
      const byUser = await sb2
        .from("perfiles_admin")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (byUser.data) {
        data = byUser.data;
      }
    }

    if (!data) return null;

    return {
      id: data.id || data.user_id || userId,
      alias: data.alias || "@admin",
      email: data.email || "",
      nombre: data.nombre || data.nombre_completo || data.alias || "Administrador",
      grado: typeof data.grado === "number" ? data.grado : 1,
      avatar_url: data.avatar_url || null,
      en_linea: Boolean(data.en_linea),
      ultima_conexion: data.ultima_conexion ? new Date(data.ultima_conexion).toISOString() : null,
    };
  } catch (err) {
    console.warn("Aviso al obtener perfil de admin:", err);
    return null;
  }
}


