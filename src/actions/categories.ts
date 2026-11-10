"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CategoriaRow, CategoriaUpdate } from "@/types/database.types";
import { registrarAccionAuditoria } from "@/lib/audit";

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
 * Soporta de forma flexible 'orden' o 'posicion' sin fallar por diferencias de esquema.
 */
export async function obtenerCategorias(soloActivas: boolean = false): Promise<CategoriaRow[]> {
  try {
    const supabase = await createClient();

    let query = supabase.from("categorias").select("*");
    if (soloActivas) {
      query = query.eq("activo", true);
    }

    // 1. Probar ordenando por 'orden'
    let { data, error } = await query
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    // 2. Si falla por la columna 'orden', probar con 'posicion'
    if (error && ((error.message || "").toLowerCase().includes("orden") || error.code === "42703")) {
      const retryPos = await query
        .order("posicion", { ascending: true })
        .order("nombre", { ascending: true });
      if (!retryPos.error) {
        data = retryPos.data;
        error = null;
      }
    }

    // 3. Si aún persiste error, consultar sin order() y ordenar en memoria
    if (error) {
      const retrySimple = await query;
      data = retrySimple.data;
    }

    if (!Array.isArray(data)) return [];

    // Normalizar 'orden' y 'posicion' para los componentes
    const normalizadas = data.map((c: any) => {
      const posVal =
        c.orden !== undefined && c.orden !== null
          ? c.orden
          : c.posicion !== undefined && c.posicion !== null
          ? c.posicion
          : 0;

      return {
        ...c,
        orden: Number(posVal) || 0,
        posicion: Number(posVal) || 0,
      };
    });

    normalizadas.sort(
      (a, b) => a.orden - b.orden || (a.nombre || "").localeCompare(b.nombre || "")
    );

    return normalizadas as CategoriaRow[];
  } catch (err) {
    console.warn("Excepción al consultar categorias:", err);
    return [];
  }
}

/**
 * Agrega una nueva categoría al sistema de forma resiliente a 'orden' / 'posicion' y revalida las rutas.
 */
export async function crearCategoria(formData: FormData): Promise<CategoriaActionResponse> {
  try {
    const nombre = formData.get("nombre")?.toString().trim();
    const descripcion = formData.get("descripcion")?.toString().trim() || null;
    const ordenStr = formData.get("orden")?.toString();
    const ordenNum = ordenStr ? parseInt(ordenStr, 10) : 0;
    const finalOrden = isNaN(ordenNum) ? 0 : ordenNum;

    if (!nombre) {
      return { success: false, error: "El nombre de la categoría es obligatorio." };
    }

    const slug = generarSlug(nombre);
    const supabase = await createClient();
    const tiendaId =
      process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

    const currentPayload: Record<string, any> = {
      tienda_id: tiendaId,
      nombre,
      slug,
      descripcion,
      activo: true,
      orden: finalOrden,
      posicion: finalOrden,
    };

    let data = null;
    let error = null;

    // Bucle resiliente que omite columnas faltantes ('tienda_id', 'posicion', 'orden')
    for (let intento = 0; intento < 5; intento++) {
      const res = await supabase
        .from("categorias")
        .insert(currentPayload as any)
        .select()
        .maybeSingle();

      if (!res.error) {
        data = res.data;
        error = null;
        break;
      }

      error = res.error;
      const msg = (error.message || "").toLowerCase();

      if (msg.includes("tienda_id") && "tienda_id" in currentPayload) {
        delete currentPayload.tienda_id;
        continue;
      }
      if (msg.includes("posicion") && "posicion" in currentPayload) {
        delete currentPayload.posicion;
        continue;
      }
      if (msg.includes("orden") && "orden" in currentPayload) {
        delete currentPayload.orden;
        continue;
      }
      break;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    // Registrar en auditoría
    await registrarAccionAuditoria({
      accion: "categoria_creada",
      tabla: "categorias",
      registroId: (data as any)?.id,
      detalles: { nombre, slug, orden: finalOrden, descripcion },
    });

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, categoria: data as CategoriaRow };
  } catch (err: unknown) {
    return { success: false, error: extraerError(err) };
  }
}

/**
 * Actualiza los datos de una categoría existente con soporte para 'orden' / 'posicion'.
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

    const updates: Record<string, any> = {
      nombre,
      slug,
      descripcion,
      updated_at: new Date().toISOString(),
    };

    if (orden !== undefined && !isNaN(orden)) {
      updates.orden = orden;
      updates.posicion = orden;
    }

    if (activo !== undefined) {
      updates.activo = activo;
    }

    let data = null;
    let error = null;

    for (let intento = 0; intento < 5; intento++) {
      const res = await supabase
        .from("categorias")
        .update(updates as any)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (!res.error) {
        data = res.data;
        error = null;
        break;
      }

      error = res.error;
      const msg = (error.message || "").toLowerCase();

      if (msg.includes("posicion") && "posicion" in updates) {
        delete updates.posicion;
        continue;
      }
      if (msg.includes("orden") && "orden" in updates) {
        delete updates.orden;
        continue;
      }
      break;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    // Registrar en auditoría
    await registrarAccionAuditoria({
      accion: "categoria_actualizada",
      tabla: "categorias",
      registroId: id,
      detalles: { nombre, slug, orden, descripcion, activo },
    });

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

    // Registrar en auditoría
    await registrarAccionAuditoria({
      accion: activo ? "categoria_activada" : "categoria_desactivada",
      tabla: "categorias",
      registroId: id,
      detalles: { activo },
    });

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

    // Registrar en auditoría
    await registrarAccionAuditoria({
      accion: "categoria_eliminada",
      tabla: "categorias",
      registroId: id,
      detalles: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: extraerError(err) };
  }
}
