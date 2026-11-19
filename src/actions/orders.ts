"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OrdenItemInsert } from "@/types/database.types";
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
  // Campos Stitch Encargos Boutique
  tipoEntrega?: "nacional" | "personal";
  puntoEntregaId?: string | null;
  puntoEntregaNombre?: string | null;
  fechaEntrega?: string | null;
  horaEntrega?: string | null;
  metodoPagoSitio?: string | null;
  denominacionBillete?: string | null;
  tipoPago?: "abono_50" | "total_100";
  pinEntrega?: string | null;
}

export interface CrearPedidoResponse {
  success: boolean;
  pedidoId?: string;
  numeroOrden?: string;
  pinEntrega?: string;
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
    const pinGenerado =
      params.pinEntrega || String(Math.floor(1000 + Math.random() * 9000));
    const nowIso = new Date().toISOString();

    const estadoFinal =
      params.comprobanteUrl || (params.referenciaPago && params.referenciaPago.trim())
        ? "abono_verificado"
        : "pendiente";

    const tipoPagoFinal = params.tipoPago || "abono_50";
    const tipoEntregaFinal = params.tipoEntrega || (params.metodoEntrega === "personal" ? "personal" : "nacional");

    // 1. Inserción en tabla 'ordenes'
    const ordenPayload: Record<string, any> = {
      tienda_id: tiendaId,
      numero: numeroOrden,
      cliente_nombre: params.nombre.trim(),
      cliente_telefono: params.telefono.trim(),
      cliente_email: null,
      cliente_id: null,
      cliente_cedula: params.cedula.trim(),
      direccion_entrega: params.direccion.trim(),
      metodo_entrega: params.metodoEntrega,
      modalidad_pago: tipoPagoFinal === "total_100" ? "completo" : "abono",
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
      } | Notas: ${params.notas?.trim() || "Ninguna"}${
        params.denominacionBillete ? ` | Vuelto para: ${params.denominacionBillete}` : ""
      }`,
      // Campos de despacho y seguridad Stitch
      pin_entrega: pinGenerado,
      tipo_entrega: tipoEntregaFinal,
      punto_entrega_id: params.puntoEntregaId || null,
      punto_entrega_nombre: params.puntoEntregaNombre || null,
      fecha_entrega: params.fechaEntrega || null,
      hora_entrega: params.horaEntrega || null,
      metodo_pago_sitio: params.metodoPagoSitio || null,
      denominacion_billete: params.denominacionBillete || null,
      tipo_pago: tipoPagoFinal,
      monto_abonado_usd: params.abonoUSD,
      monto_restante_usd: params.saldoPendienteUSD,
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
      agencia_envio:
        tipoEntregaFinal === "personal"
          ? `ENTREGA PERSONAL: ${params.puntoEntregaNombre || "Punto seguro"} (${params.fechaEntrega || ""} ${params.horaEntrega || ""})`
          : `${params.metodoEntrega.toUpperCase()} - ${params.direccion.trim()}`,
      estado_pago: estadoFinal === "abono_verificado" ? "abono_verificado" : "pendiente_abono",
      referencia_pago: params.referenciaPago?.trim() || null,
      comprobante_url: params.comprobanteUrl || null,
      numero_orden: numeroOrden,
      pin_entrega: pinGenerado,
      tipo_entrega: tipoEntregaFinal,
      punto_entrega_id: params.puntoEntregaId || null,
      punto_entrega_nombre: params.puntoEntregaNombre || null,
      fecha_entrega: params.fechaEntrega || null,
      hora_entrega: params.horaEntrega || null,
      metodo_pago_sitio: params.metodoPagoSitio || null,
      denominacion_billete: params.denominacionBillete || null,
      tipo_pago: tipoPagoFinal,
      monto_abonado_usd: params.abonoUSD,
      monto_restante_usd: params.saldoPendienteUSD,
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
      // Reintentar sin columnas opcionales si la base es antigua
      delete pedidoPayload.numero_orden;
      delete pedidoPayload.pin_entrega;
      delete pedidoPayload.tipo_entrega;
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
      const msgPin = ` Tu PIN secreto de entrega es: 🔑 ${pinGenerado}.`;

      await supabase.from("mensajes_chat").insert([
        {
          tienda_id: tiendaId,
          orden_id: ordenCreadaId || pedidoFinalId,
          pedido_id: pedidoFinalId,
          remitente: "admin",
          admin_alias: "Asesor de Ventas",
          mensaje: `👋 ¡Hola ${params.nombre.trim()}! Tu encargo #${numeroOrden} fue registrado exitosamente con ${
            tipoPagoFinal === "total_100" ? "pago completo (100%)" : "abono inicial (50%)"
          } (${formatoUSD(params.abonoUSD)} / ${formatoVES(params.abonoVES)})${msgRef}.${msgCapture}${msgPin} El vendedor verificará los datos en breve.`,
          leido: false,
          created_at: nowIso,
        } as any,
      ]);
    } catch (errChat) {
      console.warn("Aviso insertando mensaje chat:", errChat);
    }

    // 4. Si hubo pago registrado, crear movimiento financiero de ingreso
    if (params.abonoUSD > 0 && (params.referenciaPago || params.comprobanteUrl)) {
      try {
        await supabase.from("finanzas_movimientos").insert([
          {
            tipo: "ingreso",
            monto_usd: params.abonoUSD,
            monto_ves: params.abonoVES,
            metodo_pago: params.metodoPagoSitio || "transferencia_o_movil",
            concepto: `Abono de encargo #${numeroOrden} - ${params.nombre.trim()}`,
            categoria: "abono",
            orden_id: numeroOrden,
            comprobante_url: params.comprobanteUrl || null,
            creado_por: "sistema_checkout",
            created_at: nowIso,
          } as any,
        ]);
      } catch (errFin) {
        console.warn("Aviso registrando finanzas:", errFin);
      }
    }

    // 5. Registrar en auditoría
    await registrarAccionAuditoria({
      email: "cliente@ocumarehub.com",
      accion: "pedido_creado",
      tabla: "ordenes",
      registroId: pedidoFinalId,
      detalles: {
        numeroOrden,
        pinEntrega: pinGenerado,
        cliente: params.nombre.trim(),
        cedula: params.cedula.trim(),
        totalUsd: params.subtotalUSD,
        abonoUsd: params.abonoUSD,
        tipoEntrega: tipoEntregaFinal,
        referencia: params.referenciaPago?.trim() || null,
        comprobante: params.comprobanteUrl || null,
      },
    });

    revalidarRutas();
    revalidatePath(`/pedido/${pedidoFinalId}`);
    revalidatePath(`/pedido/${numeroOrden}`);

    return {
      success: true,
      pedidoId: pedidoFinalId,
      numeroOrden,
      pinEntrega: pinGenerado,
    };
  } catch (err: unknown) {
    console.error("Excepción en crearPedidoAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al procesar el encargo.",
    };
  }
}

