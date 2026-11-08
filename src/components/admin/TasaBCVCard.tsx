"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { obtenerTasaBCV, actualizarTasaBCV } from "@/actions/config";
import { formatoVES, formatoUSD } from "@/utils/currency";

interface TasaBCVCardProps {
  onTasaUpdated?: (nuevaTasa: number) => void;
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
}

export function TasaBCVCard({ onTasaUpdated, showToast }: TasaBCVCardProps) {
  const [tasaActual, setTasaActual] = useState<number>(52.5);
  const [tasaInput, setTasaInput] = useState<string>("52.5000");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState<boolean>(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // useTransition para manejo de estado de carga seguro en Next.js 15
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    cargarTasaDesdeServidor();
  }, []);

  async function cargarTasaDesdeServidor() {
    setCargandoInicial(true);
    try {
      const data = await obtenerTasaBCV();
      setTasaActual(data.tasa_bcv);
      setTasaInput(data.tasa_bcv.toFixed(4));
      setUpdatedAt(data.updated_at);
      if (onTasaUpdated) {
        onTasaUpdated(data.tasa_bcv);
      }
    } catch (err) {
      console.error("Error al cargar tasa BCV:", err);
    } finally {
      setCargandoInicial(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensajeExito(null);
    setMensajeError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await actualizarTasaBCV(formData);

      if (res.success && res.tasa) {
        setTasaActual(res.tasa);
        setTasaInput(res.tasa.toFixed(4));
        setUpdatedAt(res.updatedAt || new Date().toISOString());

        // Guardar en almacenamiento local para consistencia inmediata
        localStorage.setItem("ocumare_tasa_bcv", res.tasa.toString());

        if (onTasaUpdated) {
          onTasaUpdated(res.tasa);
        }

        setMensajeExito(`¡Tasa BCV actualizada a Bs. ${res.tasa.toFixed(4)} por USD!`);
        if (showToast) {
          showToast(`Tasa BCV actualizada con éxito a Bs. ${res.tasa.toFixed(4)}`, "success");
        }

        setTimeout(() => setMensajeExito(null), 5000);
      } else {
        const errorText = res.error || "No se pudo actualizar la tasa.";
        setMensajeError(errorText);
        if (showToast) {
          showToast(errorText, "error");
        }
      }
    });
  }

  const previewNum = parseFloat(tasaInput) || tasaActual || 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur transition-all duration-200">
      {/* Encabezado Principal */}
      <div className="p-6 border-b border-slate-800/80 bg-gradient-to-r from-blue-950/40 via-slate-900 to-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shadow-md shadow-emerald-500/10">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Tasa Oficial BCV del Sistema
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                Bimoneda Activa
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control centralizado en Supabase: todos los precios en Bolívares se calculan con este valor
            </p>
          </div>
        </div>

        {/* Tasa Actual Destacada */}
        <div className="text-left sm:text-right bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-xl">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Valor Vigente en Tienda
          </span>
          <div className="flex items-baseline gap-1.5 sm:justify-end">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              Bs. {cargandoInicial ? "..." : tasaActual.toFixed(4)}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ USD</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 sm:justify-end">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>
              {updatedAt
                ? `Actualizado: ${new Date(updatedAt).toLocaleString("es-VE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Sin registro previo"}
            </span>
          </div>
        </div>
      </div>

      {/* Cuerpo: Formulario y Simulador */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Formulario Server Action */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="tasa_bcv_input"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
              >
                Nueva Tasa Oficial BCV (VES por 1 USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 text-sm font-bold font-mono">
                  Bs.
                </span>
                <input
                  id="tasa_bcv_input"
                  name="tasa_bcv"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  disabled={isPending}
                  value={tasaInput}
                  onChange={(e) => setTasaInput(e.target.value)}
                  placeholder="Ej. 52.4500"
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />
                <span>
                  Soporta hasta 4 decimales para máxima exactitud contable según el BCV.
                </span>
              </p>
            </div>

            {/* Alertas de Feedback */}
            {mensajeExito && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{mensajeExito}</span>
              </div>
            )}

            {mensajeError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{mensajeError}</span>
              </div>
            )}

            {/* Botón de Envío */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Actualizando en Supabase...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Nueva Tasa BCV</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={cargarTasaDesdeServidor}
                disabled={isPending || cargandoInicial}
                className="p-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
                title="Volver a consultar desde Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${cargandoInicial ? "animate-spin" : ""}`} />
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Simulador de Conversión en Tiempo Real */}
        <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Calculator className="w-4 h-4" />
            <span>Simulador de Precios al Cambio</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-300 font-medium">$1.00 USD</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatoVES(1 * previewNum)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-300 font-medium">$10.00 USD</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatoVES(10 * previewNum)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
              <div>
                <span className="text-slate-300 font-medium block">$50.00 USD</span>
                <span className="text-[10px] text-amber-400">Abono 50%: $25.00</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-emerald-400 font-bold block">
                  {formatoVES(50 * previewNum)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Abono: {formatoVES(25 * previewNum)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-300 font-medium">$100.00 USD</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatoVES(100 * previewNum)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span>Fórmula: USD &times; Tasa BCV</span>
            <span>Redondeo: 2 dec.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
