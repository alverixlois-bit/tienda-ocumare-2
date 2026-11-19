"use client";

import React, { useState } from "react";
import {
  X, ShoppingBag, ShieldCheck, Truck, Video, Ruler,
} from "lucide-react";
import { ProductoRow } from "@/types/database.types";
import { formatoUSD, formatoVES, calcularAbono50 } from "@/utils/currency";
import { useCart } from "@/context/CartContext";

interface ProductDetailModalProps {
  producto: ProductoRow | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (producto: ProductoRow) => void;
  tasaBcv: number;
}

// Helpers para detectar variantes/tallas según categoría
function getTallas(producto: ProductoRow): string[] {
  if (!producto) return [];
  const cat = (producto.categoria_id || "").toLowerCase();
  if (cat.includes("calzado") || cat.includes("zapato") || cat.includes("sneaker")) {
    return ["36", "37", "38", "39", "40", "41", "42", "43", "44"];
  }
  if (cat.includes("ropa") || cat.includes("hoodie") || cat.includes("camisa") || cat.includes("remera")) {
    return ["XS", "S", "M", "L", "XL", "XXL"];
  }
  if (cat.includes("accesorio") || cat.includes("lentes") || cat.includes("bolso") || cat.includes("cartera")) {
    return ["Único"];
  }
  if (cat.includes("tecnologia") || cat.includes("electronico") || cat.includes("smartwatch")) {
    return ["Estándar"];
  }
  // Por defecto tallas de ropa
  return ["S", "M", "L", "XL"];
}

export function ProductDetailModal({
  producto,
  isOpen,
  onClose,
  onAddToCart,
  tasaBcv,
}: ProductDetailModalProps) {
  const { agregarProducto } = useCart();
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>("");

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
  const mediaGallery =
    Array.isArray(producto.imagenes) && producto.imagenes.length > 0
      ? producto.imagenes
      : producto.imagen_url
      ? [producto.imagen_url]
      : [];

  const tallas = getTallas(producto);
  const tallaUnica = tallas.length === 1 && (tallas[0] === "Único" || tallas[0] === "Estándar");

  function handleAgregarAlCarrito() {
    const varianteElegida = tallaUnica ? tallas[0] : tallaSeleccionada;
    if (!tallaUnica && !varianteElegida) {
      alert("Por favor selecciona una talla o variante antes de agregar al carrito.");
      return;
    }
    if (!producto) return;
    // Agregar con variante como metadata en notas (el carrito lo soporta)
    agregarProducto(
      { ...producto, notas: varianteElegida ? `Talla/Variante: ${varianteElegida}` : undefined } as any,
      1
    );
    onAddToCart(producto);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#84CC16]" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {producto.categoria_id ? "Encargo Exclusivo" : "Boutique Import"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

          {/* Columna Izquierda: Galería */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl bg-stone-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
              {mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImage}
                  alt={producto.titulo || producto.nombre || "Producto"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80";
                  }}
                />
              ) : (
                <ShoppingBag className="w-16 h-16 text-slate-300" />
              )}
              {/* Badges */}
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

            {/* Miniaturas */}
            {mediaGallery.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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

            {/* Video */}
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
                  Ver
                </a>
              </div>
            )}
          </div>

          {/* Columna Derecha: Info + Variantes + CTA */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 leading-tight">
                  {producto.titulo || producto.nombre}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Cupos disponibles
                  </span>
                  <span>•</span>
                  <span>Stock: {producto.stock} uds</span>
                </div>
              </div>

              {/* Tarjeta de Precios */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#0D6E53] text-white shadow-md space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-200 font-medium block">Precio Total</span>
                    <span className="font-display font-black text-2xl sm:text-3xl tracking-tight">
                      {formatoUSD(precioUsd)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-200 font-medium block">
                      BCV ({tasaBcv.toFixed(2)})
                    </span>
                    <span className="font-display font-extrabold text-base text-[#84CC16]">
                      {formatoVES(precioVes)}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#84CC16] text-[#14532D] font-extrabold text-[11px] flex items-center justify-center">50%</span>
                    <span className="font-bold text-white">Reserva hoy:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black text-sm text-[#84CC16]">{formatoUSD(abonoUsd)}</span>
                    <span className="text-[10px] text-emerald-200 block">({formatoVES(abonoVes)})</span>
                  </div>
                </div>
              </div>

              {/* ✅ SELECTOR DE TALLAS / VARIANTES */}
              {!tallaUnica && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-bold text-slate-900">
                      Selecciona tu Talla / Variante
                    </span>
                    {!tallaSeleccionada && (
                      <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                        Requerido
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tallas.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTallaSeleccionada(t)}
                        className={`min-w-[42px] h-10 px-3 rounded-xl border-2 font-display font-bold text-sm transition-all ${
                          tallaSeleccionada === t
                            ? "border-[#064E3B] bg-[#064E3B] text-[#84CC16] shadow-md"
                            : "border-slate-200 bg-white text-slate-700 hover:border-[#064E3B]/50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {tallaSeleccionada && (
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      ✓ Talla seleccionada: <strong>{tallaSeleccionada}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Descripción */}
              {producto.descripcion && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">Descripción:</span>
                  <p className="text-xs text-slate-600 leading-relaxed">{producto.descripcion}</p>
                </div>
              )}

              {/* Beneficios */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-slate-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#064E3B] shrink-0" />
                  <span>Zoom, MRW, Tealca</span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#064E3B] shrink-0" />
                  <span>Entrega con PIN</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAgregarAlCarrito}
                className={`w-full py-3.5 px-5 rounded-2xl font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  !tallaUnica && !tallaSeleccionada
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] shadow-[#84CC16]/25 hover:scale-[1.01] active:scale-95"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {!tallaUnica && !tallaSeleccionada
                    ? "Selecciona una talla para continuar"
                    : "Agregar al Carrito · Abono 50%"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
