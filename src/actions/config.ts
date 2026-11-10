"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
}

/**
 * Consulta la configuración completa de la tienda (tasa, redes y contactos WhatsApp).
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
      };
    }

    return fallback;
  } catch (err) {
    console.warn("Excepción al consultar configuracion_tienda:", err);
    return fallback;
  }
}

/**
 * Actualiza los enlaces de redes sociales y los 3 contactos de WhatsApp de los vendedores.
 */
export async function actualizarRedesYContactos(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const instagram_url = formData.get("instagram_url")?.toString().trim() || null;
    const tiktok_url = formData.get("tiktok_url")?.toString().trim() || null;
    const facebook_url = formData.get("facebook_url")?.toString().trim() || null;

    const whatsapp_1 = formData.get("whatsapp_1")?.toString().trim() || null;
    const whatsapp_1_nombre = formData.get("whatsapp_1_nombre")?.toString().trim() || null;

    const whatsapp_2 = formData.get("whatsapp_2")?.toString().trim() || null;
    const whatsapp_2_nombre = formData.get("whatsapp_2_nombre")?.toString().trim() || null;

    const whatsapp_3 = formData.get("whatsapp_3")?.toString().trim() || null;
    const whatsapp_3_nombre = formData.get("whatsapp_3_nombre")?.toString().trim() || null;

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const payload = {
      instagram_url,
      tiktok_url,
      facebook_url,
      whatsapp_1,
      whatsapp_1_nombre,
      whatsapp_2,
      whatsapp_2_nombre,
      whatsapp_3,
      whatsapp_3_nombre,
      updated_at: nowIso,
    };

    const { data: rowCheck } = await supabase
      .from("configuracion_tienda")
      .select("id")
      .eq("id", 1)
      .maybeSingle();

    let dbError = null;
    if (rowCheck) {
      const { error } = await supabase
        .from("configuracion_tienda")
        .update(payload)
        .eq("id", 1);
      dbError = error;
    } else {
      const { error } = await supabase
        .from("configuracion_tienda")
        .upsert({
          id: 1,
          tasa_bcv: 52.5,
          ...payload,
        });
      dbError = error;
    }

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/pedido");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al guardar redes y contactos";
    return { success: false, error: msg };
  }
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
