"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizarNumero } from "@/utils/currency";

export interface GuardarProductoPayload {
  id?: string;
  nombre?: string;
  titulo?: string;
  descripcion?: string | null;
  precio_usd?: string | number;
  precio_base?: string | number;
  stock?: string | number;
  categoria_id?: string | null;
  imagen_url?: string | null;
  imagenes?: string[];
  video_url?: string | null;
  en_oferta?: boolean;
  precio_oferta?: string | number | null;
  activo?: boolean;
  tienda_id?: string;
}

export interface ProductoActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Extrae el mensaje de error exacto de Supabase o JavaScript.
 */
function extraerMensajeError(err: unknown): string {
  if (!err) return "Error desconocido";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const obj = err as Record<string, any>;
    const mensaje = obj.message || obj.error_description || obj.error;
    const detalles = obj.details ? ` (${obj.details})` : "";
    const hint = obj.hint ? ` - Sugerencia: ${obj.hint}` : "";
    if (mensaje) {
      return `${mensaje}${detalles}${hint}`;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return "Error devuelto por la base de datos Supabase";
    }
  }
  return String(err);
}

/**
 * Server Action segura para crear o editar un producto en Supabase.
 */
export async function guardarProducto(payload: GuardarProductoPayload): Promise<ProductoActionResult> {
  try {
    const supabase = await createClient();

    // 1. Sanitizar Nombre / Título
    const nombreFinal = (payload.nombre || payload.titulo || "").trim();
    if (!nombreFinal) {
      return { success: false, error: "El nombre o título del producto es obligatorio." };
    }

    // 2. Sanitizar Precios con reemplazo de coma a punto y parseFloat
    const precioNumerico = sanitizarNumero(payload.precio_usd ?? payload.precio_base, -1);
    if (precioNumerico < 0) {
      return { success: false, error: "El precio en USD debe ser un número válido mayor o igual a 0." };
    }

    const enOferta = Boolean(payload.en_oferta);
    const precioOfertaNum = enOferta
      ? sanitizarNumero(payload.precio_oferta, 0)
      : null;

    // 3. Sanitizar Stock
    const stockNumerico = Math.max(0, Math.floor(sanitizarNumero(payload.stock, 0)));

    // 4. Sanitizar Imágenes (array vacío [] por defecto si está vacío o no se ingresó)
    const imagenUrl = payload.imagen_url?.trim() || "";
    let imagenesArray: string[] = [];
    if (Array.isArray(payload.imagenes) && payload.imagenes.length > 0) {
      imagenesArray = payload.imagenes.filter((url) => typeof url === "string" && url.trim().length > 0);
    } else if (imagenUrl) {
      imagenesArray = [imagenUrl];
    } else {
      imagenesArray = [];
    }

    const tiendaId =
      payload.tienda_id ||
      process.env.NEXT_PUBLIC_TIENDA_ID ||
      "00000000-0000-0000-0000-000000000001";

    // 5. Sanitización estricta de categoria_id (evitar cadenas vacías, convertirlas a null)
    let categoriaId: string | null = null;
    if (payload.categoria_id && typeof payload.categoria_id === "string") {
      const cleanCat = payload.categoria_id.trim();
      if (
        cleanCat !== "" &&
        cleanCat !== "all" &&
        cleanCat !== "null" &&
        cleanCat !== "undefined"
      ) {
        categoriaId = cleanCat;
      }
    }

    const activo = payload.activo ?? true;
    const videoUrl = payload.video_url?.trim() || null;
    const descripcion = payload.descripcion?.trim() || null;

    // Payload de compatibilidad dual
    const dbPayload: Record<string, any> = {
      tienda_id: tiendaId,
      // Nombres
      nombre: nombreFinal,
      titulo: nombreFinal,
      descripcion,
      // Precios
      precio_usd: precioNumerico,
      precio_base: precioNumerico.toFixed(2),
      moneda_base: "USD",
      stock: stockNumerico,
      activo,
      // Imágenes
      imagen_url: imagenUrl || null,
      imagenes: imagenesArray,
      video_url: videoUrl,
      en_oferta: enOferta,
      precio_oferta: precioOfertaNum !== null ? precioOfertaNum.toFixed(2) : null,
      unidad_medida: "unidad",
      permite_decimales: false,
      updated_at: new Date().toISOString(),
    };

    // Solo incluir categoria_id si tiene un valor no nulo
    if (categoriaId !== null) {
      dbPayload.categoria_id = categoriaId;
    } else {
      dbPayload.categoria_id = null;
    }

    if (payload.id) {
      // Intentar UPDATE con todas las columnas
      let { data, error } = await supabase
        .from("productos")
        .update(dbPayload as any)
        .eq("id", payload.id)
        .select()
        .maybeSingle();

      // Si falla por columna categoria_id inexistente o error de tipo UUID
      if (error && error.message.toLowerCase().includes("categoria_id")) {
        console.warn("Aviso: reintentando update sin columna categoria_id...");
        delete dbPayload.categoria_id;
        const retryCat = await supabase
          .from("productos")
          .update(dbPayload as any)
          .eq("id", payload.id)
          .select()
          .maybeSingle();
        data = retryCat.data;
        error = retryCat.error;
      }

      if (error) {
        console.warn("Aviso al actualizar con esquema completo, reintentando...", error.message);

        // Fallback 1: Esquema simplificado
        const fallback1: Record<string, any> = {
          nombre: nombreFinal,
          descripcion,
          precio_usd: precioNumerico,
          stock: stockNumerico,
          activo,
          imagenes: imagenesArray,
          imagen_url: imagenUrl || null,
          video_url: videoUrl,
          updated_at: new Date().toISOString(),
        };
        if (categoriaId !== null) fallback1.categoria_id = categoriaId;

        let { data: dataRetry1, error: errRetry1 } = await supabase
          .from("productos")
          .update(fallback1 as any)
          .eq("id", payload.id)
          .select()
          .maybeSingle();

        if (errRetry1 && errRetry1.message.toLowerCase().includes("categoria_id")) {
          delete fallback1.categoria_id;
          const retry = await supabase
            .from("productos")
            .update(fallback1 as any)
            .eq("id", payload.id)
            .select()
            .maybeSingle();
          dataRetry1 = retry.data;
          errRetry1 = retry.error;
        }

        if (errRetry1) {
          // Fallback 2: Esquema con titulo/precio_base
          const fallback2: Record<string, any> = {
            titulo: nombreFinal,
            descripcion,
            precio_base: precioNumerico.toFixed(2),
            stock: stockNumerico.toString(),
            activo,
            imagen_url: imagenUrl || null,
            video_url: videoUrl,
            updated_at: new Date().toISOString(),
          };

          const { data: dataRetry2, error: errRetry2 } = await supabase
            .from("productos")
            .update(fallback2 as any)
            .eq("id", payload.id)
            .select()
            .maybeSingle();

          if (errRetry2) {
            return {
              success: false,
              error: `Error de Supabase: ${extraerMensajeError(errRetry2)}`,
            };
          }
          revalidarRutas();
          return { success: true, data: dataRetry2 };
        }

        revalidarRutas();
        return { success: true, data: dataRetry1 };
      }

      revalidarRutas();
      return { success: true, data };
    } else {
      // Intentar INSERT con esquema completo
      let { data, error } = await supabase
        .from("productos")
        .insert([dbPayload as any])
        .select()
        .maybeSingle();

      // Si falla por columna categoria_id inexistente o error de tipo UUID
      if (error && error.message.toLowerCase().includes("categoria_id")) {
        console.warn("Aviso: reintentando insert sin columna categoria_id...");
        delete dbPayload.categoria_id;
        const retryCat = await supabase
          .from("productos")
          .insert([dbPayload as any])
          .select()
          .maybeSingle();
        data = retryCat.data;
        error = retryCat.error;
      }

      if (error) {
        console.warn("Aviso al insertar con esquema completo, reintentando...", error.message);

        // Fallback 1: Esquema simplificado
        const fallbackInsert1: Record<string, any> = {
          nombre: nombreFinal,
          descripcion,
          precio_usd: precioNumerico,
          stock: stockNumerico,
          activo,
          imagenes: imagenesArray,
          imagen_url: imagenUrl || null,
          video_url: videoUrl,
        };
        if (categoriaId !== null) fallbackInsert1.categoria_id = categoriaId;

        let { data: dataRetry1, error: errRetry1 } = await supabase
          .from("productos")
          .insert([fallbackInsert1 as any])
          .select()
          .maybeSingle();

        if (errRetry1 && errRetry1.message.toLowerCase().includes("categoria_id")) {
          delete fallbackInsert1.categoria_id;
          const retry = await supabase
            .from("productos")
            .insert([fallbackInsert1 as any])
            .select()
            .maybeSingle();
          dataRetry1 = retry.data;
          errRetry1 = retry.error;
        }

        if (errRetry1) {
          // Fallback 2: Esquema con titulo / precio_base
          const fallbackInsert2: Record<string, any> = {
            tienda_id: tiendaId,
            titulo: nombreFinal,
            descripcion,
            precio_base: precioNumerico.toFixed(2),
            moneda_base: "USD",
            stock: stockNumerico.toString(),
            activo,
            imagen_url: imagenUrl || null,
            video_url: videoUrl,
            unidad_medida: "unidad",
            permite_decimales: false,
          };

          const { data: dataRetry2, error: errRetry2 } = await supabase
            .from("productos")
            .insert([fallbackInsert2 as any])
            .select()
            .maybeSingle();

          if (errRetry2) {
            return {
              success: false,
              error: `Error de Supabase: ${extraerMensajeError(errRetry2)}`,
            };
          }
          revalidarRutas();
          return { success: true, data: dataRetry2 };
        }

        revalidarRutas();
        return { success: true, data: dataRetry1 };
      }

      revalidarRutas();
      return { success: true, data };
    }
  } catch (err: unknown) {
    const errorMsg = extraerMensajeError(err);
    console.error("Excepción en guardarProducto:", err);
    return { success: false, error: errorMsg };
  }
}

function revalidarRutas() {
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  revalidatePath("/");
}
