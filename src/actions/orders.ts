"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OrdenInsert, OrdenItemInsert } from "@/types/database.types";
import { registrarAccionAuditoria } from "@/lib/audit";
import { formatoUSD, formatoVES } from "@/utils/currency";

export interface ItemPedidoInput {
  productoId: string;
  titulo: string;
  unidadMedida?: string;
  precioUsd: string | number;
  cantidad: number;
}

export interface CrearPedidoParams {
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  metodoEntrega: "zoom" | "mrw" | "tealca" | "personal";
  referenciaPago?: string | null;
  comprobanteUrl?: string | null;
  notas?: string | null;
  subtotalUSD: number;
  subtotalVES: number;
  abonoUSD: number;
  abonoVES: number;
  saldoPendienteUSD: number;
  saldoPendienteVES: number;
  tasaBcv: number;
  items: ItemPedidoInput[];
}

export interface CrearPedidoResponse {
  success: boolean;
  pedidoId?: string;
  numeroOrden?: string;
  error?: string;
}

/**
 * Server Action segura para registrar un nuevo pedido por encargo.
 * Persiste de forma coordinada en las tablas 'ordenes' y 'pedidos',
 * asegurando la trazabilidad por UUID y por 'numero_orden' legible (PED-XXXXXXXX).
 */
