"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ShieldCheck, Truck, User, Phone, MapPin, CreditCard, RefreshCw } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import { OrdenInsert, OrdenItemInsert, MetodoEntrega } from "@/types/database.types";
import { formatoUSD, formatoVES } from "@/utils/currency";

export function CheckoutModal() {
  const router = useRouter();
  const {
    items,
    isCheckoutOpen,
    setIsCheckoutOpen,
    subtotalUSD,
    subtotalVES,
    abonoUSD,
    abonoVES,
    saldoPendienteUSD,
    saldoPendienteVES,
    tasaBcv,
    limpiarCarrito,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [metodoEntrega, setMetodoEntrega] = useState<MetodoEntrega>("zoom");
  const [notas, setNotas] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  if (!isCheckoutOpen) return null;

  async function handleConfirmOrder(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const listaItems = Array.isArray(items) ? items : [];

    if (listaItems.length === 0) {
      setErrorMsg("El carrito está vacío");
      setLoading(false);
      return;
    }

    try {
      const tiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";
      const numeroOrden = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Crear Orden en Supabase
      const ordenPayload: OrdenInsert = {
        tienda_id: tiendaId,
        numero: numeroOrden,
        cliente_nombre: nombre.trim(),
        cliente_telefono: telefono.trim(),
        cliente_email: null,
        cliente_id: null,
        direccion_entrega: direccion.trim(),
        metodo_entrega: metodoEntrega,
        modalidad_pago: "abono",
        estado: "pendiente",
        moneda_base: "USD",
        tasa_cambio_bcv: tasaBcv.toFixed(4),
        subtotal_usd: subtotalUSD.toFixed(4),
        total_usd: subtotalUSD.toFixed(4),
        total_ves_exacto: subtotalVES.toFixed(2),
        total_ves: subtotalVES.toFixed(2),
        monto_inicial_usd: abonoUSD.toFixed(4),
        monto_inicial_ves: abonoVES.toFixed(2),
        saldo_pendiente_usd: saldoPendienteUSD.toFixed(4),
        saldo_pendiente_ves: saldoPendienteVES.toFixed(2),
        redondeo_ves_entero: false,
        comprobante_url: null,
        notas: `C.I/RIF: ${cedula.trim()} | Notas: ${notas.trim() || "Ninguna"}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let pedidoFinalId = "";

      // 1. Intentar insertar en ordenes
      const { data: ordenCreada, error: errorOrden } = await supabase
        .from("ordenes")
        .insert([ordenPayload])
        .select()
        .single();

      if (ordenCreada) {
        pedidoFinalId = ordenCreada.id;

        // 2. Crear ítems en orden_items
        const itemsPayload: OrdenItemInsert[] = listaItems.map((item) => {
          const precioUsd =
            item.producto.en_oferta && item.producto.precio_oferta
              ? item.producto.precio_oferta
              : item.producto.precio_base;

          const subtotalItemUsd = (parseFloat(precioUsd) * item.cantidad).toFixed(4);
          const subtotalItemVes = (parseFloat(subtotalItemUsd) * tasaBcv).toFixed(2);
          const precioUnitarioVes = (parseFloat(precioUsd) * tasaBcv).toFixed(2);

          return {
            orden_id: ordenCreada.id,
            producto_id: item.producto.id,
            producto_titulo: item.producto.titulo,
            unidad_medida: item.producto.unidad_medida,
            moneda_base: "USD",
            precio_base: precioUsd,
            precio_unitario_usd: parseFloat(precioUsd).toFixed(4),
            precio_unitario_ves: precioUnitarioVes,
            variantes_seleccionadas: null,
            cantidad: String(item.cantidad),
            subtotal_usd: subtotalItemUsd,
            subtotal_ves_exacto: subtotalItemVes,
            subtotal_ves: subtotalItemVes,
            created_at: new Date().toISOString(),
          };
        });

        await supabase.from("orden_items").insert(itemsPayload);
      } else {
        // Fallback a tabla pedidos existente en Supabase
        console.warn("Aviso ordenes (guardando en pedidos):", errorOrden?.message);
        const { data: pedidoCreado } = await supabase
          .from("pedidos")
          .insert([
            {
              cliente_nombre: nombre.trim(),
              cliente_cedula: cedula.trim(),
              cliente_telefono: telefono.trim(),
              agencia_envio: `${metodoEntrega.toUpperCase()} - ${direccion.trim()}`,
              estado_pago: "pendiente_abono",
            },
          ])
          .select()
          .single();

        pedidoFinalId = pedidoCreado?.id || `PED-${Date.now()}`;
      }

      // 3. Registrar en auditoria_logs si existe la tabla
      await supabase.from("auditoria_logs").insert([
        {
          accion: "pedido_creado",
          detalles: `Encargo #${numeroOrden} creado por ${nombre.trim()} (${cedula.trim()}). Total: ${formatoUSD(subtotalUSD)}. Abono 50%: ${formatoUSD(abonoUSD)}.`,
        },
      ]);

      // 4. Crear mensaje inicial en el chat privado del pedido
      await supabase.from("mensajes_chat").insert([
        {
          tienda_id: tiendaId,
          orden_id: pedidoFinalId,
          pedido_id: pedidoFinalId,
          remitente: "sistema",
          cliente_id: null,
          remitente_rol: "sistema",
          mensaje: `👋 ¡Hola ${nombre.trim()}! Tu orden #${numeroOrden} fue registrada exitosamente. Para procesar tu encargo, por favor realiza el abono del 50% (${formatoUSD(abonoUSD)} / ${formatoVES(abonoVES)}) y adjunta tu comprobante aquí.`,
          leido: false,
          created_at: new Date().toISOString(),
        } as any,
      ]);

      // 5. Limpiar carrito y redirigir
      limpiarCarrito();
      setIsCheckoutOpen(false);
      router.push(`/pedido/${pedidoFinalId}`);
    } catch (err: unknown) {
      console.error("Error al procesar checkout:", err);
      const msg = err instanceof Error ? err.message : "Error al procesar el encargo";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white text-base">Finalizar Pedido por Encargo</h2>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirmOrder} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Caja Resumen Financiero 50% Abono */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-300 font-semibold block">
                Abono Requerido para Iniciar Pedido (50%):
              </span>
              <span className="text-xl font-extrabold text-white font-mono">
                {formatoUSD(abonoUSD)}
              </span>
              <span className="text-xs text-emerald-400 font-mono block">
                {formatoVES(abonoVES)} (Tasa BCV: {tasaBcv.toFixed(2)})
              </span>
            </div>

            <div className="text-right text-xs text-slate-400">
              <span className="block font-medium">Saldo contra entrega:</span>
              <span className="font-mono text-white font-semibold">
                {formatoUSD(saldoPendienteUSD)}
              </span>
            </div>
          </div>

          {/* Datos Personales */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nombre y Apellido *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Cédula / RIF *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="V-12345678"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="0412 1234567"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Método de Entrega */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Método de Envío o Entrega *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "zoom", label: "ZOOM" },
                  { id: "mrw", label: "MRW" },
                  { id: "tealca", label: "TEALCA" },
                  { id: "personal", label: "PERSONAL" },
                ] as const
              ).map((metodo) => (
                <button
                  type="button"
                  key={metodo.id}
                  onClick={() => setMetodoEntrega(metodo.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    metodoEntrega === metodo.id
                      ? "bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20"
                      : "bg-slate-950 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {metodo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dirección o Agencia destino */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Dirección de Entrega / Sucursal de Agencia *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ciudad, Agencia receptora o dirección exacta de entrega..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Indicaciones adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles de tallas, colores o especificaciones del encargo..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{loading ? "Creando Orden..." : "Confirmar Encargo"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
