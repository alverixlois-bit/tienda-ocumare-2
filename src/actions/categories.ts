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
 * Obtiene todas las categorías activas o totales para el catálogo y panel de control.
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

    return (data as CategoriaRow[]) || [];
  } catch (err) {
    console.warn("Excepción al consultar categorias:", err);
    return [];
  }
}

/**
 * Agrega una nueva categoría al sistema.
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

    const slug = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        tienda_id: "00000000-0000-0000-0000-000000000001",
        nombre,
        slug,
        descripcion,
        activo: true,
        orden: isNaN(orden) ? 0 : orden,
      } as any)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, categoria: data as CategoriaRow };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido al crear categoría";
    return { success: false, error: msg };
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

    const slug = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

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
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, categoria: data as CategoriaRow };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido al actualizar categoría";
    return { success: false, error: msg };
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
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, categoria: data as CategoriaRow };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al alternar estado de categoría";
    return { success: false, error: msg };
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
    const msg = err instanceof Error ? err.message : "Error al eliminar categoría";
    return { success: false, error: msg };
  }
}