export async function crearPedidoAction(
  params: CrearPedidoParams
): Promise<CrearPedidoResponse> {
  try {
    const supabase = await createClient();
    const tiendaId =
      process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    const numeroOrden = `PED-${randomDigits}`;
    const nowIso = new Date().toISOString();

    const estadoFinal =
      params.comprobanteUrl || (params.referenciaPago && params.referenciaPago.trim())
        ? "abono_verificado"
        : "pendiente";

    // 1. Inserción en tabla 'ordenes'
    const ordenPayload: Record<string, any> = {
      tienda_id: tiendaId,
      numero: numeroOrden,
      cliente_nombre: params.nombre.trim(),
      cliente_telefono: params.telefono.trim(),
      cliente_email: null,
      cliente_id: null,
      direccion_entrega: params.direccion.trim(),
      metodo_entrega: params.metodoEntrega,
      modalidad_pago: "abono",
      estado: estadoFinal,
      moneda_base: "USD",
      tasa_cambio_bcv: params.tasaBcv.toFixed(4),
      subtotal_usd: params.subtotalUSD.toFixed(4),
      total_usd: params.subtotalUSD.toFixed(4),
      total_ves_exacto: params.subtotalVES.toFixed(2),
      total_ves: params.subtotalVES.toFixed(2),
      monto_inicial_usd: params.abonoUSD.toFixed(4),
      monto_inicial_ves: params.abonoVES.toFixed(2),
      saldo_pendiente_usd: params.saldoPendienteUSD.toFixed(4),
      saldo_pendiente_ves: params.saldoPendienteVES.toFixed(2),
      redondeo_ves_entero: false,
      comprobante_url: params.comprobanteUrl || null,
      referencia_pago: params.referenciaPago?.trim() || null,
      notas: `C.I/RIF: ${params.cedula.trim()} | Ref: ${
        params.referenciaPago?.trim() || "S/R"
      } | Notas: ${params.notas?.trim() || "Ninguna"}`,
      created_at: nowIso,
      updated_at: nowIso,
    };

    let ordenCreadaId = "";

    // Intentar inserción en 'ordenes'
    const { data: ordenData, error: ordenError } = await supabase
      .from("ordenes")
      .insert([ordenPayload as any])
      .select()
      .maybeSingle();

    if (ordenData) {
      ordenCreadaId = ordenData.id;

      // Insertar ítems en orden_items si se proporcionaron
      if (Array.isArray(params.items) && params.items.length > 0) {
        const itemsPayload: OrdenItemInsert[] = params.items.map((item) => {
          const precioNum = parseFloat(String(item.precioUsd)) || 0;
          const subtotalItemUsd = (precioNum * item.cantidad).toFixed(4);
          const subtotalItemVes = (precioNum * item.cantidad * params.tasaBcv).toFixed(2);
          const precioUnitarioVes = (precioNum * params.tasaBcv).toFixed(2);

          return {
            orden_id: ordenData.id,
            producto_id: item.productoId,
            producto_titulo: item.titulo,
            unidad_medida: item.unidadMedida || "unidad",
            moneda_base: "USD",
            precio_base: String(precioNum),
            precio_unitario_usd: precioNum.toFixed(4),
            precio_unitario_ves: precioUnitarioVes,
            variantes_seleccionadas: null,
            cantidad: String(item.cantidad),
            subtotal_usd: subtotalItemUsd,
            subtotal_ves_exacto: subtotalItemVes,
            subtotal_ves: subtotalItemVes,
            created_at: nowIso,
          };
        });

        await supabase.from("orden_items").insert(itemsPayload as any);
      }
    } else {
      console.warn("Aviso insertando en ordenes (usando tabla pedidos):", ordenError?.message);
    }

    // 2. Inserción sincronizada en tabla 'pedidos' para doble garantía
    const pedidoPayload: Record<string, any> = {
      cliente_nombre: params.nombre.trim(),
      cliente_cedula: params.cedula.trim(),
      cliente_telefono: params.telefono.trim(),
      agencia_envio: `${params.metodoEntrega.toUpperCase()} - ${params.direccion.trim()}`,
      estado_pago: estadoFinal === "abono_verificado" ? "abono_verificado" : "pendiente_abono",
      referencia_pago: params.referenciaPago?.trim() || null,
      comprobante_url: params.comprobanteUrl || null,
      numero_orden: numeroOrden,
    };

    let pedidoCreadoId = "";
    const { data: pedidoData, error: pedidoError } = await supabase
      .from("pedidos")
      .insert([pedidoPayload as any])
      .select()
      .maybeSingle();

    if (pedidoData) {
      pedidoCreadoId = String(pedidoData.id);
    } else if (pedidoError) {
      // Reintentar sin 'numero_orden' si la columna aún no existe
      delete pedidoPayload.numero_orden;
      const retryPed = await supabase
        .from("pedidos")
        .insert([pedidoPayload as any])
        .select()
        .maybeSingle();
      if (retryPed.data) {
        pedidoCreadoId = String(retryPed.data.id);
      }
    }

    // Identificador final para navegación (preferir UUID de orden o numeroOrden)
    const pedidoFinalId = ordenCreadaId || numeroOrden || pedidoCreadoId;

    // 3. Crear mensaje inicial de bienvenida en mensajes_chat
    try {
      const msgRef = params.referenciaPago?.trim()
        ? ` y referencia #${params.referenciaPago.trim()}`
        : "";
      const msgCapture = params.comprobanteUrl ? " Comprobante de pago recibido." : "";

      await supabase.from("mensajes_chat").insert([
        {
          tienda_id: tiendaId,
          orden_id: ordenCreadaId || pedidoFinalId,
          pedido_id: pedidoFinalId,
          remitente: "sistema",
          cliente_id: null,
          remitente_rol: "sistema",
          mensaje: `👋 ¡Hola ${params.nombre.trim()}! Tu encargo #${numeroOrden} fue registrado exitosamente con abono inicial del 50% (${formatoUSD(
            params.abonoUSD
          )} / ${formatoVES(params.abonoVES)})${msgRef}.${msgCapture} El vendedor verificará los datos en breve.`,
          leido: false,
          created_at: nowIso,
        } as any,
      ]);
    } catch (errChat) {
      console.warn("Aviso insertando mensaje chat:", errChat);
    }

    // 4. Registrar en auditoría
    await registrarAccionAuditoria({
      email: "cliente@ocumarehub.com",
      accion: "pedido_creado",
      tabla: "ordenes",
      registroId: pedidoFinalId,
      detalles: {
        numeroOrden,
        cliente: params.nombre.trim(),
        cedula: params.cedula.trim(),
        totalUsd: params.subtotalUSD,
        abonoUsd: params.abonoUSD,
        referencia: params.referenciaPago?.trim() || null,
        comprobante: params.comprobanteUrl || null,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/pedido");
    revalidatePath(`/pedido/${pedidoFinalId}`);
    revalidatePath(`/pedido/${numeroOrden}`);

    return {
      success: true,
      pedidoId: pedidoFinalId,
      numeroOrden,
    };
  } catch (err: unknown) {
    console.error("Excepción en crearPedidoAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al procesar el encargo.",
    };
  }
}
