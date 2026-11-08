"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TasaBCVResponse {
  success: boolean;
  tasa?: number;
  updatedAt?: string;
  error?: string;
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
