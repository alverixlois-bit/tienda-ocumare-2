"use client";

import React from "react";
import Link from "next/link";
import {
  ShoppingCart,
  DollarSign,
  Truck,
  ShieldCheck,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CategoriaRow } from "@/types/database.types";

interface HeaderCatalogoProps {
  categorias: CategoriaRow[];
  categoriaSeleccionada: string;
  onSelectCategoria: (catId: string) => void;
  busqueda: string;
  onBusquedaChange: (val: string) => void;
}

export function HeaderCatalogo({
  categorias,
  categoriaSeleccionada,
  onSelectCategoria,
  busqueda,
  onBusquedaChange,
}: HeaderCatalogoProps) {
  const { totalItems, setIsCartOpen, tasaBcv } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      {/* Cintillo Informativo Superior: Tasa BCV y Envíos */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950/80 border-b border-slate-800/80 text-[11px] sm:text-xs py-1.5 px-4 text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
              Tasa Oficial BCV: Bs. {tasaBcv.toFixed(2)} / USD
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-300">
              Modalidad Encargos: <strong>50% Abono inicial</strong> / 50% al entregar
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3 text-cyan-400" />
              Envíos Zoom / MRW / Tealca
            </span>
            <Link
              href="/admin"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors ml-2"
            >
              <Store className="w-3 h-3" />
              <span>Soy Vendedor</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Barra Principal de Navegación */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="hidden xs:block">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent block leading-tight">
              OcumareHub
            </span>
            <span className="text-[10px] text-slate-400 font-mono block">
              Tienda Virtual por Encargos
            </span>
          </div>
        </Link>

        {/* Buscador de productos */}
        <div className="relative flex-1 max-w-md mx-2 sm:mx-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar productos por encargo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Botón Carrito */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Carrito</span>
          {totalItems > 0 && (
            <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-emerald-400 text-slate-950 font-mono text-[11px] font-extrabold">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Carrusel de Categorías / Pills */}
      {categorias.length > 0 && (
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => onSelectCategoria("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                categoriaSeleccionada === "all"
                  ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Todos los Productos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategoria(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  categoriaSeleccionada === cat.id
                    ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/20"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
