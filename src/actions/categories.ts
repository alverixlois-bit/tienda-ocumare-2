"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CategoriaRow, CategoriaUpdate } from "@/types/database.types";

export type CategoriaResponse = {
  success: boolean;
  data?: CategoriaRow[];
  error?: string;
};

export type CategoriaActionResponse = {
  success: boolean;
  categoria?: CategoriaRow;
  error?: string;
};

/**
 * Extrae mensaje de error seguro de Supabase o JavaScript.
 */
function extraerError(err: unknown): string {
  if (!err) return "Error desconocido";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, any>;
    if (obj.message) return String(obj.message);
    if (obj.error_description) return String(obj.error_description);
  }
  return String(err);
}

/**
 * Genera un slug URL limpio y seguro a partir del nombre.
 */
function generarSlug(nombre: string): string {
  return (nombre || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Obtiene todas las categorías activas o totales para el catálogo y panel de control.
 * Siempre retorna un array (vacío si no hay datos o falla la consulta).
 */
export async function obtenerCategorias(soloActivas: boolean = false): Promise<CategoriaRow[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("categorias")
      .select("*")
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    if (soloActivas) {
      query = query.eq("activo", true);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Aviso al consultar categorias de Supabase:", error.message);
      return [];
    }

    return Array.isArray(data) ? (data as CategoriaRow[]) : [];
  } catch (err) {
    console.warn("Excepción al consultar categorias:", err);
    return [];
  }
}

/**
 * Agrega una nueva categoría al sistema y revalida las rutas.
 */
export async function crearCategoria(formData: FormData): Promise<CategoriaActionResponse> {
  try {
    const nombre = formData.get("nombre")?.toString().trim();
    const descripcion = formData.get("descripcion")?.toString().trim() || null;
    const ordenStr = formData.get("orden")?.toString();
    const orden = ordenStr ? parseInt(ordenStr, 10) : 0;

    if (!nombre) {
      return { success: false, error: "El nombre de la categoría es obligatorio." };
    }

    const slug = generarSlug(nombre);

    const supabase = await createClient();
    const tiendaId =
      process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

    const payload: Record<string, any> = {
      tienda_id: tiendaId,
      nombre,
      slug,
      descripcion,
      activo: true,
      orden: isNaN(orden) ? 0 : orden,
    };

    let { data, error } = await supabase
      .from("categorias")
      .insert(payload as any)
      .select()
      .maybeSingle();

    // Reintentar sin tienda_id si la columna no existe o falla la restricción
    if (error && ((error.message || "").toLowerCase().includes("tienda_id") || error.code === "42703")) {
      delete payload.tienda_id;
      const retry = await supabase
        .from("categorias")
        .insert(payload as any)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, categoria: data as CategoriaRow };
  } catch (err: unknown) {
    return { success: false, error: extraerError(err) };
  }
}

/**
 * Actualiza los datos de una categoría existente.
 */
export async function actualizarCategoria(
  id: string,
  formData: FormData
): Promise<CategoriaActionResponse> {
  try {
    const nombre = formData.get("nombre")?.toString().trim();
    const descripcion = formData.get("descripcion")?.toString().trim() || null;
    const ordenStr = formData.get("orden")?.toString();
    const orden = ordenStr ? parseInt(ordenStr, 10) : undefined;
    const activoVal = formData.get("activo");
    const activo = activoVal !== null ? activoVal === "true" || activoVal === "on" : undefined;

    if (!nombre) {
      return { success: false, error: "El nombre de la categoría es obligatorio." };
    }

    const slug = generarSlug(nombre);

    const supabase = await createClient();

    const updates: CategoriaUpdate = {
      nombre,
      slug,
      descripcion,
      updated_at: new Date().toISOString(),
    };

    if (orden !== undefined && !isNaN(orden)) {
      updates.orden = orden;
    }

    if (activo !== undefined) {
      updates.activo = activo;
    }

    const { data, error } = await supabase
      .from("categorias")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, categoria: data as CategoriaRow };
  } catch (err: unknown) {
    return { success: false, error: extraerError(err) };
  }
}

/**
 * Cambia el estado activo/inactivo de una categoría.
 */
export async function toggleEstadoCategoria(
  id: string,
  activo: boolean
): Promise<CategoriaActionResponse> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categorias")
      .update({
        activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, categoria: data as CategoriaRow };
  } catch (err: unknown) {
    return { success: false, error: extraerError(err) };
  }
}

/**
 * Elimina una categoría por su ID.
 */
export async function eliminarCategoria(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("categorias").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: extraerError(err) };
  }
}
