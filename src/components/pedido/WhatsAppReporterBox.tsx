"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Send, CheckCircle, ExternalLink, ShieldCheck, UserCheck } from "lucide-react";
import { OrdenRow } from "@/types/database.types";
import { obtenerConfiguracionTienda, ConfiguracionTiendaData } from "@/actions/config";
import { formatoUSD, formatoVES } from "@/utils/currency";

interface WhatsAppReporterBoxProps {
  orden: OrdenRow;
  montoAbonoUsd: string | number;
  montoAbonoVes: string | number;
  tasaBcv: string | number;
}

export function WhatsAppReporterBox({
  orden,
  montoAbonoUsd,
  montoAbonoVes,
  tasaBcv,
}: WhatsAppReporterBoxProps) {
  const [config, setConfig] = useState<ConfiguracionTiendaData | null>(null);
  const [selectedVendorIndex, setSelectedVendorIndex] = useState<number>(1);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await obtenerConfiguracionTienda();
        setConfig(data);
      } catch (err) {
        console.error("Error al cargar contactos WhatsApp:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    fetchConfig();
  }, []);

  const vendors = [
    {
      id: 1,
      nombre: config?.whatsapp_1_nombre || "Ventas 1 (Principal)",
      telefono: config?.whatsapp_1 || "+584120000001",
      badge: "Recomendado",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    },
    {
      id: 2,
      nombre: config?.whatsapp_2_nombre || "Ventas 2 (Soporte)",
      telefono: config?.whatsapp_2 || "+584140000002",
      badge: "Soporte",
      color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    },
    {
      id: 3,
      nombre: config?.whatsapp_3_nombre || "Ventas 3 (Despachos)",
      telefono: config?.whatsapp_3 || "+584160000003",
      badge: "Envíos",
      color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    },
  ];

  const selectedVendor = vendors.find((v) => v.id === selectedVendorIndex) || vendors[0];

  function handleSendWhatsApp() {
    if (!selectedVendor.telefono) return;

    // Normalizar número telefónico eliminando espacios, guiones y signos
    const phoneClean = selectedVendor.telefono.replace(/[^0-9]/g, "");

    const trackingUrl = typeof window !== "undefined" ? window.location.href : "";
    const numeroOrden = orden.numero || orden.id.slice(0, 8).toUpperCase();

    const mensaje = `¡Hola ${selectedVendor.nombre}! 👋
Vengo de OcumareHub para reportar el pago de mi pedido por encargo:

📦 *Pedido:* #${numeroOrden}
👤 *Cliente:* ${orden.cliente_nombre || "Cliente"}
📱 *Teléfono:* ${orden.cliente_telefono || "No especificado"}
🚚 *Envío:* ${orden.metodo_entrega?.toUpperCase() || orden.direccion_entrega || "A convenir"}
💵 *Monto Abono 50%:* ${formatoUSD(montoAbonoUsd)} / ${formatoVES(montoAbonoVes)}
📊 *Tasa BCV:* Bs. ${parseFloat(String(tasaBcv)).toFixed(2)}

🔗 *Enlace de mi orden:* ${trackingUrl}

Adjunto el capture de la transferencia / pago móvil para su verificación. ¡Muchas gracias!`;

    const encoded = encodeURIComponent(mensaje);
    const url = `https://wa.me/${phoneClean}?text=${encoded}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 backdrop-blur shadow-xl space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white">
            Notificar Abono Directo por WhatsApp
          </h3>
          <p className="text-xs text-slate-400">
            Elige a cuál de los 3 vendedores autorizados deseas enviar el reporte o comprobante:
          </p>
        </div>
      </div>

      {/* Selector de los 3 vendedores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {vendors.map((vendor) => {
          const isSelected = selectedVendorIndex === vendor.id;
          return (
            <button
              key={vendor.id}
              type="button"
              onClick={() => setSelectedVendorIndex(vendor.id)}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {vendor.nombre}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${vendor.color}`}>
                  {vendor.badge}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 block truncate">
                {vendor.telefono}
              </span>
              {isSelected && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Seleccionado</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Botón de envío directo */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Mensaje precargado con tu número de orden y monto exacto en Bs.</span>
        </div>

        <button
          type="button"
          onClick={handleSendWhatsApp}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
        >
          <Send className="w-4 h-4" />
          <span>Enviar Reporte a {selectedVendor.nombre}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>
    </div>
  );
}
