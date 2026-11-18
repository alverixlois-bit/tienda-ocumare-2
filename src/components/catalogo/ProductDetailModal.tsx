"use client";

import React, { useState } from "react";
import { X, ShoppingBag, ShieldCheck, Truck, CheckCircle2, Sparkles, Layers, Video } from "lucide-react";
import { ProductoRow } from "@/types/database.types";
import { formatoUSD, formatoVES, calcularAbono50 } from "@/utils/currency";

interface ProductDetailModalProps {
  producto: ProductoRow | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (producto: ProductoRow) => void;
  tasaBcv: number;
}

export function ProductDetailModal({
  producto,
  isOpen,
  onClose,
  onAddToCart,
  tasaBcv,
}: ProductDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState<string>("");

  if (!isOpen || !producto) return null;

  const precioUsd = Number(
    producto.en_oferta && producto.precio_oferta
      ? producto.precio_oferta
      : (producto.precio_usd ?? producto.precio_base)
  );
  const precioVes = precioUsd * tasaBcv;
  const abonoUsd = Number(calcularAbono50(precioUsd));
  const abonoVes = abonoUsd * tasaBcv;

  const mainImage = selectedImage || producto.imagen_url || (producto.imagenes && producto.imagenes[0]) || "";
  const mediaGallery = Array.isArray(producto.imagenes) && producto.imagenes.length > 0
    ? producto.imagenes
    : producto.imagen_url
    ? [producto.imagen_url]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#84CC16]" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {producto.categoria_id ? "Encargo Exclusivo" : "Boutique Import"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna Izquierda: Galería Multimedia */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl bg-stone-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
              {mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImage}
                  alt={producto.titulo || producto.nombre || "Producto"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag className="w-16 h-16 text-slate-300" />
              )}

              {/* Badges Flotantes */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {producto.en_oferta && (
                  <span className="px-2.5 py-1 rounded-xl bg-red-600 text-white font-display font-extrabold text-[10px] uppercase shadow-md">
                    En Oferta
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-xl bg-[#064E3B] text-[#84CC16] font-display font-extrabold text-[10px] uppercase shadow-md">
                  Abono 50%
                </span>
              </div>
            </div>

            {/* Miniaturas de galería si existen */}
            {mediaGallery.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {mediaGallery.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(url)}
                    className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                      mainImage === url ? "border-[#064E3B] shadow-sm" : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Vista ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Video preview si existe */}
            {producto.video_url && (
              <div className="p-3 rounded-2xl bg-stone-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-700">
                <Video className="w-4 h-4 text-[#064E3B]" />
                <span className="font-semibold">Video promocional disponible</span>
                <a
                  href={producto.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-[#064E3B] font-bold underline"
                >
                  Ver Video
                </a>
              </div>
            )}
          </div>

          {/* Columna Derecha: Información y Opciones de Compra */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 leading-tight">
                  {producto.titulo || producto.nombre}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Cupos de encargo disponibles
                  </span>
                  <span>•</span>
                  <span>Stock: {producto.stock} uds</span>
                </div>
              </div>

              {/* Tarjeta de Precios Dual USD / VES y Abono 50% */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#0D6E53] text-white shadow-md space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-200 font-medium block">
                      Precio Total del Producto
                    </span>
                    <span className="font-display font-black text-2xl sm:text-3xl tracking-tight">
                      {formatoUSD(precioUsd)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-200 font-medium block">
                      Tasa Oficial BCV ({tasaBcv.toFixed(2)})
                    </span>
                    <span className="font-display font-extrabold text-base text-[#84CC16]">
                      {formatoVES(precioVes)}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#84CC16] text-[#14532D] font-extrabold text-[11px] flex items-center justify-center">
                      50%
                    </span>
                    <span className="font-bold text-white">Reserva hoy con solo:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black text-sm text-[#84CC16]">
                      {formatoUSD(abonoUsd)}
                    </span>
                    <span className="text-[10px] text-emerald-200 block">
                      ({formatoVES(abonoVes)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              {producto.descripcion && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">Descripción:</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {producto.descripcion}
                  </p>
                </div>
              )}

              {/* Beneficios / Características Stitch */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-slate-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#064E3B] shrink-0" />
                  <span>Envíos Zoom, MRW, Tealca</span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#064E3B] shrink-0" />
                  <span>Entrega Personal Segura</span>
                </div>
              </div>
            </div>

            {/* CTA de Compra */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onAddToCart(producto);
                  onClose();
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#84CC16]/25 hover:scale-[1.01] active:scale-95 transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Agregar al Carrito con 50% de Abono</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