/**
 * Actualiza el estado de una orden (por ejemplo 'pagada', 'en_preparacion', 'despachado', 'entregado', 'cancelada')
 */
export async function actualizarEstadoOrdenAction(
  ordenId: string,
  nuevoEstado: string,
  adminAlias: string = "@admin"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    // Actualizar en 'ordenes'
    const { error: ordErr } = await supabase
      .from("ordenes")
      .update({ estado: nuevoEstado, updated_at: nowIso } as any)
      .or(`id.eq.${ordenId},numero.eq.${ordenId}`);

    // Actualizar en 'pedidos'
    await supabase
      .from("pedidos")
      .update({ estado_pago: nuevoEstado } as any)
      .or(`id.eq.${ordenId},numero_orden.eq.${ordenId}`);

    // Mensaje automático en chat
    const estadoLabels: Record<string, string> = {
      abono_verificado: "✅ Pago/Abono verificado con éxito por el vendedor.",
      pagada: "✅ Pago total verificado con éxito.",
      en_preparacion: "📦 Tu encargo está siendo preparado y empaquetado para despacho.",
      despachado: "🚚 Tu encargo ha sido despachado / está en ruta para entrega.",
      entregado: "🎉 ¡Tu encargo ha sido entregado exitosamente! Gracias por tu compra.",
      cancelada: "⚠️ Tu encargo ha sido cancelado.",
    };

    if (estadoLabels[nuevoEstado]) {
      try {
        await supabase.from("mensajes_chat").insert([
          {
            orden_id: ordenId,
            remitente: "admin",
            admin_alias: "Asesor de Ventas",
            mensaje: estadoLabels[nuevoEstado],
            leido: false,
            created_at: nowIso,
          } as any,
        ]);
      } catch (err) {
        console.warn("Aviso insertando chat de estado:", err);
      }
    }

    await registrarAccionAuditoria({
      accion: "actualizar_estado_orden",
      tabla: "ordenes",
      registroId: ordenId,
      detalles: { nuevoEstado, adminAlias },
    });

    revalidarRutas();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error al actualizar estado" };
  }
}

