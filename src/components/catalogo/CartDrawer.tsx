"use client";

import React from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, DollarSign } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatoUSD, formatoVES } from "@/utils/currency";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
    actualizarCantidad,
    removerProducto,
    subtotalUSD,
    subtotalVES,
    abonoUSD,
    abonoVES,
    saldoPendienteUSD,
    saldoPendienteVES,
    tasaBcv,
  } = useCart();

  if (!isCartOpen) return null;

  function handleProceedToCheckout() {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white text-base">Carrito de Encargos</h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-slate-400">Tu carrito está vacío</p>
              <p className="text-xs text-slate-500 mt-1">
                Agrega productos del catálogo para armar tu encargo.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const precioUsd =
                item.producto.en_oferta && item.producto.precio_oferta
                  ? item.producto.precio_oferta
                  : item.producto.precio_base;

              const totalItemUsd = parseFloat(precioUsd) * item.cantidad;

              return (
                <div
                  key={item.producto.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3"
                >
                  {/* Foto miniatura */}
                  <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.producto.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.producto.imagen_url}
                        alt={item.producto.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {item.producto.titulo}
                    </h4>
                    <span className="text-xs font-mono text-cyan-400 font-bold block mt-0.5">
                      {formatoUSD(totalItemUsd)}
                    </span>

                    {/* Controles cantidad */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                          className="px-2 py-0.5 text-slate-400 hover:text-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-white">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                          className="px-2 py-0.5 text-slate-400 hover:text-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removerProducto(item.producto.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors ml-auto"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resumen Financiero y Botón Checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
            {/* Caja de desglose financiero 50% / 50% */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal Pedido:</span>
                <span className="font-mono text-white font-medium">
                  {formatoUSD(subtotalUSD)} ({formatoVES(subtotalVES)})
                </span>
              </div>

              {/* Destacado: Abono 50% Requerido */}
              <div className="flex justify-between items-center py-2 px-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Abono Inicial (50%):
                </span>
                <div className="text-right">
                  <span className="font-extrabold text-sm font-mono block">
                    {formatoUSD(abonoUSD)}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 block">
                    {formatoVES(abonoVES)}
                  </span>
                </div>
              </div>

              {/* Saldo Restante */}
              <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                <span>Saldo al recibir (50% restante):</span>
                <span className="font-mono text-slate-300">
                  {formatoUSD(saldoPendienteUSD)} ({formatoVES(saldoPendienteVES)})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <span>Continuar al Checkout (50% Abono)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
