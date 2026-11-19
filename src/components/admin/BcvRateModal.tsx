"use client";

import React, { useState } from "react";
import { X, TrendingUp, Zap, Save, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BcvRateModalProps {
  tasaActual: number;
  onClose: () => void;
  onSaved: (nuevaTasa: number) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

const PRESETS = [36.5, 40.0, 48.0, 56.0, 64.5, 72.0, 80.0];
const MONTO_EJEMPLO = 35; // USD — precio promedio de producto

export function BcvRateModal({ tasaActual, onClose, onSaved, showToast }: BcvRateModalProps) {
  const [tasa, setTasa] = useState<string>(tasaActual.toFixed(2));
  const [guardando, setGuardando] = useState(false);

  const tasaNum = parseFloat(tasa) || 0;
  const montoVes = tasaNum * MONTO_EJEMPLO;
  const abono50Ves = montoVes / 2;

  async function handleGuardar() {
    if (tasaNum <= 0 || isNaN(tasaNum)) {
      showToast("Ingresa una tasa válida mayor que 0", "error");
      return;
    }
    setGuardando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("configuracion_tienda")
        .update({ tasa_bcv: tasaNum.toFixed(2) })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // update all rows

      if (error) throw error;

      localStorage.setItem("ocumare_tasa_bcv", String(tasaNum));
      onSaved(tasaNum);
      showToast(`✅ Tasa BCV fijada a Bs. ${tasaNum.toFixed(2)} / USD`, "success");
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Error al guardar la tasa BCV", "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm bg-[#0B1320] border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">

        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#064E3B] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#84CC16]" />
            </div>
            <div>
              <span className="font-display font-bold text-sm text-white block">Actualizar Tasa BCV</span>
              <span className="text-[10px] text-slate-500">Simulación en vivo · Guardado en Supabase</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Entrada de tasa manual */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Tasa Bs. por USD
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono font-bold">Bs.</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:outline-none focus:border-[#84CC16] focus:ring-1 focus:ring-[#84CC16]/30 transition-all"
                placeholder="64.50"
              />
            </div>
          </div>

          {/* Presets rápidos */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> Presets Rápidos
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTasa(p.toFixed(2))}
                  className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all ${
                    parseFloat(tasa) === p
                      ? "bg-[#064E3B] text-[#84CC16] border border-[#84CC16]/40"
                      : "bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {p.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Simulación en vivo */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Simulación Live — Producto Ejemplo ${MONTO_EJEMPLO} USD
            </span>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Total en Bs.:</span>
              <span className="font-mono font-black text-white">
                Bs. {montoVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-2">
              <span className="text-[#84CC16] font-semibold">Abono 50% en Bs.:</span>
              <span className="font-mono font-black text-[#84CC16]">
                Bs. {abono50Ves.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Botón guardar */}
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || tasaNum <= 0}
            className="w-full py-3.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] disabled:bg-slate-800 disabled:text-slate-500 text-[#14532D] font-display font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#84CC16]/20 active:scale-95"
          >
            {guardando ? (
              <div className="w-4 h-4 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {guardando ? "Guardando en Supabase..." : `Fijar Bs. ${tasaNum.toFixed(2)} / USD`}
          </button>
        </div>
      </div>
    </div>
  );
}
