"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  Eye,
  X,
  RefreshCw,
  Search,
  KeyRound,
  Calendar,
  AlertCircle,
  FileCheck2,
  Phone,
  Send,
  Share2,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrdenRow } from "@/types/database.types";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { TasaBCVCard } from "@/components/admin/TasaBCVCard";
import { DigitalReceiptModal } from "@/components/admin/DigitalReceiptModal";
import {
  actualizarEstadoOrdenAction,
  asignarGuiaEnvioAction,
  validarPinEntregaAction,
} from "@/actions/orders";

interface CentroMandoTabProps {
  tasaBcv: number;
  onTasaUpdated: (nuevaTasa: number) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  onNavigateToChat?: (ordenId: string) => void;
}

export function CentroMandoTab({
  tasaBcv,
  onTasaUpdated,
  showToast,
  onNavigateToChat,
}: CentroMandoTabProps) {
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");

  // Modales
  const [modalCaptureUrl, setModalCaptureUrl] = useState<string | null>(null);
  const [ordenParaCapture, setOrdenParaCapture] = useState<OrdenRow | null>(null);

  const [modalGuiaOrden, setModalGuiaOrden] = useState<OrdenRow | null>(null);
  const [empresaGuia, setEmpresaGuia] = useState<string>("Zoom");
  const [numeroGuiaInput, setNumeroGuiaInput] = useState<string>("");
  const [guardandoGuia, setGuardandoGuia] = useState<boolean>(false);

  const [modalPinOrden, setModalPinOrden] = useState<OrdenRow | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [validandoPin, setValidandoPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Modal Recibo Digital
  const [modalReciboOrden, setModalReciboOrden] = useState<OrdenRow | null>(null);

  const supabase = createClient();

  useEffect(() => {
    cargarOrdenes();

    const channel = supabase
      .channel("centro_mando_ordenes")
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
      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setOrdenes(data);
      } else {
        // Fallback a pedidos
        const { data: peds } = await supabase
          .from("pedidos")
          .select("*")
          .order("created_at", { ascending: false });

        if (peds) {
          const mapped: OrdenRow[] = peds.map((p: any) => ({
            id: String(p.id),
            numero: p.numero_orden || `PED-${String(p.id).slice(0, 8)}`,
            tienda_id: "00000000-0000-0000-0000-000000000001",
            cliente_id: null,
            cliente_nombre: p.cliente_nombre || "Cliente",
            cliente_telefono: p.cliente_telefono || "",
            cliente_email: null,
            direccion_entrega: p.agencia_envio || "",
            metodo_entrega: (p.agencia_envio || "").toLowerCase().includes("personal") ? "personal" : "zoom",
            modalidad_pago: "abono",
            estado: p.estado_pago || "pendiente",
            moneda_base: "USD",
            tasa_cambio_bcv: String(tasaBcv),
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
            pin_entrega: p.pin_entrega || "8492",
            tipo_entrega: p.tipo_entrega || "nacional",
            notas: null,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.created_at || new Date().toISOString(),
          }));
          setOrdenes(mapped);
        }
      }
    } catch (e) {
      console.error("Error al cargar ordenes:", e);
    } finally {
      setLoading(false);
    }
  }

  // Cálculos de KPIs en tiempo real
  const totalVentasUsd = ordenes.reduce(
    (acc, o) => acc + (parseFloat(o.total_usd) || 0),
    0
  );
  const totalVentasVes = totalVentasUsd * tasaBcv;

  const ordenesPorVerificar = ordenes.filter(
    (o) =>
      o.estado === "pendiente" ||
      o.estado === "pendiente_abono" ||
      (o.comprobante_url && o.estado !== "pagada" && o.estado !== "entregado")
  ).length;

  const entregasPersonales = ordenes.filter(
    (o) =>
      o.metodo_entrega === "personal" ||
      (o as any).tipo_entrega === "personal" ||
      (o.direccion_entrega || "").toLowerCase().includes("personal")
  );

  const entregasPersonalesHoy = entregasPersonales.filter(
    (o) => o.estado !== "entregado" && o.estado !== "cancelada"
  );

  async function handleVerificarPago(ordenId: string) {
    try {
      const res = await actualizarEstadoOrdenAction(ordenId, "abono_verificado", "@admin");
      if (res.success) {
        showToast("Pago verificado con éxito", "success");
        setModalCaptureUrl(null);
        setOrdenParaCapture(null);
        cargarOrdenes();
      } else {
        showToast(res.error || "Error al verificar pago", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  }

  async function handleGuardarGuia(e: React.FormEvent) {
    e.preventDefault();
    if (!modalGuiaOrden || !numeroGuiaInput.trim()) return;

    setGuardandoGuia(true);
    try {
      const res = await asignarGuiaEnvioAction(
        modalGuiaOrden.id,
        empresaGuia,
        numeroGuiaInput.trim(),
        "@despacho"
      );
      if (res.success) {
        showToast(`Guía de ${empresaGuia} asignada con éxito`, "success");
        setModalGuiaOrden(null);
        setNumeroGuiaInput("");
        cargarOrdenes();
      } else {
        showToast(res.error || "Error al asignar guía", "error");
      }
    } catch {
      showToast("Error al guardar guía", "error");
    } finally {
      setGuardandoGuia(false);
    }
  }

  async function handleValidarPin(e: React.FormEvent) {
    e.preventDefault();
    if (!modalPinOrden || !pinInput.trim()) return;

    setValidandoPin(true);
    setPinError(null);

    try {
      const res = await validarPinEntregaAction(modalPinOrden.id, pinInput.trim(), "@despacho");
      if (res.success) {
        showToast("¡Entrega validada con éxito mediante PIN!", "success");
        setModalPinOrden(null);
        setPinInput("");
        cargarOrdenes();
      } else {
        setPinError(res.error || "PIN inválido.");
      }
    } catch (err: any) {
      setPinError(err.message || "Error al validar PIN.");
    } finally {
      setValidandoPin(false);
    }
  }

  const ordenesFiltradas = ordenes.filter((o) => {
    if (filtroEstado !== "todos") {
      if (filtroEstado === "pendientes" && o.estado !== "pendiente" && o.estado !== "pendiente_abono") return false;
      if (filtroEstado === "verificados" && o.estado !== "abono_verificado" && o.estado !== "pagada") return false;
      if (filtroEstado === "despachados" && o.estado !== "despachado") return false;
      if (filtroEstado === "entregados" && o.estado !== "entregado") return false;
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const num = (o.numero || "").toLowerCase();
      const nom = (o.cliente_nombre || "").toLowerCase();
      const ref = (o.referencia_pago || "").toLowerCase();
      return num.includes(q) || nom.includes(q) || ref.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header KPIs en Tiempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ventas Totales
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-display font-black text-2xl text-white">
                {formatoUSD(totalVentasUsd)}
              </span>
            </div>
            <span className="text-[11px] text-amber-400 font-semibold block mt-0.5">
              {formatoVES(totalVentasVes)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Por Verificar
            </span>
            <span className="font-display font-black text-2xl text-amber-400 mt-1 block">
              {ordenesPorVerificar} órdenes
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Captures pendientes de pago
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Entregas Personales Hoy
            </span>
            <span className="font-display font-black text-2xl text-purple-400 mt-1 block">
              {entregasPersonalesHoy.length} con PIN
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Puntos seguros de encuentro
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
            <KeyRound className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tasa Oficial BCV
            </span>
            <span className="font-display font-black text-2xl text-[#84CC16] mt-1 block">
              Bs. {tasaBcv.toFixed(2)}
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sincronizada con catálogo
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#064E3B] text-[#84CC16] border border-[#0D6E53] flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Grid Central: Tasa BCV Override y Agenda de Entregas Personales de Hoy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Tasa BCV Override Widget */}
        <div className="lg:col-span-5">
          <TasaBCVCard onTasaUpdated={onTasaUpdated} showToast={showToast} />
        </div>

        {/* Agenda de Entregas Personales de Hoy con PIN */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-sm">
                  Agenda de Entregas Personales con PIN
                </h3>
                <span className="text-[11px] text-slate-400">
                  Despachos presenciales en puntos seguros
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
              {entregasPersonalesHoy.length} Pendientes
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {entregasPersonalesHoy.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                <p>No hay entregas personales pendientes para hoy.</p>
              </div>
            ) : (
              entregasPersonalesHoy.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{ord.cliente_nombre}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                        #{ord.numero}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span>{ord.direccion_entrega || "Punto Ocumare"}</span>
                      {ord.cliente_telefono && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {ord.cliente_telefono}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setModalPinOrden(ord);
                        setPinInput("");
                        setPinError(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Validar PIN</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Cola de Órdenes Recientes y Despachos */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#064E3B] text-[#84CC16] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-sm sm:text-base">
                Cola de Órdenes &amp; Despachos
              </h3>
              <span className="text-[11px] text-slate-400">
                Verificación de transferencias, guías Zoom/MRW/Tealca y entregas
              </span>
            </div>
          </div>

          {/* Filtros de estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "todos", label: "Todas" },
              { id: "pendientes", label: "Pendientes" },
              { id: "verificados", label: "Verificadas" },
              { id: "despachados", label: "Despachadas" },
              { id: "entregados", label: "Entregadas" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroEstado(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filtroEstado === f.id
                    ? "bg-[#064E3B] text-[#84CC16] border border-[#0D6E53]"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buscador de Orden */}
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número de orden (#PED-...), nombre del cliente o referencia de pago..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-800 bg-slate-950 text-xs text-white focus:border-[#84CC16] outline-none"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>

        {/* Vista Móvil: Lista de Tarjetas Táctiles (< md) */}
        <div className="md:hidden space-y-3">
          {ordenesFiltradas.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No hay órdenes en esta categoría.
            </div>
          ) : (
            ordenesFiltradas.map((ord) => {
              const esPersonal =
                ord.metodo_entrega === "personal" ||
                (ord as any).tipo_entrega === "personal" ||
                (ord.direccion_entrega || "").toLowerCase().includes("personal");

              const saldoUsdVal = (ord as any).saldo_restante_usd || (ord as any).saldo_pendiente_usd || (parseFloat(String(ord.total_usd || 0)) - parseFloat(String(ord.monto_inicial_usd || 0)));

              return (
                <div
                  key={`card-${ord.id}`}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-white text-sm">
                        #{ord.numero}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(ord.created_at).toLocaleDateString("es-VE")} &bull; {ord.cliente_nombre}
                      </span>
                    </div>

                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        ord.estado === "entregado" || ord.estado === "completada"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : ord.estado === "despachado"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : ord.estado === "abono_verificado" || ord.estado === "pagada"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {ord.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total / Abono:</span>
                      <span className="font-mono font-bold text-white block">
                        {formatoUSD(ord.total_usd)}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Abono: {formatoUSD(ord.monto_inicial_usd)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Modalidad:</span>
                      <span className="font-semibold text-slate-200 uppercase block truncate">
                        {ord.metodo_entrega}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {ord.direccion_entrega || "Ocumare"}
                      </span>
                    </div>
                  </div>

                  {/* Acciones Táctiles Móviles */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      {ord.comprobante_url ? (
                        <button
                          type="button"
                          onClick={() => {
                            setModalCaptureUrl(ord.comprobante_url);
                            setOrdenParaCapture(ord);
                          }}
                          className="min-h-[38px] px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Capture</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {ord.referencia_pago ? `Ref: ${ord.referencia_pago}` : "Sin capture"}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setModalReciboOrden(ord)}
                        className="min-h-[38px] p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                        title="Ver Comprobante QR"
                      >
                        <FileText className="w-4 h-4 text-[#84CC16]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cleanTel = (ord.cliente_telefono || "").replace(/\D/g, "");
                          const guiaTxt = (ord as any).guia_seguimiento ? `\n📦 *Guía de Seguimiento:* ${(ord as any).guia_seguimiento}` : "";
                          const saldoTxt = saldoUsdVal > 0 ? `\n💵 *Saldo restante por cancelar (50%):* ${formatoUSD(saldoUsdVal)} (${formatoVES(saldoUsdVal * tasaBcv)})` : "";
                          const mensaje = `Hola *${ord.cliente_nombre}*, te escribimos de *Boutique Por Encargo* 💎.\n\n` +
                            `Te informamos que tu encargo *#${ord.numero}* se encuentra en estatus: *${ord.estado.toUpperCase()}*.${guiaTxt}${saldoTxt}\n\n` +
                            `Puedes consultar el estatus en tiempo real en:\n` +
                            `${window.location.origin}/pedido/${ord.numero}\n\n` +
                            `¡Gracias por tu confianza!`;
                          const waUrl = cleanTel
                            ? `https://api.whatsapp.com/send?phone=${cleanTel.startsWith("58") ? cleanTel : "58" + cleanTel.replace(/^0/, "")}&text=${encodeURIComponent(mensaje)}`
                            : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
                          window.open(waUrl, "_blank");
                        }}
                        className="min-h-[38px] p-2 rounded-xl bg-[#25D366]/20 text-[#25D366]"
                        title="WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {esPersonal && ord.estado !== "entregado" && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalPinOrden(ord);
                            setPinInput("");
                            setPinError(null);
                          }}
                          className="min-h-[38px] px-3 py-1 rounded-xl bg-purple-600 text-white font-bold text-[11px]"
                        >
                          PIN
                        </button>
                      )}

                      {!esPersonal && ord.estado !== "despachado" && ord.estado !== "entregado" && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalGuiaOrden(ord);
                            setEmpresaGuia(ord.metodo_entrega === "tealca" ? "Tealca" : ord.metodo_entrega === "mrw" ? "MRW" : "Zoom");
                            setNumeroGuiaInput((ord as any).guia_seguimiento || "");
                          }}
                          className="min-h-[38px] px-3 py-1 rounded-xl bg-blue-600 text-white font-bold text-[11px]"
                        >
                          Guía
                        </button>
                      )}

                      {onNavigateToChat && (
                        <button
                          type="button"
                          onClick={() => onNavigateToChat(ord.id)}
                          className="min-h-[38px] p-2 rounded-xl bg-slate-800 text-slate-300"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tabla de Órdenes Desktop (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Orden &amp; Fecha</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Método / Destino</th>
                <th className="py-3 px-3">Total / Abono</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Comprobante</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ordenesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No hay órdenes en esta categoría.
                  </td>
                </tr>
              ) : (
                ordenesFiltradas.map((ord) => {
                  const esPersonal =
                    ord.metodo_entrega === "personal" ||
                    (ord as any).tipo_entrega === "personal" ||
                    (ord.direccion_entrega || "").toLowerCase().includes("personal");

                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-white block">
                          #{ord.numero}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(ord.created_at).toLocaleDateString("es-VE")}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-200 block truncate max-w-[140px]">
                          {ord.cliente_nombre}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {ord.cliente_telefono || "S/T"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-300 block uppercase text-[11px]">
                          {ord.metodo_entrega}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">
                          {ord.direccion_entrega || "Ocumare"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-white block">
                          {formatoUSD(ord.total_usd)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono block">
                          Abono: {formatoUSD(ord.monto_inicial_usd)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            ord.estado === "entregado" || ord.estado === "completada"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : ord.estado === "despachado"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : ord.estado === "abono_verificado" || ord.estado === "pagada"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {ord.estado}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {ord.comprobante_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              setModalCaptureUrl(ord.comprobante_url);
                              setOrdenParaCapture(ord);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-[11px] transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Capture</span>
                          </button>
                        ) : ord.referencia_pago ? (
                          <span className="font-mono text-slate-400 text-[11px]">
                            Ref: {ord.referencia_pago}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Sin capture</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón 1-Click WhatsApp Despacho Stitch */}
                          <button
                            type="button"
                            onClick={() => {
                              const cleanTel = (ord.cliente_telefono || "").replace(/\D/g, "");
                              const guiaTxt = (ord as any).guia_seguimiento ? `\n📦 *Guía de Seguimiento:* ${(ord as any).guia_seguimiento}` : "";
                              const saldoUsdVal = (ord as any).saldo_restante_usd || (ord as any).saldo_pendiente_usd || (parseFloat(String(ord.total_usd || 0)) - parseFloat(String(ord.monto_inicial_usd || 0)));
                              const saldoTxt = saldoUsdVal > 0 ? `\n💵 *Saldo restante por cancelar (50%):* ${formatoUSD(saldoUsdVal)} (${formatoVES(saldoUsdVal * tasaBcv)})` : "";
                              const mensaje = `Hola *${ord.cliente_nombre}*, te escribimos de *Boutique Por Encargo* 💎.\n\n` +
                                `Te informamos que tu encargo *#${ord.numero}* se encuentra en estatus: *${ord.estado.toUpperCase()}*.${guiaTxt}${saldoTxt}\n\n` +
                                `Puedes consultar el estatus en tiempo real en:\n` +
                                `${window.location.origin}/pedido/${ord.numero}\n\n` +
                                `¡Gracias por tu confianza!`;
                              const waUrl = cleanTel
                                ? `https://api.whatsapp.com/send?phone=${cleanTel.startsWith("58") ? cleanTel : "58" + cleanTel.replace(/^0/, "")}&text=${encodeURIComponent(mensaje)}`
                                : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
                              window.open(waUrl, "_blank");
                            }}
                            className="p-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] transition-colors"
                            title="Enviar Notificación WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Ver Comprobante Digital */}
                          <button
                            type="button"
                            onClick={() => setModalReciboOrden(ord)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                            title="Ver Comprobante Digital & QR"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {esPersonal && ord.estado !== "entregado" && (
                            <button
                              type="button"
                              onClick={() => {
                                setModalPinOrden(ord);
                                setPinInput("");
                                setPinError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-colors"
                              title="Validar PIN de 4 dígitos"
                            >
                              Validar PIN
                            </button>
                          )}

                          {!esPersonal && ord.estado !== "despachado" && ord.estado !== "entregado" && (
                            <button
                              type="button"
                              onClick={() => {
                                setModalGuiaOrden(ord);
                                setEmpresaGuia(ord.metodo_entrega === "tealca" ? "Tealca" : ord.metodo_entrega === "mrw" ? "MRW" : "Zoom");
                                setNumeroGuiaInput((ord as any).guia_seguimiento || "");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors"
                              title="Asignar Guía de Envío"
                            >
                              Asignar Guía
                            </button>
                          )}

                          {onNavigateToChat && (
                            <button
                              type="button"
                              onClick={() => onNavigateToChat(ord.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Abrir Chat P2P"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visualizador de Capture de Pago */}
      {modalCaptureUrl && ordenParaCapture && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white text-sm">
                  Comprobante de Pago — #{ordenParaCapture.numero}
                </h4>
                <span className="text-xs text-slate-400">
                  Cliente: {ordenParaCapture.cliente_nombre}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalCaptureUrl(null);
                  setOrdenParaCapture(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-2xl bg-black flex items-center justify-center border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={modalCaptureUrl}
                alt="Capture de pago"
                className="max-w-full max-h-[55vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={modalCaptureUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline"
              >
                Abrir en nueva pestaña
              </a>

              {ordenParaCapture.estado !== "abono_verificado" && ordenParaCapture.estado !== "pagada" && (
                <button
                  type="button"
                  onClick={() => handleVerificarPago(ordenParaCapture.id)}
                  className="px-4 py-2 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar y Verificar Pago</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Guía de Envío */}
      {modalGuiaOrden && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleGuardarGuia}
            className="relative w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-white text-sm">
                Asignar Guía de Despacho — #{modalGuiaOrden.numero}
              </h4>
              <button
                type="button"
                onClick={() => setModalGuiaOrden(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Empresa Courier:
                </label>
                <select
                  value={empresaGuia}
                  onChange={(e) => setEmpresaGuia(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs outline-none focus:border-cyan-400"
                >
                  <option value="Zoom">Zoom</option>
                  <option value="MRW">MRW</option>
                  <option value="Tealca">Tealca</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Número de Guía / Tracking Code:
                </label>
                <input
                  type="text"
                  required
                  value={numeroGuiaInput}
                  onChange={(e) => setNumeroGuiaInput(e.target.value)}
                  placeholder="Ej: ZM-98012345"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalGuiaOrden(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoGuia}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {guardandoGuia ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                <span>Guardar y Marcar Despachado</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Validar PIN de 4 dígitos */}
      {modalPinOrden && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleValidarPin}
            className="relative w-full sm:max-w-sm bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" />
                <h4 className="font-display font-bold text-white text-sm">
                  Validar PIN de Entrega
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalPinOrden(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Solicita al cliente <strong>{modalPinOrden.cliente_nombre}</strong> el código secreto de 4 dígitos para concretar la entrega:
            </p>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                {pinError}
              </div>
            )}

            <div>
              <input
                type="text"
                required
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="4 dígitos (ej: 8492)"
                className="w-full text-center tracking-widest font-display font-black text-2xl py-3 rounded-2xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalPinOrden(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={validandoPin || pinInput.length < 4}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {validandoPin ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Validar y Entregar</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal Comprobante Digital Stitch */}
      {modalReciboOrden && (
        <DigitalReceiptModal
          orden={{
            numero: modalReciboOrden.numero,
            cliente_nombre: modalReciboOrden.cliente_nombre,
            cliente_telefono: modalReciboOrden.cliente_telefono,
            cliente_cedula: (modalReciboOrden as any).cliente_cedula,
            metodo_entrega: modalReciboOrden.metodo_entrega,
            direccion_entrega: modalReciboOrden.direccion_entrega,
            total_usd: parseFloat(String(modalReciboOrden.total_usd || 0)),
            monto_inicial_usd: parseFloat(String(modalReciboOrden.monto_inicial_usd || 0)),
            saldo_restante_usd: parseFloat(String((modalReciboOrden as any).saldo_restante_usd || (modalReciboOrden as any).saldo_pendiente_usd || (parseFloat(String(modalReciboOrden.total_usd || 0)) - parseFloat(String(modalReciboOrden.monto_inicial_usd || 0))))),
            estado: modalReciboOrden.estado,
            created_at: modalReciboOrden.created_at,
            referencia_pago: modalReciboOrden.referencia_pago,
            guia_seguimiento: (modalReciboOrden as any).guia_seguimiento,
          }}
          tasaBcv={tasaBcv}
          onClose={() => setModalReciboOrden(null)}
        />
      )}
    </div>
  );
}
