"use client";

import React, { useState } from "react";
import { X, Share2, Copy, Check, Sparkles } from "lucide-react";
import { ProductoRow } from "@/types/database.types";
import { formatoUSD, formatoVES, sanitizarNumero } from "@/utils/currency";

interface SocialStoryModalProps {
  producto: ProductoRow;
  tasaBcv: number;
  onClose: () => void;
}

export function SocialStoryModal({ producto, tasaBcv, onClose }: SocialStoryModalProps) {
  const [copiado, setCopiado] = useState(false);

  const precioUsd = sanitizarNumero(producto.precio_usd || producto.precio_base || 0);
  const abonoUsd = precioUsd / 2;
  const precioVes = precioUsd * tasaBcv;
  const abonoVes = abonoUsd * tasaBcv;

  const promoMsg = `✨ *¡DISPONIBLE POR ENCARGO!* ✨\n\n` +
    `👟 *${producto.titulo || producto.nombre}*\n\n` +
    `💵 *Precio Total:* ${formatoUSD(precioUsd)} (${formatoVES(precioVes)})\n` +
    `🔥 *Abona solo el 50%:* ${formatoUSD(abonoUsd)} (${formatoVES(abonoVes)})\n` +
    `🚚 Envíos a toda Venezuela (Zoom, MRW, Tealca) o Entrega Personal Segura.\n` +
    `🏦 Tasa Oficial BCV: Bs. ${tasaBcv.toFixed(2)}\n\n` +
    `👉 ¡Pide el tuyo antes de que se agoten los cupos!\n` +
    `Escríbenos directamente o entra en nuestra vitrina online.`;

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(promoMsg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleShareWhatsAppStatus = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(promoMsg)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full sm:max-w-[360px] bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col my-0 sm:my-auto max-h-[92dvh] overflow-y-auto">
        {/* Encabezado */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[#84CC16] text-sm">📸</span>
            <span className="font-display font-bold text-xs text-white">
              Vitrina 9:16 (Historia IG / WhatsApp)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tarjeta Visual de Historia (Aspect Ratio 9:16 / 4:5 móvil) */}
        <div className="p-3 bg-gradient-to-b from-slate-950 via-slate-900 to-[#064E3B]/80">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-slate-950 border-2 border-[#84CC16]/40 shadow-xl">
            {producto.imagen_url ? (
              <img
                src={producto.imagen_url}
                alt={producto.titulo || producto.nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 font-medium text-xs">
                Sin Imagen
              </div>
            )}

            {/* Badges Superiores */}
            <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
              <span className="bg-[#064E3B]/90 backdrop-blur-md text-[#84CC16] font-display text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#84CC16]/30">
                💎 Boutique Por Encargo
              </span>
              <span className="bg-amber-400 text-slate-950 font-display text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                50% ABONO
              </span>
            </div>

            {/* Banner Inferior de Precio */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-3 space-y-1">
              <h4 className="font-display font-bold text-sm text-white leading-tight drop-shadow-sm">
                {producto.titulo || producto.nombre}
              </h4>

              <div className="flex items-baseline justify-between pt-0.5">
                <div>
                  <span className="font-display text-lg font-bold text-[#84CC16] block leading-none">
                    {formatoUSD(precioUsd)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-300 block">
                    {formatoVES(precioVes)}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-900/90 text-emerald-200 border border-emerald-700/50 px-2 py-0.5 rounded-md font-bold">
                  Abona solo {formatoUSD(abonoUsd)}
                </span>
              </div>

              <div className="pt-1.5 flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-800/80">
                <span>Zoom • Tealca • MRW • Personal</span>
                <span className="text-[#84CC16] font-bold">Tasa BCV {tasaBcv.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones de Publicación */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={handleShareWhatsAppStatus}
            className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Publicar en Estado de WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopiarTexto}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-[#84CC16]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiado ? "¡Copiado para Instagram Stories!" : "Copiar Texto para Historias"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