/**
 * Asigna número de guía de envío y empresa (Zoom, Tealca, MRW)
 */
export async function asignarGuiaEnvioAction(
  ordenId: string,
  empresa: string,
  guia: string,
  adminAlias: string = "@despacho"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    await supabase
      .from("ordenes")
      .update({
        empresa_envio: empresa.trim(),
        guia_seguimiento: guia.trim(),
        estado: "despachado",
        updated_at: nowIso,
      } as any)
      .or(`id.eq.${ordenId},numero.eq.${ordenId}`);

    await supabase
      .from("pedidos")
      .update({
        estado_pago: "despachado",
      } as any)
      .or(`id.eq.${ordenId},numero_orden.eq.${ordenId}`);

    try {
      await supabase.from("mensajes_chat").insert([
        {
          orden_id: ordenId,
          remitente: "admin",
          admin_alias: "Asesor de Ventas",
          mensaje: `📦 ¡Tu pedido fue despachado por ${empresa.trim()}! Número de guía: ${guia.trim()}. Puedes rastrearlo en la página oficial del courier.`,
          leido: false,
          created_at: nowIso,
        } as any,
      ]);
    } catch (e) {
      console.warn("Aviso enviando mensaje guia:", e);
    }

    await registrarAccionAuditoria({
      accion: "asignar_guia_envio",
      tabla: "ordenes",
      registroId: ordenId,
      detalles: { empresa, guia, adminAlias },
    });

    revalidarRutas();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error al asignar guía" };
  }
}

/**
 * Valida el PIN de 4 dígitos para entrega personal y marca como entregado
 */
export async function validarPinEntregaAction(
  ordenId: string,
  pinIngresado: string,
  adminAlias: string = "@despacho"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Consultar el PIN registrado
    const { data: orden } = await supabase
      .from("ordenes")
      .select("id, numero, pin_entrega, cliente_nombre")
      .or(`id.eq.${ordenId},numero.eq.${ordenId}`)
      .maybeSingle();

    const pinGuardado = (orden as any)?.pin_entrega;

    if (pinGuardado && String(pinGuardado).trim() !== String(pinIngresado).trim()) {
      return { success: false, error: `PIN incorrecto (${pinIngresado}). El cliente debe mostrar su código de 4 dígitos.` };
    }

    const nowIso = new Date().toISOString();

    await supabase
      .from("ordenes")
      .update({ estado: "entregado", updated_at: nowIso } as any)
      .or(`id.eq.${ordenId},numero.eq.${ordenId}`);

    await supabase
      .from("pedidos")
      .update({ estado_pago: "entregado" } as any)
      .or(`id.eq.${ordenId},numero_orden.eq.${ordenId}`);

    try {
      await supabase.from("mensajes_chat").insert([
        {
          orden_id: ordenId,
          remitente: "admin",
          admin_alias: "Asesor de Ventas",
          mensaje: `🎉 ¡Entrega personal completada exitosamente mediante validación de PIN seguro! Gracias por confiar en nosotros.`,
          leido: false,
          created_at: nowIso,
        } as any,
      ]);
    } catch (e) {
      console.warn("Aviso enviando mensaje pin:", e);
    }

    await registrarAccionAuditoria({
      accion: "validar_pin_entrega_completada",
      tabla: "ordenes",
      registroId: ordenId,
      detalles: { pinIngresado, adminAlias, cliente: (orden as any)?.cliente_nombre },
    });

    revalidarRutas();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error al validar PIN" };
  }
}

