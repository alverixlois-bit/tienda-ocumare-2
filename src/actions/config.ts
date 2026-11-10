"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAccionAuditoria } from "@/lib/audit";

export interface TasaBCVResponse {
  success: boolean;
  tasa?: number;
  updatedAt?: string;
  error?: string;
}

export interface ConfiguracionTiendaData {
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

/**
 * Consulta la configuración completa de la tienda (tasa, redes, WhatsApp y métodos de pago).
 */
export async function obtenerConfiguracionTienda(): Promise<ConfiguracionTiendaData> {
  const fallback: ConfiguracionTiendaData = {
    tasa_bcv: 52.5,
    updated_at: null,
    instagram_url: "",
    tiktok_url: "",
    facebook_url: "",
    whatsapp_1: "+584120000001",
    whatsapp_1_nombre: "Ventas Principal",
    whatsapp_2: "+584140000002",
    whatsapp_2_nombre: "Atención al Cliente",
    whatsapp_3: "+584160000003",
    whatsapp_3_nombre: "Despachos y Pagos",
    // Valores por defecto de métodos de pago
    pago_movil_banco: "0102 - Banco de Venezuela",
    pago_movil_telefono: "04121234567",
    pago_movil_cedula: "V-12345678",
    transferencia_banco: "Banesco Banco Universal",
    transferencia_cuenta: "0134-0000-00-0000000000",
    transferencia_beneficiario: "OcumareHub C.A.",
    transferencia_rif: "J-12345678-0",
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
      return {
        tasa_bcv: Number(data.tasa_bcv) || 52.5,
        updated_at: data.updated_at || null,
        instagram_url: data.instagram_url || "",
        tiktok_url: data.tiktok_url || "",
        facebook_url: data.facebook_url || "",
        whatsapp_1: data.whatsapp_1 || fallback.whatsapp_1,
        whatsapp_1_nombre: data.whatsapp_1_nombre || fallback.whatsapp_1_nombre,
        whatsapp_2: data.whatsapp_2 || fallback.whatsapp_2,
        whatsapp_2_nombre: data.whatsapp_2_nombre || fallback.whatsapp_2_nombre,
        whatsapp_3: data.whatsapp_3 || fallback.whatsapp_3,
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
async function guardarEnConfiguracionTienda(
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
 * Actualiza los enlaces de redes sociales y los 3 contactos de WhatsApp de los vendedores.
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

    return { tasa_bcv: 52.50, updated_at: null };
  } catch (err) {
    console.error("Error al obtener tasa BCV:", err);
    return { tasa_bcv: 52.50, updated_at: null };
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
      // UPDATE directo id = 1
      const { error } = await supabase
        .from("configuracion_tienda")
        .update({
          tasa_bcv: tasaFinal,
          updated_at: nowIso,
        })
        .eq("id", 1);
      dbError = error;
    } else {
      // UPSERT / INSERT id = 1
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

    // 3. Revalidación instantánea de rutas de Next.js App Router
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
