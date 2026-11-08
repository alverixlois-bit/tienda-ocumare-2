"use client";

import React, { useState, useEffect } from "react";
import { Percent, Save, RefreshCw, Store, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TasaBCVCard } from "./TasaBCVCard";

interface StoreSettingsProps {
  onTasaUpdated?: (nuevaTasa: number) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function StoreSettingsTab({ onTasaUpdated, showToast }: StoreSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de configuración de la tienda
  const [tiendaId, setTiendaId] = useState<string>("");
  const [nombre, setNombre] = useState<string>("Mi Tienda Virtual");
  const [telefono, setTelefono] = useState<string>("+58 412 1234567");
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

      const savedOfertas = localStorage.getItem("ocumare_modo_ofertas");
      if (savedOfertas !== null) {
        setModoOfertas(savedOfertas === "true");
      }

      // Intentar cargar datos de tiendas si existen
      const { data: tiendaData } = await supabase
        .from("tiendas")
        .select("*")
        .eq("id", defaultTiendaId)
        .maybeSingle();

      if (tiendaData) {
        if (tiendaData.nombre) setNombre(tiendaData.nombre);
        if (tiendaData.telefono) setTelefono(tiendaData.telefono);
        if (typeof tiendaData.modo_ofertas === "boolean") setModoOfertas(tiendaData.modo_ofertas);
        if (typeof tiendaData.permite_abono === "boolean") setPermiteAbono(tiendaData.permite_abono);
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    } finally {
      setLoading(false);
    }
  }

  async function guardarAjustesComerciales(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      localStorage.setItem("ocumare_modo_ofertas", String(modoOfertas));

      await supabase
        .from("tiendas")
        .update({
          nombre,
          telefono,
          modo_ofertas: modoOfertas,
          permite_abono: permiteAbono,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tiendaId);

      showToast("Ajustes de tienda guardados con éxito", "success");
    } catch (err) {
      console.warn("Aviso guardando en tiendas:", err);
      showToast("Configuración guardada en la sesión actual", "success");
    } finally {
      setSaving(false);
    }
  }

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
      {/* 1. MÓDULO PRINCIPAL: Tarjeta de Gestión y Actualización Diaria Tasa BCV */}
      <TasaBCVCard onTasaUpdated={onTasaUpdated} showToast={showToast} />

      {/* 2. MÓDULO COMPLEMENTARIO: Ajustes Comerciales y de Atención */}
      <form onSubmit={guardarAjustesComerciales} className="space-y-6">
        {/* Modalidades de Venta */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Modalidades de Venta y Promociones</h2>
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

        {/* Datos de Contacto de la Tienda */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Datos de Contacto del Vendedor</h2>
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

          <div className="flex justify-end pt-5">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Guardar Datos de Tienda</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
