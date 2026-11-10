"use client";

import React, { useState } from "react";
import { ShoppingCart, Video, Check, Package, Flame, AlertCircle } from "lucide-react";
import { ProductoRow } from "@/types/database.types";
import { convertirUsdaVes, formatoUSD, formatoVES, sanitizarNumero } from "@/utils/currency";
import { useCart } from "@/context/CartContext";

interface ProductCardProps {
  producto: ProductoRow;
  tasaBcv: number;
  onOpenVideo: (videoUrl: string, titulo: string) => void;
}

export function ProductCard({ producto, tasaBcv, onOpenVideo }: ProductCardProps) {
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
  const stockNum = parseFloat(producto.stock ? producto.stock.toString() : "0");
  const pocoStock = stockNum > 0 && stockNum <= 3;
  const sinStock = stockNum <= 0;

  function handleAgregar() {
    if (sinStock) return;
    agregarProducto(producto, 1);
    setAgregadoAnim(true);
    setTimeout(() => setAgregadoAnim(false), 1200);
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-cyan-500/10 backdrop-blur">
      {/* Contenedor de Imagen y Badges */}
      <div className="relative aspect-square w-full bg-slate-950 overflow-hidden flex items-center justify-center">
        {imagenMostrar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagenMostrar}
            alt={tituloMostrar}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/400x400/0f172a/ffffff?text=OcumareHub";
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600">
            <Package className="w-12 h-12 mb-2" />
            <span className="text-xs">Foto del encargo</span>
          </div>
        )}

        {/* Badges superiores */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {producto.en_oferta && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-md">
              <Flame className="w-3.5 h-3.5 fill-current" />
              OFERTA
            </span>
          )}

          {pocoStock && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/90 text-white shadow-md">
              <AlertCircle className="w-3.5 h-3.5" />
              ¡Solo {stockNum} disp.!
            </span>
          )}
        </div>

        {/* Botón de Video Preview si tiene video */}
        {producto.video_url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenVideo(producto.video_url!, tituloMostrar);
            }}
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/80 hover:bg-cyan-500 text-white border border-slate-700 hover:border-cyan-400 transition-all shadow-lg flex items-center gap-1.5 text-xs font-medium backdrop-blur-md"
            title="Ver video demostrativo"
          >
            <Video className="w-4 h-4 text-cyan-400 hover:text-white" />
            <span className="hidden sm:inline">Ver Video</span>
          </button>
        )}
      </div>

      {/* Contenido / Información */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-white text-base leading-snug line-clamp-1 group-hover:text-cyan-400 transition-colors">
              {tituloMostrar}
            </h3>
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 mb-3">
            {producto.descripcion || "Producto disponible para compras por encargo con abono del 50%."}
          </p>
        </div>

        {/* Sección de Precios Duales (USD y Bolívares) */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-white">
                  {formatoUSD(precioFinalUsd)}
                </span>
                {producto.en_oferta && producto.precio_oferta && (
                  <span className="text-xs line-through text-slate-500">
                    {formatoUSD(producto.precio_base)}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                50% abono: {formatoUSD(precioFinalUsd / 2)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold text-emerald-400 font-mono block">
                {formatoVES(precioVes)}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                Tasa BCV {tasaBcv.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botón Agregar */}
          <button
            type="button"
            disabled={sinStock}
            onClick={handleAgregar}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-md ${
              sinStock
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : agregadoAnim
                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20"
            }`}
          >
            {agregadoAnim ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Agregado al Carrito!</span>
              </>
            ) : sinStock ? (
              <span>Agotado Temporalmente</span>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>Agregar al Carrito</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
