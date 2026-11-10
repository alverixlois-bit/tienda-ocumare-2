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
  imagen?: string | null;
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
 * Detecta si el mensaje de error de PostgreSQL / Supabase hace referencia
 * a una columna que no existe en la tabla.
 */
function detectarColumnaInexistente(mensajeError: string): string | null {
  if (!mensajeError) return null;

  // 1. PostgreSQL: column "xyz" of relation "productos" does not exist
  const match1 = mensajeError.match(
    /column\s+["']?([a-zA-Z0-9_]+)["']?\s+(?:of relation\s+["']?[a-zA-Z0-9_]+["']?\s*)?does not exist/i
  );
  if (match1 && match1[1]) return match1[1].toLowerCase();

  // 2. PostgREST schema cache: Could not find the 'xyz' column of 'productos' in the schema cache
  const match2 = mensajeError.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i);
  if (match2 && match2[1]) return match2[1].toLowerCase();

  // 3. PostgREST: column "xyz" does not exist
  const match3 = mensajeError.match(/column\s+["']([a-zA-Z0-9_]+)["']\s+does not exist/i);
  if (match3 && match3[1]) return match3[1].toLowerCase();

  // 4. Búsqueda de columnas comunes cuando se menciona error de columna
  const camposConocidos = [
    "imagen_url",
    "imagenes",
    "imagen",
    "categoria_id",
    "video_url",
    "en_oferta",
    "precio_oferta",
    "moneda_base",
    "precio_base",
    "precio_usd",
    "unidad_medida",
    "permite_decimales",
    "tienda_id",
    "updated_at",
  ];

  for (const campo of camposConocidos) {
    if (
      mensajeError.toLowerCase().includes(campo) &&
      (mensajeError.toLowerCase().includes("does not exist") ||
        mensajeError.toLowerCase().includes("schema cache") ||
        mensajeError.toLowerCase().includes("not find"))
    ) {
      return campo;
    }
  }

  return null;
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
 * Server Action ultra-resiliente para crear o editar productos en Supabase.
 * - Soporta variantes de columnas para imagen: imagen_url, imagenes y imagen.
 * - Detecta columnas faltantes y las omite dinámicamente antes de reintentar.
 */
export async function guardarProducto(payload: GuardarProductoPayload): Promise<ProductoActionResult> {
  try {
    const supabase = await createClient();

    // 1. Sanitizar Nombre / Título
    const nombreFinal = (payload.nombre || payload.titulo || "").trim();
    if (!nombreFinal) {
      return { success: false, error: "El nombre o título del producto es obligatorio." };
    }

    // 2. Sanitizar Precios
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

    // 4. Sanitizar Imágenes: variantes imagen_url, imagenes (array) e imagen
    const imagenUrl = payload.imagen_url?.trim() || payload.imagen?.trim() || "";
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

    // 5. Sanitizar categoria_id (si no es UUID válido o está vacío, enviar null)
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

    // Construcción del payload inicial con todas las variantes conocidas
    const currentPayload: Record<string, any> = {
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
      // 1. Variantes de imagen requeridas
      imagen_url: imagenUrl || null,
      imagenes: imagenesArray,
      imagen: imagenUrl || null,
      // Multimedia y opciones
      video_url: videoUrl,
      en_oferta: enOferta,
      precio_oferta: precioOfertaNum !== null ? precioOfertaNum.toFixed(2) : null,
      unidad_medida: "unidad",
      permite_decimales: false,
      updated_at: new Date().toISOString(),
    };

    if (categoriaId !== null) {
      currentPayload.categoria_id = categoriaId;
    } else {
      currentPayload.categoria_id = null;
    }

    const maxRetries = 10;
    let ultimoError: any = null;
    let resultadoData: any = null;

    // -------------------------------------------------------------------------
    // MODO UPDATE
    // -------------------------------------------------------------------------
    if (payload.id) {
      for (let intento = 0; intento < maxRetries; intento++) {
        const { data, error } = await supabase
          .from("productos")
          .update(currentPayload as any)
          .eq("id", payload.id)
          .select()
          .maybeSingle();

        if (!error) {
          resultadoData = data;
          ultimoError = null;
          break;
        }

        ultimoError = error;
        console.warn(`Intento ${intento + 1} de UPDATE falló:`, error.message);

        // 2. Comprobar si falta alguna columna
        const colFaltante = detectarColumnaInexistente(error.message);
        if (colFaltante && colFaltante in currentPayload) {
          console.warn(`Omitiendo columna inexistente '${colFaltante}' y reintentando...`);
          delete currentPayload[colFaltante];
          continue;
        }

        // Comprobar error específico de categoria_id (UUID syntax o constraint)
        if (
          (error.message || "").toLowerCase().includes("categoria_id") &&
          "categoria_id" in currentPayload
        ) {
          console.warn("Omitiendo categoria_id del payload y reintentando...");
          delete currentPayload.categoria_id;
          continue;
        }

        // Si el error no es de columna faltante ni de categoria_id, detener bucle
        break;
      }

      if (ultimoError) {
        return {
          success: false,
          error: `Error de Supabase: ${extraerMensajeError(ultimoError)}`,
        };
      }

      revalidarRutas();
      return { success: true, data: resultadoData };
    }

    // -------------------------------------------------------------------------
    // MODO INSERT
    // -------------------------------------------------------------------------
    for (let intento = 0; intento < maxRetries; intento++) {
      const { data, error } = await supabase
        .from("productos")
        .insert([currentPayload as any])
        .select()
        .maybeSingle();

      if (!error) {
        resultadoData = data;
        ultimoError = null;
        break;
      }

      ultimoError = error;
      console.warn(`Intento ${intento + 1} de INSERT falló:`, error.message);

      // 2. Comprobar si falta alguna columna
      const colFaltante = detectarColumnaInexistente(error.message);
      if (colFaltante && colFaltante in currentPayload) {
        console.warn(`Omitiendo columna inexistente '${colFaltante}' y reintentando...`);
        delete currentPayload[colFaltante];
        continue;
      }

      // Comprobar error específico de categoria_id
      if (
        (error.message || "").toLowerCase().includes("categoria_id") &&
        "categoria_id" in currentPayload
      ) {
        console.warn("Omitiendo categoria_id del payload y reintentando...");
        delete currentPayload.categoria_id;
        continue;
      }

      // Si el error no es de columna faltante, detener bucle
      break;
    }

    if (ultimoError) {
      return {
        success: false,
        error: `Error de Supabase: ${extraerMensajeError(ultimoError)}`,
      };
    }

    revalidarRutas();
    return { success: true, data: resultadoData };
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
