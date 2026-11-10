"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Percent,
  Save,
  RefreshCw,
  Store,
  Phone,
  Share2,
  MessageCircle,
  ExternalLink,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TasaBCVCard } from "./TasaBCVCard";
import {
  obtenerConfiguracionTienda,
  actualizarRedesYContactos,
  ConfiguracionTiendaData,
} from "@/actions/config";

interface StoreSettingsProps {
  onTasaUpdated?: (nuevaTasa: number) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function StoreSettingsTab({ onTasaUpdated, showToast }: StoreSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [savingComercial, setSavingComercial] = useState(false);
  const [isPendingContactos, startTransitionContactos] = useTransition();

  // Estados de configuración comercial
  const [tiendaId, setTiendaId] = useState<string>("");
  const [nombre, setNombre] = useState<string>("OcumareHub");
  const [telefono, setTelefono] = useState<string>("+58 412 1234567");
  const [modoOfertas, setModoOfertas] = useState<boolean>(false);
  const [permiteAbono, setPermiteAbono] = useState<boolean>(true);

  // Estados de redes sociales
  const [instagramUrl, setInstagramUrl] = useState<string>("");
  const [tiktokUrl, setTiktokUrl] = useState<string>("");
  const [facebookUrl, setFacebookUrl] = useState<string>("");

  // Estados de los 3 WhatsApp de vendedores
  const [whatsapp1, setWhatsapp1] = useState<string>("");
  const [whatsapp1Nombre, setWhatsapp1Nombre] = useState<string>("Ventas 1 (Principal)");
  const [whatsapp2, setWhatsapp2] = useState<string>("");
  const [whatsapp2Nombre, setWhatsapp2Nombre] = useState<string>("Ventas 2 (Soporte)");
  const [whatsapp3, setWhatsapp3] = useState<string>("");
  const [whatsapp3Nombre, setWhatsapp3Nombre] = useState<string>("Ventas 3 (Despachos)");

  const supabase = createClient();

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  async function cargarConfiguracion() {
    setLoading(true);
    try {
      const defaultTiendaId =
        process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";
      setTiendaId(defaultTiendaId);

      const savedOfertas = localStorage.getItem("ocumare_modo_ofertas");
      if (savedOfertas !== null) {
        setModoOfertas(savedOfertas === "true");
      }

      // 1. Cargar redes y WhatsApp desde configuracion_tienda
      const config = await obtenerConfiguracionTienda();
      if (config) {
        setInstagramUrl(config.instagram_url || "");
        setTiktokUrl(config.tiktok_url || "");
        setFacebookUrl(config.facebook_url || "");
        setWhatsapp1(config.whatsapp_1 || "+584120000001");
        setWhatsapp1Nombre(config.whatsapp_1_nombre || "Ventas 1 (Principal)");
        setWhatsapp2(config.whatsapp_2 || "+584140000002");
        setWhatsapp2Nombre(config.whatsapp_2_nombre || "Ventas 2 (Soporte)");
        setWhatsapp3(config.whatsapp_3 || "+584160000003");
        setWhatsapp3Nombre(config.whatsapp_3_nombre || "Ventas 3 (Despachos)");
      }

      // 2. Cargar datos generales de la tienda
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
    setSavingComercial(true);

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

      showToast("Ajustes comerciales actualizados con éxito", "success");
    } catch (err) {
      console.warn("Aviso guardando en tiendas:", err);
      showToast("Configuración guardada en la sesión actual", "success");
    } finally {
      setSavingComercial(false);
    }
  }

  function handleGuardarContactosYRedes(e: React.FormEvent) {
    e.preventDefault();

    startTransitionContactos(async () => {
      const formData = new FormData();
      formData.append("instagram_url", instagramUrl);
      formData.append("tiktok_url", tiktokUrl);
      formData.append("facebook_url", facebookUrl);

      formData.append("whatsapp_1", whatsapp1);
      formData.append("whatsapp_1_nombre", whatsapp1Nombre);

      formData.append("whatsapp_2", whatsapp2);
      formData.append("whatsapp_2_nombre", whatsapp2Nombre);

      formData.append("whatsapp_3", whatsapp3);
      formData.append("whatsapp_3_nombre", whatsapp3Nombre);

      const res = await actualizarRedesYContactos(formData);
      if (res.success) {
        showToast("Canales de Redes y WhatsApp guardados con éxito", "success");
      } else {
        showToast(res.error || "Error al guardar canales de contacto", "error");
      }
    });
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

      {/* 2. CANALES DE WHATSAPP PARA REPORTES DE PAGO Y ATENCIÓN */}
      <form
        onSubmit={handleGuardarContactosYRedes}
        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                3 Canales de WhatsApp de Vendedores
              </h2>
              <p className="text-xs text-slate-400">
                Líneas disponibles para que los compradores reporten su pago o hagan consultas directas.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vendedor 1 */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Vendedor 1 (Principal)</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Nombre / Área
              </label>
              <input
                type="text"
                value={whatsapp1Nombre}
                onChange={(e) => setWhatsapp1Nombre(e.target.value)}
                placeholder="Ej. Ventas Ocumare"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Número con código de país
              </label>
              <input
                type="text"
                value={whatsapp1}
                onChange={(e) => setWhatsapp1(e.target.value)}
                placeholder="+584121234567"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Vendedor 2 */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Vendedor 2 (Soporte)</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Nombre / Área
              </label>
              <input
                type="text"
                value={whatsapp2Nombre}
                onChange={(e) => setWhatsapp2Nombre(e.target.value)}
                placeholder="Ej. Atención al Cliente"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Número con código de país
              </label>
              <input
                type="text"
                value={whatsapp2}
                onChange={(e) => setWhatsapp2(e.target.value)}
                placeholder="+584147654321"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Vendedor 3 */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Vendedor 3 (Despachos)</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Nombre / Área
              </label>
              <input
                type="text"
                value={whatsapp3Nombre}
                onChange={(e) => setWhatsapp3Nombre(e.target.value)}
                placeholder="Ej. Envíos Zoom/MRW"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Número con código de país
              </label>
              <input
                type="text"
                value={whatsapp3}
                onChange={(e) => setWhatsapp3(e.target.value)}
                placeholder="+584169876543"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* REDES SOCIALES */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-pink-400" />
            <h3 className="text-sm font-semibold text-white">Enlaces de Redes Sociales</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/tutienda"
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                TikTok URL
              </label>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/@tutienda"
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Facebook URL
              </label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/tutienda"
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPendingContactos}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isPendingContactos ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Guardar WhatsApp y Redes Sociales</span>
          </button>
        </div>
      </form>

      {/* 3. MÓDULO COMPLEMENTARIO: Ajustes Comerciales y de Atención */}
      <form onSubmit={guardarAjustesComerciales} className="space-y-6">
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

        {/* Datos Generales */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Datos de Identidad de la Tienda</h2>
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
                Teléfono de Oficina
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
              disabled={savingComercial}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {savingComercial ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Guardar Datos Generales</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
