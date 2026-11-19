"use client";

import React, { useState } from "react";
import {
  X, ShoppingBag, ShieldCheck, Truck, Clock, CheckCircle,
  Copy, Check, MessageCircle, ChevronDown,
} from "lucide-react";
import { OrdenRow, EstadoOrden } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { ChatDrawer } from "./ChatDrawer";
import { actualizarEstadoOrdenAction } from "@/actions/orders";

interface OrdersTabProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

type FaseRapida = {
  estado: EstadoOrden;
  label: string;
  color: string;
  icon: React.ElementType;
};

const FASES: FaseRapida[] = [
  { estado: "pendiente", label: "Pendiente", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  { estado: "abono_verificado", label: "Verificado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  { estado: "despachado", label: "En Tránsito", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30", icon: Truck },
  { estado: "entregado", label: "Entregado", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: ShieldCheck },
];

function generarMensajeGuia(orden: OrdenRow, empresa: string): string {
  const nombre = orden.cliente_nombre || "Cliente";
  const num = orden.numero || "N/A";
  const pin = (orden as any).pin_entrega || "****";
  const metodo = (orden.metodo_entrega || "").toUpperCase();

  if (empresa === "personal") {
    return `📦 *Encargos Boutique — Aviso de Entrega Personal*\n\nHola ${nombre} 👋\n\nTu encargo *#${num}* está listo para retiro.\n\n📍 *Punto Seguro Acordado*\n🔐 *PIN de Entrega:* \`${pin}\`\n\n✅ Presenta este PIN al momento del intercambio para validar tu identidad.\n\n¡Gracias por tu confianza! 🙏`;
  }

  const empresaMap: Record<string, { link: string; emoji: string }> = {
    Zoom: { link: "https://zoom.com.ve/", emoji: "🟡" },
    MRW: { link: "https://mrw.com.ve/", emoji: "🔵" },
    Tealca: { link: "https://www.tealca.com/", emoji: "🟠" },
  };
  const info = empresaMap[empresa] || { link: "", emoji: "📦" };

  return `${info.emoji} *Encargos Boutique — Despacho Confirmado*\n\nHola *${nombre}* 👋\n\nTu encargo *#${num}* ha sido *despachado por ${empresa}*.\n\n📋 *Número de Guía:* (ver confirmación de agencia)\n🚚 *Empresa:* ${empresa}\n🔗 *Rastrear:* ${info.link}\n\n⏳ Tiempo estimado: 2-5 días hábiles según zona.\n\nCuando llegue al punto de entrega te avisamos con tu *PIN secreto* 🔐.\n\n¡Gracias por confiar en Encargos Boutique! 🛍️`;
}

export function OrdersTab({ showToast }: OrdersTabProps) {
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Estado para el generador de mensaje de guía
  const [guiaOrden, setGuiaOrden] = useState<OrdenRow | null>(null);
  const [guiaEmpresa, setGuiaEmpresa] = useState<string>("Zoom");
  const [guiaMensaje, setGuiaMensaje] = useState<string>("");
  const [guiaCopiado, setGuiaCopiado] = useState(false);

  // Estado para cambio rápido de estado
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);

  const supabase = createClient();

  React.useEffect(() => {
    cargarOrdenes();
    const channel = supabase
      .channel("ordenes_realtime_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "ordenes" }, () => cargarOrdenes())
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => cargarOrdenes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function cargarOrdenes() {
    setLoading(true);
    try {
      const tiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";
      const { data: ordenesData } = await supabase.from("ordenes").select("*").order("created_at", { ascending: false });
      if (ordenesData && ordenesData.length > 0) {
        setOrdenes(ordenesData);
      } else {
        const { data: pedidosData } = await supabase.from("pedidos").select("*").order("created_at", { ascending: false });
        if (pedidosData && pedidosData.length > 0) {
          const mapped: OrdenRow[] = pedidosData.map((p) => ({
            id: p.id, numero: (p as any).numero_orden || `PED-${p.id.slice(0, 8).toUpperCase()}`,
            tienda_id: tiendaId, cliente_id: null,
            cliente_nombre: p.cliente_nombre, cliente_telefono: p.cliente_telefono, cliente_email: null,
            direccion_entrega: p.agencia_envio,
            metodo_entrega: ((p.agencia_envio || "").toLowerCase().includes("mrw") ? "mrw" : "zoom") as "zoom" | "mrw",
            modalidad_pago: "abono", estado: (p.estado_pago || "pendiente") as EstadoOrden,
            moneda_base: "USD", tasa_cambio_bcv: "52.50",
            subtotal_usd: "0.00", total_usd: "0.00", total_ves_exacto: "0.00", total_ves: "0.00",
            monto_inicial_usd: "0.00", monto_inicial_ves: "0.00",
            saldo_pendiente_usd: "0.00", saldo_pendiente_ves: "0.00",
            redondeo_ves_entero: false, comprobante_url: p.comprobante_url || null,
            referencia_pago: p.referencia_pago || null,
            notas: `C.I: ${p.cliente_cedula}${p.referencia_pago ? ` | Ref: ${p.referencia_pago}` : ""}`,
            created_at: p.created_at || new Date().toISOString(), updated_at: p.created_at || new Date().toISOString(),
          }));
          setOrdenes(mapped);
        } else { setOrdenes([]); }
      }
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      showToast("Error al sincronizar pedidos", "error");
    } finally { setLoading(false); }
  }

  async function handleCambiarEstado(ordenId: string, nuevoEstado: EstadoOrden) {
    setCambiandoEstado(ordenId);
    try {
      const res = await actualizarEstadoOrdenAction(ordenId, nuevoEstado, "@admin");
      if (res.success) {
        showToast(`Estado actualizado a: ${nuevoEstado}`, "success");
        cargarOrdenes();
      } else {
        showToast(res.error || "Error al cambiar estado", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setCambiandoEstado(null);
    }
  }

  function abrirGeneradorGuia(orden: OrdenRow) {
    setGuiaOrden(orden);
    setGuiaEmpresa("Zoom");
    setGuiaMensaje(generarMensajeGuia(orden, "Zoom"));
  }

  function handleEmpresaGuiaChange(empresa: string) {
    setGuiaEmpresa(empresa);
    if (guiaOrden) setGuiaMensaje(generarMensajeGuia(guiaOrden, empresa));
  }

  function handleCopiarGuia() {
    navigator.clipboard.writeText(guiaMensaje);
    setGuiaCopiado(true);
    setTimeout(() => setGuiaCopiado(false), 2000);
  }

  function handleEnviarWhatsApp() {
    if (!guiaOrden) return;
    const tel = (guiaOrden.cliente_telefono || "").replace(/\D/g, "");
    const url = `https://api.whatsapp.com/send?phone=${tel || "584129998877"}&text=${encodeURIComponent(guiaMensaje)}`;
    window.open(url, "_blank");
  }

  const listaOrdenes = Array.isArray(ordenes) ? ordenes : [];
  const searchLower = (search || "").toLowerCase().trim();
  const filteredOrdenes = listaOrdenes.filter((o) => {
    if (!o) return false;
    const matchesSearch =
      searchLower === "" ||
      (o.numero || "").toLowerCase().includes(searchLower) ||
      (o.cliente_nombre || "").toLowerCase().includes(searchLower) ||
      (o.cliente_telefono || "").includes(searchLower);
    const matchesEstado =
      filtroEstado === "all" || o.estado === filtroEstado ||
      (filtroEstado === "pendiente_abono" && (o.estado === "pendiente" || o.estado === "pendiente_abono")) ||
      (filtroEstado === "abono_verificado" && (o.estado === "pagada" || o.estado === "abono_verificado")) ||
      (filtroEstado === "en_preparacion" && (o.estado === "procesando" || o.estado === "en_preparacion")) ||
      (filtroEstado === "entregado" && (o.estado === "completada" || o.estado === "entregado"));
    return matchesSearch && matchesEstado;
  });

  function renderBadge(estado: EstadoOrden) {
    const fase = FASES.find((f) => f.estado === estado || (estado === "pendiente_abono" && f.estado === "pendiente") || (estado === "pagada" && f.estado === "abono_verificado") || (estado === "completada" && f.estado === "entregado"));
    if (!fase) return <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">{estado}</span>;
    const Icon = fase.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${fase.color}`}>
        <Icon className="w-3 h-3" /> {fase.label}
      </span>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <ShoppingBag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por # Orden, cliente o teléfono..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <select
          value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
        >
          <option value="all">Todos los estados</option>
          <option value="pendiente_abono">Pendiente Abono</option>
          <option value="abono_verificado">Abono Verificado</option>
          <option value="en_preparacion">En Preparación</option>
          <option value="despachado">Despachado</option>
          <option value="entregado">Entregado</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Sincronizando pedidos...</p>
        </div>
      ) : filteredOrdenes.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No hay órdenes</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Los encargos aparecerán aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrdenes.map((orden) => {
            const esAbono = orden.modalidad_pago === "abono";
            return (
              <div
                key={orden.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                {/* Row Superior */}
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => { setOrdenSeleccionada(orden); setIsDrawerOpen(true); }}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-white">#{orden.numero}</span>
                      {renderBadge(orden.estado)}
                      {orden.comprobante_url && (
                        <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                          CAPTURE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{orden.cliente_nombre} · {orden.cliente_telefono}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-emerald-400 text-sm block">
                      {formatoUSD(esAbono ? orden.monto_inicial_usd : orden.total_usd)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatoVES(esAbono ? orden.monto_inicial_ves : orden.total_ves)}
                    </span>
                  </div>
                </div>

                {/* ✅ PILLS DE ESTADO RÁPIDO */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
                  {FASES.map((fase) => {
                    const isCurrent = orden.estado === fase.estado ||
                      (fase.estado === "pendiente" && orden.estado === "pendiente_abono") ||
                      (fase.estado === "abono_verificado" && orden.estado === "pagada") ||
                      (fase.estado === "entregado" && orden.estado === "completada");
                    const Icon = fase.icon;
                    return (
                      <button
                        key={fase.estado}
                        type="button"
                        disabled={isCurrent || cambiandoEstado === orden.id}
                        onClick={() => handleCambiarEstado(orden.id, fase.estado)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                          isCurrent
                            ? `${fase.color} cursor-default`
                            : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {fase.label}
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
                      </button>
                    );
                  })}

                  {/* Botón generador WhatsApp */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); abrirGeneradorGuia(orden); }}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-[#25D366]/30 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Msg WhatsApp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        orden={ordenSeleccionada}
        onOrderUpdated={cargarOrdenes}
        showToast={showToast}
      />

      {/* ✅ MODAL GENERADOR DE MENSAJE WHATSAPP */}
      {guiaOrden && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-[#0B1320] border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-700" />
            </div>
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-display font-bold text-sm text-white">
                📱 Mensaje de Despacho — #{guiaOrden.numero}
              </span>
              <button
                type="button"
                onClick={() => setGuiaOrden(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Selector de empresa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vía / Método:</label>
                <div className="flex flex-wrap gap-2">
                  {["Zoom", "MRW", "Tealca", "personal"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handleEmpresaGuiaChange(e)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        guiaEmpresa === e
                          ? "bg-[#064E3B] text-[#84CC16] border-[#84CC16]/40"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {e === "personal" ? "📍 Personal" : e}
                    </button>
                  ))}
                </div>
              </div>
              {/* Vista del mensaje */}
              <textarea
                value={guiaMensaje}
                onChange={(e) => setGuiaMensaje(e.target.value)}
                rows={8}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs p-3 font-mono resize-none focus:outline-none focus:border-[#25D366]"
              />
              {/* Acciones */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopiarGuia}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                    guiaCopiado
                      ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {guiaCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {guiaCopiado ? "¡Copiado!" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={handleEnviarWhatsApp}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-[#25D366] text-slate-950 hover:bg-[#20BD5A] transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
