"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Users,
  FileText,
  Calendar,
  X,
  CreditCard,
  Building,
  Coins,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { registrarMovimientoCajaAction, actualizarPresenciaAdminAction } from "@/actions/orders";

interface MovimientoItem {
  id: string;
  tipo: "ingreso" | "egreso";
  monto_usd: number;
  monto_ves: number;
  metodo_pago: string;
  concepto: string;
  categoria: string;
  orden_id?: string | null;
  created_at: string;
}

interface PersonalItem {
  id: string;
  alias: string;
  nombre: string;
  rol: string;
  en_linea: boolean;
  estado_laboral: "En Línea" | "En Almacén" | "En Ruta de Entrega";
}

const DEFAULT_PERSONAL: PersonalItem[] = [
  { id: "1", alias: "@carlos_ventas", nombre: "Carlos Mendoza", rol: "Ventas y Atención P2P", en_linea: true, estado_laboral: "En Línea" },
  { id: "2", alias: "@roberto_despacho", nombre: "Roberto Silva", rol: "Despacho & Validación PIN", en_linea: true, estado_laboral: "En Ruta de Entrega" },
  { id: "3", alias: "@mariana_finanzas", nombre: "Mariana Rojas", rol: "Caja POS & Conciliación", en_linea: false, estado_laboral: "En Almacén" },
];

interface PosFinancesTabProps {
  tasaBcv: number;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function PosFinancesTab({ tasaBcv, showToast }: PosFinancesTabProps) {
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoGrafico, setPeriodoGrafico] = useState<"diario" | "semanal" | "mensual">("semanal");

