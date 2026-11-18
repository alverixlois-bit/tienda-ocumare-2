"use client";

import React, { useState } from "react";
import { ShoppingBag, Video, Check, Package, Flame, AlertCircle, Eye } from "lucide-react";
import { ProductoRow } from "@/types/database.types";
import { convertirUsdaVes, formatoUSD, formatoVES, sanitizarNumero, calcularAbono50 } from "@/utils/currency";
import { useCart } from "@/context/CartContext";

interface ProductCardProps {
  producto: ProductoRow;
  tasaBcv: number;
  onOpenVideo?: (videoUrl: string, titulo: string) => void;
  onSelectProducto?: (producto: ProductoRow) => void;
}

export function ProductCard({
  producto,
  tasaBcv,
  onOpenVideo,
  onSelectProducto,
}: ProductCardProps) {
  const { agregarProducto } = useCart();
  const [agregadoAnim, setAgregadoAnim] = useState(false);

  const tituloMostrar = producto.titulo || producto.nombre || "Producto por encargo";
  const imagenMostrar = producto.imagen_url || (producto.imagenes && producto.imagenes[0]) || "";
  const precioBaseNum = sanitizarNumero(producto.precio_base ?? producto.precio_usd, 0);
  const precioOfertaNum = producto.precio_oferta ? sanitizarNumero(producto.precio_oferta, 0) : null;

  const precioFinalUsd =
    producto.en_oferta && precioOfertaNum !== null
      ? precioOfertaNum
      : precioBaseNum;

  const precioVes = convertirUsdaVes(precioFinalUsd, tasaBcv);
  const abonoUsd = calcularAbono50(precioFinalUsd);
  const abonoVes = convertirUsdaVes(abonoUsd, tasaBcv);

  const stockNum = parseFloat(producto.stock ? producto.stock.toString() : "0");
  const pocoStock = stockNum > 0 && stockNum <= 3;
  const sinStock = stockNum <= 0;

  function handleAgregar(e: React.MouseEvent) {
    e.stopPropagation();
    if (sinStock) return;
    agregarProducto(producto, 1);
    setAgregadoAnim(true);
    setTimeout(() => setAgregadoAnim(false), 1200);
  }

  function handleCardClick() {
    if (onSelectProducto) {
      onSelectProducto(producto);
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between rounded-3xl bg-white border border-slate-200/90 hover:border-[#064E3B]/40 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer"
    >
      {/* Contenedor de Imagen y Badges */}
      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden flex items-center justify-center">
        {imagenMostrar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagenMostrar}
            alt={tituloMostrar}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80";
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <Package className="w-12 h-12 mb-2" />
            <span className="text-xs">Foto del encargo</span>
          </div>
        )}

        {/* Badges superiores Stitch */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {producto.en_oferta ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-red-600 text-white shadow-md uppercase tracking-wider">
              <Flame className="w-3 h-3 fill-current" />
              Oferta
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-[#064E3B] text-[#84CC16] shadow-md uppercase tracking-wider">
              Boutique
            </span>
          )}

          {pocoStock && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-bold bg-amber-500 text-slate-950 shadow-sm">
              <AlertCircle className="w-3 h-3" />
              ¡Últimas {stockNum}!
            </span>
          )}
        </div>

        {/* Botón de Video Preview si tiene video */}
        {producto.video_url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenVideo) onOpenVideo(producto.video_url!, tituloMostrar);
            }}
            className="absolute bottom-3 left-3 p-2 rounded-xl bg-slate-900/80 hover:bg-[#064E3B] text-white transition-all shadow-md flex items-center gap-1.5 text-xs font-medium backdrop-blur-md"
            title="Ver video demostrativo"
          >
            <Video className="w-3.5 h-3.5 text-[#84CC16]" />
            <span className="text-[10px] font-bold hidden sm:inline">Video</span>
          </button>
        )}

        {/* Quick View Pill */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1.5 shadow-md">
            <Eye className="w-3.5 h-3.5 text-[#064E3B]" />
            Ver Detalles
          </span>
        </div>
      </div>

      {/* Contenido / Información */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between space-y-3">
        <div>
          <h3 className="font-display font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-[#064E3B] transition-colors">
            {tituloMostrar}
          </h3>

          {producto.descripcion && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
              {producto.descripcion}
            </p>
          )}
        </div>

        {/* Pricing Dual & 50% Abono Box */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-display font-black text-lg sm:text-xl text-slate-900">
                {formatoUSD(precioFinalUsd)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-display font-extrabold text-xs text-amber-700">
                {formatoVES(precioVes)}
              </span>
            </div>
          </div>

          {/* Abono 50% Highlight */}
          <div className="p-2 rounded-xl bg-[#84CC16]/15 border border-[#84CC16]/30 flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#14532D]">Abono 50%:</span>
            <span className="font-display font-black text-[#14532D]">
              {formatoUSD(abonoUsd)}
            </span>
          </div>
        </div>

        {/* Botón de Acción Agregar */}
        <button
          type="button"
          onClick={handleAgregar}
          disabled={sinStock}
          className={`w-full py-2.5 px-3 rounded-2xl font-display font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
            sinStock
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : agregadoAnim
              ? "bg-[#064E3B] text-[#84CC16]"
              : "bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] hover:shadow-md active:scale-95"
          }`}
        >
          {sinStock ? (
            <span>Agotado</span>
          ) : agregadoAnim ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>¡Agregado!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Agregar al Carrito</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
