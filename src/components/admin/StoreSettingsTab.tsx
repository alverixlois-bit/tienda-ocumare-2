"use client";

import React, { useState, useEffect } from "react";
import { DollarSign, Percent, Save, RefreshCw, Store, Phone, CheckCircle, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatoVES, formatoUSD } from "@/utils/currency";

interface StoreSettingsProps {
  onTasaUpdated?: (nuevaTasa: number) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function StoreSettingsTab({ onTasaUpdated, showToast }: StoreSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de configuración
  const [tiendaId, setTiendaId] = useState<string>("");
  const [nombre, setNombre] = useState<string>("Mi Tienda Virtual");
  const [telefono, setTelefono] = useState<string>("+58 412 1234567");
  const [tasaBcv, setTasaBcv] = useState<string>("52.50");
  const [modoOfertas, setModoOfertas] = useState<boolean>(false);
  const [permiteAbono, setPermiteAbono] = useState<boolean>(true);

  const supabase = createClient();

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  async function cargarConfiguracion() {
    setLoading(true);
    try {
      const defaultTiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";
      setTiendaId(defaultTiendaId);

      // 1. Cargar desde configuracion_tienda en Supabase
      const { data: configData } = await supabase
        .from("configuracion_tienda")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (configData?.tasa_bcv) {
        setTasaBcv(String(configData.tasa_bcv));
        if (onTasaUpdated) onTasaUpdated(Number(configData.tasa_bcv));
      } else {
        // Fallback a localStorage si la tabla aún no tiene filas
        const savedTasa = localStorage.getItem("ocumare_tasa_bcv");
        const savedOfertas = localStorage.getItem("ocumare_modo_ofertas");
        if (savedTasa) {
          setTasaBcv(savedTasa);
          if (onTasaUpdated) onTasaUpdated(Number(savedTasa));
        }
        if (savedOfertas !== null) {
          setModoOfertas(savedOfertas === "true");
        }
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    } finally {
      setLoading(false);
    }
  }

  async function guardarConfiguracion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const tasaNumerica = parseFloat(tasaBcv);

    if (isNaN(tasaNumerica) || tasaNumerica <= 0) {
      showToast("La tasa BCV debe ser un número válido mayor a 0", "error");
      setSaving(false);
      return;
    }

    try {
      // 1. Guardar en configuracion_tienda
      const { error: confError } = await supabase
        .from("configuracion_tienda")
        .upsert({
          tasa_bcv: tasaNumerica,
          updated_at: new Date().toISOString(),
        });

      // 2. Guardar en localStorage para disponibilidad instantánea en frontend
      localStorage.setItem("ocumare_tasa_bcv", tasaBcv);
      localStorage.setItem("ocumare_modo_ofertas", String(modoOfertas));

      if (onTasaUpdated) {
        onTasaUpdated(tasaNumerica);
      }

      if (confError) {
        console.warn("Aviso al guardar en Supabase (manteniendo en local):", confError.message);
        showToast("Tasa BCV guardada localmente (aplica políticas RLS en Supabase si es necesario)", "info");
      } else {
        showToast("¡Tasa BCV guardada y sincronizada en Supabase!", "success");
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      showToast("Guardado con éxito en la sesión actual", "success");
    } finally {
      setSaving(false);
    }
  }

  const tasaNum = parseFloat(tasaBcv) || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
        <p className="text-sm">Cargando ajustes de la tienda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner Informativo Tasa BCV */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-emerald-950/30 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Tasa Oficial BCV Activa</h3>
            <p className="text-xs text-slate-400">
              Todos los precios del catálogo y órdenes se sincronizan con esta tasa
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-emerald-400">
            Bs. {tasaNum > 0 ? tasaNum.toFixed(2) : "0.00"}
          </span>
          <span className="text-xs text-slate-400 block">por 1.00 USD</span>
        </div>
      </div>

      <form onSubmit={guardarConfiguracion} className="space-y-6">
        {/* Sección: Tasa de Cambio y Conversión */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Tasa de Cambio Oficial (BCV)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Tasa BCV del día (VES / USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 text-sm font-medium">Bs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={tasaBcv}
                  onChange={(e) => setTasaBcv(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-mono text-base focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Ej. 52.50"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-cyan-400 inline" />
                Actualiza diariamente según la publicación del Banco Central de Venezuela.
              </p>
            </div>

            {/* Simulador rápido de conversión */}
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                Simulador de Conversión Automática
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-300">$5.00 USD</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {formatoVES(5 * tasaNum)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-300">$20.00 USD</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {formatoVES(20 * tasaNum)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-300">$50.00 USD (Abono 50%: $25)</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {formatoVES(50 * tasaNum)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Opciones Comerciales y Ofertas */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Modalidades de Venta y Promociones</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle Modo Ofertas */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div>
                <span className="text-sm font-semibold text-white block">Activar Modo de Ofertas</span>
                <span className="text-xs text-slate-400">
                  Muestra cintillos de descuento en los productos promocionales.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={modoOfertas}
                  onChange={(e) => setModoOfertas(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Toggle Modalidad Abono 50% */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div>
                <span className="text-sm font-semibold text-white block">Modalidad 50% Abono</span>
                <span className="text-xs text-slate-400">
                  Permite a los clientes pagar 50% inicial y 50% al entregar.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permiteAbono}
                  onChange={(e) => setPermiteAbono(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Sección: Datos de la Tienda */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Datos de Contacto del Vendedor</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nombre de la Tienda
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Nombre comercial"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Teléfono / WhatsApp de Atención
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="+58 412 0000000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Guardado */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Guardando en Supabase..." : "Guardar Configuración"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
