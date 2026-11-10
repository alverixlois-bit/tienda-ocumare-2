"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Phone,
  Calendar,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { OrdenRow, EstadoOrden } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { ChatDrawer } from "./ChatDrawer";
import { formatoUSD, formatoVES } from "@/utils/currency";

interface OrdersTabProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function OrdersTab({ showToast }: OrdersTabProps) {
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Drawer de Chat y Verificación P2P
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    cargarOrdenes();

    // Suscripción Realtime a cambios en órdenes y pedidos
    const channel = supabase
      .channel("ordenes_realtime_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordenes" },
        () => {
          cargarOrdenes();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          cargarOrdenes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function cargarOrdenes() {
    setLoading(true);
    try {
      const tiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

      // 1. Probar consulta en ordenes
      const { data: ordenesData } = await supabase
        .from("ordenes")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordenesData && ordenesData.length > 0) {
        setOrdenes(ordenesData);
      } else {
        // 2. Fallback a tabla pedidos existente en Supabase
        const { data: pedidosData } = await supabase
          .from("pedidos")
          .select("*")
          .order("created_at", { ascending: false });

        if (pedidosData && pedidosData.length > 0) {
          const mapped: OrdenRow[] = pedidosData.map((p) => ({
            id: p.id,
            numero: (p as any).numero_orden || (p as any).numero || `PED-${p.id.slice(0, 8).toUpperCase()}`,
            tienda_id: tiendaId,
            cliente_id: null,
            cliente_nombre: p.cliente_nombre,
            cliente_telefono: p.cliente_telefono,
            cliente_email: null,
            direccion_entrega: p.agencia_envio,
            metodo_entrega: ((p.agencia_envio || "").toLowerCase().includes("mrw") ? "mrw" : "zoom") as "zoom" | "mrw",
            modalidad_pago: "abono",
            estado: (p.estado_pago || "pendiente") as EstadoOrden,
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
            comprobante_url: p.comprobante_url || null,
            referencia_pago: p.referencia_pago || null,
            notas: `C.I: ${p.cliente_cedula}${p.referencia_pago ? ` | Ref: ${p.referencia_pago}` : ""}`,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.created_at || new Date().toISOString(),
          }));
          setOrdenes(mapped);
        } else {
          setOrdenes([]);
        }
      }
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      showToast("Error al sincronizar pedidos de Supabase", "error");
    } finally {
      setLoading(false);
    }
  }

  function abrirChat(orden: OrdenRow) {
    setOrdenSeleccionada(orden);
    setIsDrawerOpen(true);
  }

  function handleOrderUpdated() {
    cargarOrdenes();
    if (ordenSeleccionada) {
      // Refrescar orden seleccionada
      supabase
        .from("ordenes")
        .select("*")
        .eq("id", ordenSeleccionada.id)
        .single()
        .then(({ data }) => {
          if (data) setOrdenSeleccionada(data);
        });
    }
  }

  // Filtrado seguro
  const listaOrdenes = Array.isArray(ordenes) ? ordenes : [];
  const searchLower = (search || "").toLowerCase().trim();

  const filteredOrdenes = listaOrdenes.filter((o) => {
    if (!o) return false;
    const num = (o.numero || "").toLowerCase();
    const cliente = (o.cliente_nombre || "").toLowerCase();
    const telf = (o.cliente_telefono || "");

    const matchesSearch =
      searchLower === "" ||
      num.includes(searchLower) ||
      cliente.includes(searchLower) ||
      telf.includes(searchLower);

    const matchesEstado =
      filtroEstado === "all" ||
      o.estado === filtroEstado ||
      (filtroEstado === "pendiente_abono" && (o.estado === "pendiente" || o.estado === "pendiente_abono")) ||
      (filtroEstado === "abono_verificado" && (o.estado === "pagada" || o.estado === "abono_verificado")) ||
      (filtroEstado === "en_preparacion" && (o.estado === "procesando" || o.estado === "en_preparacion")) ||
      (filtroEstado === "entregado" && (o.estado === "completada" || o.estado === "entregado"));

    return matchesSearch && matchesEstado;
  });

  // Helper de badges por estado
  function renderBadgeEstado(estado: EstadoOrden) {
    switch (estado) {
      case "pendiente":
      case "pendiente_abono":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pendiente Abono
          </span>
        );
      case "pagada":
      case "abono_verificado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            Abono Verificado
          </span>
        );
      case "procesando":
      case "en_preparacion":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            En Preparación
          </span>
        );
      case "despachado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Truck className="w-3.5 h-3.5" />
            Despachado
          </span>
        );
      case "completada":
      case "entregado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            Entregado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            {estado}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por # Orden, cliente o teléfono..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente_abono">Pendiente Abono 50%</option>
            <option value="abono_verificado">Abono Verificado</option>
            <option value="en_preparacion">En Preparación</option>
            <option value="despachado">Despachado</option>
            <option value="entregado">Entregado / Completado</option>
          </select>

          <button
            onClick={cargarOrdenes}
            title="Refrescar pedidos"
            className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
          <p className="text-sm">Sincronizando monitor de pedidos...</p>
        </div>
      ) : filteredOrdenes.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No hay órdenes para mostrar</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || filtroEstado !== "all"
              ? "No hay pedidos que coincidan con los filtros seleccionados."
              : "Los encargos realizados por los compradores aparecerán aquí en tiempo real."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrdenes.map((orden) => {
            const tieneComprobante = Boolean(orden.comprobante_url);
            const esAbono = orden.modalidad_pago === "abono";

            return (
              <div
                key={orden.id}
                onClick={() => abrirChat(orden)}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all duration-200 backdrop-blur group flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Columna Izquierda: Datos del Pedido y Cliente */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-white text-base">
                        #{orden.numero}
                      </span>
                      {renderBadgeEstado(orden.estado)}
                      {tieneComprobante && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          CAPTURE ADJUNTO
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {orden.cliente_nombre}
                      </span>
                      {orden.cliente_telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {orden.cliente_telefono}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        Agencia: <strong className="text-white uppercase">{orden.metodo_entrega}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(orden.created_at).toLocaleDateString("es-VE")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Finanzas y Botón P2P */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <div className="text-left md:text-right">
                    <div className="flex items-center md:justify-end gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">
                        {esAbono ? "Abono 50% Requerido:" : "Total a Cobrar:"}
                      </span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        {formatoUSD(esAbono ? orden.monto_inicial_usd : orden.total_usd)}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-mono block">
                      {formatoVES(esAbono ? orden.monto_inicial_ves : orden.total_ves)} (Tasa: {parseFloat(orden.tasa_cambio_bcv || "0").toFixed(2)})
                    </span>

                    {esAbono && (
                      <span className="text-[11px] text-amber-400/80 block mt-0.5">
                        Saldo restante: {formatoUSD(orden.saldo_pendiente_usd)} al entregar
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirChat(orden);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 font-semibold text-xs border border-slate-700 hover:border-cyan-500 transition-all shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-cyan-400 group-hover:text-white" />
                    <span>Chat P2P</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer lateral de Chat P2P y Verificación de Comprobante */}
      <ChatDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        orden={ordenSeleccionada}
        onOrderUpdated={handleOrderUpdated}
        showToast={showToast}
      />
    </div>
  );
}