export async function enviarMensajeChatAction({
  ordenId,
  remitente,
  mensaje,
  archivoUrl,
  tipoArchivo,
  adminAlias = "Asesor",
}: {
  ordenId: string;
  remitente: "cliente" | "admin";
  mensaje?: string;
  archivoUrl?: string;
  tipoArchivo?: "imagen" | "video" | "documento";
  adminAlias?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    // Payload con ambas variantes de columna — el resiliente loop descarta la que no exista
    const payloadBase = {
      remitente,
      admin_alias: remitente === "admin" ? adminAlias : null,
      mensaje: mensaje?.trim() || null,
      archivo_url: archivoUrl || null,
      tipo_archivo: tipoArchivo || null,
      leido: false,
      created_at: nowIso,
    };

    // Intentar con orden_id (TEXT) primero
    let { data, error } = await supabase
      .from("mensajes_chat")
      .insert([{ ...payloadBase, orden_id: ordenId } as any])
      .select()
      .maybeSingle();

    // Si falla por orden_id, intentar con pedido_id (UUID cuando sea válido)
    if (error && (error.message?.includes("orden_id") || error.message?.includes("pedido_id"))) {
      const retryPayload: Record<string, any> = { ...payloadBase };
      // Verificar si el ID parece un UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ordenId);
      if (isUUID) {
        retryPayload.pedido_id = ordenId;
      } else {
        retryPayload.orden_id = ordenId;
      }
      const retry = await supabase
        .from("mensajes_chat")
        .insert([retryPayload as any])
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn("Error al enviar mensaje chat:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath(`/pedido/${ordenId}`);
    revalidatePath("/admin");
    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error al enviar mensaje" };
  }
}

/**
 * Registrar movimiento en Caja POS / Finanzas
 */
export async function registrarMovimientoCajaAction(params: {
  tipo: "ingreso" | "egreso";
  montoUsd: number;
  montoVes: number;
  metodoPago: string;
  concepto: string;
  categoria?: string;
  ordenId?: string;
  creadoPor?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const { error } = await supabase.from("finanzas_movimientos").insert([
      {
        tipo: params.tipo,
        monto_usd: params.montoUsd,
        monto_ves: params.montoVes,
        metodo_pago: params.metodoPago,
        concepto: params.concepto.trim(),
        categoria: params.categoria || "general",
        orden_id: params.ordenId || null,
        creado_por: params.creadoPor || "@cajero",
        created_at: nowIso,
      } as any,
    ]);

    if (error) {
      return { success: false, error: error.message };
    }

    await registrarAccionAuditoria({
      accion: `registro_caja_${params.tipo}`,
      tabla: "finanzas_movimientos",
      detalles: params,
    });

    revalidarRutas();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error al registrar movimiento" };
  }
}

/**
 * Puntos de Entrega Segura CRUD
 */
export async function guardarPuntoEntregaAction(params: {
  id?: string;
  nombre: string;
  direccion: string;
  referencia?: string;
  horario?: string;
  activo?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const payload = {
      nombre: params.nombre.trim(),
      direccion: params.direccion.trim(),
      referencia: params.referencia?.trim() || null,
      horario: params.horario?.trim() || null,
      activo: params.activo ?? true,
      updated_at: new Date().toISOString(),
    };

    if (params.id) {
      const { error } = await supabase
        .from("puntos_entrega")
        .update(payload as any)
        .eq("id", params.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from("puntos_entrega")
        .insert([payload as any]);
      if (error) return { success: false, error: error.message };
    }

    await registrarAccionAuditoria({
      accion: params.id ? "actualizar_punto_entrega" : "crear_punto_entrega",
      tabla: "puntos_entrega",
      detalles: params,
    });

    revalidarRutas();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error al guardar punto" };
  }
}

export async function eliminarPuntoEntregaAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("puntos_entrega").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    await registrarAccionAuditoria({
      accion: "eliminar_punto_entrega",
      tabla: "puntos_entrega",
      registroId: id,
      detalles: { id },
    });

    revalidarRutas();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error al eliminar punto" };
  }
}

export async function actualizarPresenciaAdminAction(
  alias: string,
  enLinea: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await supabase
      .from("admin_perfiles")
      .upsert({ alias, en_linea: enLinea, updated_at: new Date().toISOString() } as any, { onConflict: "alias" });

    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error de presencia" };
  }
}

function revalidarRutas() {
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  revalidatePath("/");
  revalidatePath("/pedido");
}
