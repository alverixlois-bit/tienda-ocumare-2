"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  Truck,
  User,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Package,
} from "lucide-react";
import { OrdenRow, OrdenItemRow } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusTracker } from "@/components/pedido/OrderStatusTracker";
import { PaymentDetailsBox } from "@/components/pedido/PaymentDetailsBox";
import { WhatsAppReporterBox } from "@/components/pedido/WhatsAppReporterBox";
import { OrderP2PChat } from "@/components/pedido/OrderP2PChat";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { obtenerConfiguracionTienda, ConfiguracionTiendaData } from "@/actions/config";

export default function PedidoPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [orden, setOrden] = useState<OrdenRow | null>(null);
  const [items, setItems] = useState<OrdenItemRow[]>([]);
  const [configTienda, setConfigTienda] = useState<ConfiguracionTiendaData | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!orderId) return;
    cargarOrden();

    // Suscripción Realtime para actualizar la orden si el vendedor cambia su estado
    const channel = supabase
      .channel(`orden_watch_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ordenes",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrden(payload.new as OrdenRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  async function cargarOrden() {
    setLoading(true);
    try {
      // 1. Cargar orden desde ordenes
      const { data: ordData } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (ordData) {
        setOrden(ordData);
      } else {
        // Fallback a tabla pedidos existente en Supabase
        const { data: pedidoData } = await supabase
          .from("pedidos")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();

        if (pedidoData) {
          const adapted: OrdenRow = {
            id: pedidoData.id,
            numero: pedidoData.id.slice(0, 8).toUpperCase(),
            tienda_id: process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111",
            cliente_id: null,
            cliente_nombre: pedidoData.cliente_nombre,
            cliente_telefono: pedidoData.cliente_telefono,
            cliente_email: null,
            direccion_entrega: pedidoData.agencia_envio,
            metodo_entrega: ((pedidoData.agencia_envio || "").toLowerCase().includes("mrw") ? "mrw" : "zoom") as "zoom" | "mrw",
            modalidad_pago: "abono",
            estado: (pedidoData.estado_pago || "pendiente") as any,
            moneda_base: "USD",
            tasa_cambio_bcv: "52.50",
            subtotal_usd: "0.00",
            total_usd: "0.00",
            total_ves_exacto: "0.00",
            total_ves: "0.00",
            monto_inicial_usd: "0.00",
            monto_inicial_ves: "0.00",
            saldo_pendiente_usd: "0.00",
            saldo_pendiente_ves: "0.00",
            redondeo_ves_entero: false,
            comprobante_url: null,
            notas: `C.I: ${pedidoData.cliente_cedula}`,
            created_at: pedidoData.created_at || new Date().toISOString(),
            updated_at: pedidoData.created_at || new Date().toISOString(),
          };
          setOrden(adapted);
        }
      }

      // 2. Cargar items de la orden
      const { data: itemsData } = await supabase
        .from("orden_items")
        .select("*")
        .eq("orden_id", orderId);

      if (itemsData) {
        setItems(itemsData);
      }

      // 3. Cargar configuración y datos bancarios de la tienda
      try {
        const conf = await obtenerConfiguracionTienda();
        if (conf) {
          setConfigTienda(conf);
        }
      } catch (errConfig) {
        console.warn("Aviso cargando configuración de tienda:", errConfig);
      }
    } catch (err) {
      console.error("Error al cargar orden:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6">
        <RefreshCw className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
        <p className="text-base font-medium text-white">Cargando detalles de tu encargo...</p>
        <p className="text-xs text-slate-500 mt-1">Conectando con Supabase Realtime</p>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
        <ShoppingBag className="w-12 h-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white">Pedido no encontrado</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          No pudimos localizar la orden solicitada. Verifica el enlace o regresa al catálogo.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
        >
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const esAbono = orden.modalidad_pago === "abono";
  const abonoPendiente = orden.estado === "pendiente" || orden.estado === "pendiente_abono";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/catalogo"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Volver al catálogo"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="h-6 w-[1px] bg-slate-800" />

            <div>
              <span className="font-extrabold text-white text-base block font-mono">
                Orden #{orden.numero}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(orden.created_at).toLocaleString("es-VE")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
              {orden.estado}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Línea de tiempo visual del pedido */}
        <OrderStatusTracker estado={orden.estado} />

        {/* Datos Bancarios de Pago si está en estado pendiente de abono */}
        {abonoPendiente && (
          <PaymentDetailsBox
            montoAbonoUsd={esAbono ? orden.monto_inicial_usd : orden.total_usd}
            montoAbonoVes={esAbono ? orden.monto_inicial_ves : orden.total_ves}
            tasaBcv={orden.tasa_cambio_bcv}
            configTienda={configTienda}
          />
        )}

        {/* Notificación y Reporte de Pago vía WhatsApp a 3 Vendedores */}
        <WhatsAppReporterBox
          orden={orden}
          montoAbonoUsd={esAbono ? orden.monto_inicial_usd : orden.total_usd}
          montoAbonoVes={esAbono ? orden.monto_inicial_ves : orden.total_ves}
          tasaBcv={orden.tasa_cambio_bcv}
        />

        {/* Layout en dos columnas: Izquierda detalles / Derecha Chat P2P */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Resumen de la Orden y Productos */}
          <div className="lg:col-span-5 space-y-5">
            {/* Tarjeta de Datos de Envío */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 backdrop-blur">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-cyan-400" />
                Datos de Envío y Receptor
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-white">{orden.cliente_nombre}</span>
                </div>

                {orden.cliente_telefono && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{orden.cliente_telefono}</span>
                  </div>
                )}

                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block">{orden.direccion_entrega || "Ocumare"}</span>
                    <span className="text-[11px] text-cyan-400 font-bold uppercase mt-0.5 block">
                      Agencia: {orden.metodo_entrega}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Desglose Financiero */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 backdrop-blur text-xs">
              <h3 className="font-semibold text-slate-400 uppercase tracking-wider">
                Desglose Financiero (Multidivisa)
              </h3>

              <div className="space-y-2 divide-y divide-slate-800/80">
                <div className="flex justify-between py-1 text-slate-400">
                  <span>Total de la Orden:</span>
                  <div className="text-right">
                    <span className="font-mono text-white font-bold block">
                      {formatoUSD(orden.total_usd)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {formatoVES(orden.total_ves)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-1.5 text-emerald-400">
                  <span className="font-semibold">Abono Inicial 50%:</span>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-sm block">
                      {formatoUSD(orden.monto_inicial_usd)}
                    </span>
                    <span className="text-[10px] font-mono block">
                      {formatoVES(orden.monto_inicial_ves)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-1 text-slate-400">
                  <span>Saldo Restante al Entregar:</span>
                  <div className="text-right">
                    <span className="font-mono text-slate-200 font-medium block">
                      {formatoUSD(orden.saldo_pendiente_usd)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {formatoVES(orden.saldo_pendiente_ves)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between pt-2 text-[11px] text-slate-500 font-mono">
                  <span>Tasa BCV fijada en orden:</span>
                  <span>Bs. {parseFloat(orden.tasa_cambio_bcv || "0").toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Lista de Ítems del Pedido */}
            {items.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 backdrop-blur">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-cyan-400" />
                  Productos en este Encargo ({items.length})
                </h3>

                <div className="space-y-2.5 max-h-56 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <h4 className="font-semibold text-white truncate max-w-[200px]">
                          {item.producto_titulo}
                        </h4>
                        <span className="text-[11px] text-slate-400 block">
                          Cant: {item.cantidad} {item.unidad_medida} &bull; {formatoUSD(item.precio_unitario_usd)} c/u
                        </span>
                      </div>
                      <span className="font-mono font-bold text-cyan-400">
                        {formatoUSD(item.subtotal_usd)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Chat P2P Directo con el Vendedor */}
          <div className="lg:col-span-7">
            <OrderP2PChat
              orden={orden}
              onOrderUpdated={cargarOrden}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        OcumareHub &copy; {new Date().getFullYear()} — Plataforma Segura de Comercio por Encargo.
      </footer>
    </div>
  );
}