  // Formulario Caja POS
  const [tipoMov, setTipoMov] = useState<"ingreso" | "egreso">("ingreso");
  const [montoUsd, setMontoUsd] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("pago_movil");
  const [categoria, setCategoria] = useState<string>("venta_mostrador");
  const [concepto, setConcepto] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);

  // Modal Recibo PDF
  const [modalReciboOpen, setModalReciboOpen] = useState<boolean>(false);
  const [reciboCliente, setReciboCliente] = useState<string>("Cliente General");
  const [reciboCedula, setReciboCedula] = useState<string>("V-00000000");
  const [reciboConcepto, setReciboConcepto] = useState<string>("Venta Mostrador Boutique");
  const [reciboMontoUsd, setReciboMontoUsd] = useState<string>("35.00");

  const [personal, setPersonal] = useState<PersonalItem[]>(DEFAULT_PERSONAL);

  const supabase = createClient();

  useEffect(() => {
    cargarMovimientos();
  }, []);

  async function cargarMovimientos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finanzas_movimientos")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const mapped: MovimientoItem[] = data.map((d: any) => ({
          id: d.id,
          tipo: d.tipo,
          monto_usd: parseFloat(d.monto_usd) || 0,
          monto_ves: parseFloat(d.monto_ves) || 0,
          metodo_pago: d.metodo_pago || "efectivo",
          concepto: d.concepto,
          categoria: d.categoria || "general",
          orden_id: d.orden_id,
          created_at: d.created_at,
        }));
        setMovimientos(mapped);
      } else {
        // Datos de muestra iniciales si no hay en la tabla
        setMovimientos([
          { id: "m-1", tipo: "ingreso", monto_usd: 75.0, monto_ves: 75.0 * tasaBcv, metodo_pago: "pago_movil", concepto: "Abono 50% Orden #PED-88123412", categoria: "abono", created_at: new Date().toISOString() },
          { id: "m-2", tipo: "ingreso", monto_usd: 38.0, monto_ves: 38.0 * tasaBcv, metodo_pago: "efectivo", concepto: "Venta Presencial Sneaker Forum Low", categoria: "venta_mostrador", created_at: new Date().toISOString() },
          { id: "m-3", tipo: "egreso", monto_usd: 25.0, monto_ves: 25.0 * tasaBcv, metodo_pago: "pago_movil", concepto: "Flete Consolidado Agencia Zoom", categoria: "despacho", created_at: new Date().toISOString() },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistrarCaja(e: React.FormEvent) {
    e.preventDefault();
    const valUsd = parseFloat(montoUsd);
    if (isNaN(valUsd) || valUsd <= 0 || !concepto.trim()) {
      showToast("Ingresa un monto válido y un concepto.", "error");
      return;
    }

    setGuardando(true);
    const valVes = valUsd * tasaBcv;

    try {
      const res = await registrarMovimientoCajaAction({
        tipo: tipoMov,
        montoUsd: valUsd,
        montoVes: valVes,
        metodoPago,
        concepto: concepto.trim(),
        categoria,
        creadoPor: "@caja_admin",
      });

      if (res.success) {
        showToast("Movimiento de caja registrado con éxito", "success");
        setMontoUsd("");
        setConcepto("");
        cargarMovimientos();
      } else {
        showToast(res.error || "Error al registrar", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al registrar movimiento", "error");
    } finally {
      setGuardando(false);
    }
  }

  function handleImprimirRecibo() {
    window.print();
  }

  // Cálculos P&L
  const totalIngresosUsd = movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((acc, m) => acc + m.monto_usd, 0);

  const totalEgresosUsd = movimientos
    .filter((m) => m.tipo === "egreso")
    .reduce((acc, m) => acc + m.monto_usd, 0);

  const utilidadNetaUsd = totalIngresosUsd - totalEgresosUsd;

  return (
    <div className="space-y-6">
      
      {/* 1. Resumen P&L (Profit & Loss) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ingresos Totales (P&amp;L)
            </span>
            <span className="font-display font-black text-2xl text-emerald-400 mt-1 block">
              {formatoUSD(totalIngresosUsd)}
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold block mt-0.5">
              {formatoVES(totalIngresosUsd * tasaBcv)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Egresos / Gastos
            </span>
            <span className="font-display font-black text-2xl text-red-400 mt-1 block">
              {formatoUSD(totalEgresosUsd)}
            </span>
            <span className="text-[11px] text-red-500 font-semibold block mt-0.5">
              {formatoVES(totalEgresosUsd * tasaBcv)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-bold">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Utilidad Operativa Neta
            </span>
            <span className="font-display font-black text-2xl text-[#84CC16] mt-1 block">
              {formatoUSD(utilidadNetaUsd)}
            </span>
            <span className="text-[11px] text-[#84CC16]/80 font-semibold block mt-0.5">
              {formatoVES(utilidadNetaUsd * tasaBcv)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#064E3B] text-[#84CC16] border border-[#0D6E53] flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Grid Caja POS y Emisión de Recibo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Registro Rápido de Caja POS */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#84CC16] text-[#14532D] flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-sm">
                  Caja POS — Registro Rápido
                </h3>
                <span className="text-[11px] text-slate-400">
                  Registra ingresos por venta presencial o egresos operativos
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalReciboOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#84CC16] font-display font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Emitir Recibo PDF</span>
            </button>
          </div>

          <form onSubmit={handleRegistrarCaja} className="space-y-3 text-xs">
            {/* Tipo de movimiento */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoMov("ingreso")}
                className={`py-2 px-3 rounded-xl font-display font-bold transition-all ${
                  tipoMov === "ingreso"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                + Entrada / Ingreso
              </button>
              <button
                type="button"
                onClick={() => setTipoMov("egreso")}
                className={`py-2 px-3 rounded-xl font-display font-bold transition-all ${
                  tipoMov === "egreso"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                - Salida / Egreso
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Monto en Dólares ($ USD):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoUsd}
                  onChange={(e) => setMontoUsd(e.target.value)}
                  placeholder="Ej: 35.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Método de Pago:
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                >
                  <option value="pago_movil">Pago Móvil (VES)</option>
                  <option value="efectivo">Efectivo USD (Divisas)</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="binance">Binance Pay (USDT)</option>
                  <option value="zelle">Zelle</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Categoría:
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                >
                  <option value="venta_mostrador">Venta Mostrador / Local</option>
                  <option value="abono">Abono de Encargo</option>
                  <option value="despacho">Flete / Courier Despacho</option>
                  <option value="compra_stock">Compra de Inventario</option>
                  <option value="gasto_operativo">Gasto Operativo</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Equivalente Oficial (BCV):
                </label>
                <div className="px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-amber-400 font-mono font-bold">
                  {formatoVES((parseFloat(montoUsd) || 0) * tasaBcv)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Concepto / Descripción del Movimiento:
              </label>
              <input
                type="text"
                required
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Cobro en efectivo de saldo restante zapatillas Nike AF1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full py-3 px-4 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Registrar Movimiento en Caja</span>
            </button>
          </form>
        </div>

        {/* Gráfico Dinámico & Presencia del Personal */}
        <div className="lg:col-span-6 space-y-6">
          {/* Gráfico Dinámico Simulado */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-white text-sm">
                Desglose Operativo P&amp;L
              </h3>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPeriodoGrafico("diario")}
                  className={`px-2.5 py-1 rounded-lg ${periodoGrafico === "diario" ? "bg-slate-800 text-white font-bold" : "text-slate-400"}`}
                >
                  Día
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodoGrafico("semanal")}
                  className={`px-2.5 py-1 rounded-lg ${periodoGrafico === "semanal" ? "bg-slate-800 text-white font-bold" : "text-slate-400"}`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodoGrafico("mensual")}
                  className={`px-2.5 py-1 rounded-lg ${periodoGrafico === "mensual" ? "bg-slate-800 text-white font-bold" : "text-slate-400"}`}
                >
                  Mes
                </button>
              </div>
            </div>

            {/* Barras dinámicas */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Ingresos por Ventas / Encargos</span>
                  <span className="font-bold text-emerald-400">{formatoUSD(totalIngresosUsd)}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Egresos por Despacho &amp; Fletes</span>
                  <span className="font-bold text-red-400">{formatoUSD(totalEgresosUsd)}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: "25%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Directorio de Presencia del Personal Stitch */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="font-display font-bold text-white text-sm">
                Directorio y Presencia del Personal
              </h3>
            </div>

            <div className="space-y-2">
              {personal.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${p.en_linea ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                    <div>
                      <span className="font-bold text-white block">{p.nombre}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{p.alias} &bull; {p.rol}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                    {p.estado_laboral}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tabla de Movimientos de Caja */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-white text-sm">
          Historial de Movimientos de Caja POS
        </h3>

        {/* Vista Móvil: Lista de Movimientos (< md) */}
        <div className="md:hidden space-y-2.5">
          {movimientos.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No hay movimientos registrados en la caja.
            </div>
          ) : (
            movimientos.map((m) => (
              <div
                key={`mov-card-${m.id}`}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-white block truncate">
                      {m.concepto}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {new Date(m.created_at).toLocaleString("es-VE")} &bull; {m.metodo_pago}
                    </span>
                  </div>

                  <span
                    className={`font-mono font-bold text-sm shrink-0 ${
                      m.tipo === "ingreso" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {m.tipo === "ingreso" ? "+" : "-"}{formatoUSD(m.monto_usd)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      m.tipo === "ingreso"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {m.tipo} &bull; {m.categoria}
                  </span>

                  <span className="text-slate-400 font-mono">
                    {formatoVES(m.monto_ves)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Desktop: Tabla (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Concepto</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Método</th>
                <th className="py-3 px-3 text-right">Monto USD / VES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hay movimientos registrados en la caja.
                  </td>
                </tr>
              ) : (
                movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(m.created_at).toLocaleString("es-VE")}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          m.tipo === "ingreso"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {m.concepto}
                    </td>
                    <td className="py-3 px-3 text-slate-400 uppercase text-[10px] font-mono">
                      {m.categoria}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                      {m.metodo_pago}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-mono font-bold block ${
                          m.tipo === "ingreso" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {m.tipo === "ingreso" ? "+" : "-"}{formatoUSD(m.monto_usd)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {formatoVES(m.monto_ves)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Recibo de Venta Oficial (Imprimible / PDF) */}
      {modalReciboOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full sm:max-w-md bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 font-mono text-xs max-h-[90dvh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-3 not-printable">
              <span className="font-display font-extrabold text-sm text-[#064E3B]">
                Recibo de Venta Oficial
              </span>
              <button
                type="button"
                onClick={() => setModalReciboOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recibo Formateado */}
            <div className="border border-dashed border-slate-300 p-5 rounded-2xl space-y-3 bg-stone-50">
              <div className="text-center space-y-1">
                <h4 className="font-display font-black text-base text-[#064E3B]">
                  ENCARGOS BOUTIQUE C.A.
                </h4>
                <p className="text-[10px] text-slate-500">
                  RIF: J-50123984-1 &bull; Ocumare del Tuy, Miranda
                </p>
                <p className="text-[10px] text-slate-500">
                  Comprobante de Venta N° REC-{Date.now().toString().slice(-6)}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Fecha:</span>
                  <span>{new Date().toLocaleString("es-VE")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span>{reciboCliente}</span>
                </div>
                <div className="flex justify-between">
                  <span>C.I./RIF:</span>
                  <span>{reciboCedula}</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Descripción</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="truncate max-w-[200px]">{reciboConcepto}</span>
                  <span>{formatoUSD(reciboMontoUsd)}</span>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex justify-between font-bold text-sm text-[#064E3B]">
                  <span>TOTAL USD:</span>
                  <span>{formatoUSD(reciboMontoUsd)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-amber-700 font-bold">
                  <span>TOTAL VES (BCV {tasaBcv.toFixed(2)}):</span>
                  <span>{formatoVES(parseFloat(reciboMontoUsd || "0") * tasaBcv)}</span>
                </div>
              </div>

              <p className="text-[9px] text-center text-slate-400 pt-2">
                ¡Gracias por su compra en Encargos Boutique!
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 not-printable">
              <button
                type="button"
                onClick={() => setModalReciboOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleImprimirRecibo}
                className="px-4 py-2 rounded-xl bg-[#064E3B] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Guardar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
