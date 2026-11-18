"use client";

import React from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatoUSD, formatoVES } from "@/utils/currency";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
    tipoPago,
    setTipoPago,
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

  const listaItems = Array.isArray(items) ? items : [];

  if (!isCartOpen) return null;

  function handleProceedToCheckout() {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Encabezado del Carrito */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#064E3B] text-[#84CC16] flex items-center justify-center font-bold shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                Carrito de Encargos
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {listaItems.reduce((acc, i) => acc + i.cantidad, 0)} productos seleccionados
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Cerrar carrito"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modalidad de Pago: Abono 50% vs Pago 100% */}
        <div className="px-5 pt-3 pb-2 bg-stone-50/50 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Modalidad de Reserva:
          </span>
          <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setTipoPago("abono_50")}
              className={`py-2 px-3 rounded-xl text-xs font-headline font-bold transition-all flex items-center justify-center gap-1.5 ${
                tipoPago === "abono_50"
                  ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Abono 50%</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoPago("total_100")}
              className={`py-2 px-3 rounded-xl text-xs font-headline font-bold transition-all flex items-center justify-center gap-1.5 ${
                tipoPago === "total_100"
                  ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Pago 100%</span>
            </button>
          </div>
        </div>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {listaItems.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <ShoppingBag className="w-14 h-14 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Tu carrito está vacío</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Explora el catálogo y añade tus productos favoritos para armar tu encargo.
              </p>
            </div>
          ) : (
            listaItems.map((item) => {
              const precioUsd = Number(
                item.producto.en_oferta && item.producto.precio_oferta
                  ? item.producto.precio_oferta
                  : (item.producto.precio_usd ?? item.producto.precio_base)
              );

              const itemTotalUsd = precioUsd * item.cantidad;
              const itemTotalVes = itemTotalUsd * tasaBcv;

              return (
                <div
                  key={item.producto.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-[#064E3B]/30 transition-all flex items-center gap-3"
                >
                  {/* Foto miniatura */}
                  <div className="w-16 h-16 rounded-xl bg-stone-100 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.producto.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.producto.imagen_url}
                        alt={item.producto.titulo || item.producto.nombre || "Producto"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Detalle Producto */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.producto.titulo || item.producto.nombre}
                    </h4>
                    
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="font-display font-extrabold text-xs text-[#064E3B]">
                        {formatoUSD(itemTotalUsd)}
                      </span>
                      <span className="text-[11px] text-amber-700 font-semibold">
                        ({formatoVES(itemTotalVes)})
                      </span>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-stone-50 overflow-hidden">
                        <button
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                          title="Disminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-bold text-slate-800">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                          title="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removerProducto(item.producto.id)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                        title="Eliminar ítem"
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

        {/* Footer y Resumen Financiero */}
        {listaItems.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-stone-50 space-y-3.5">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal General (USD):</span>
                <span className="font-bold text-slate-900">{formatoUSD(subtotalUSD)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Equivalente Total Oficial (BCV {tasaBcv.toFixed(2)}):</span>
                <span className="font-bold text-amber-700">{formatoVES(subtotalVES)}</span>
              </div>
            </div>

            {/* Caja de Abono 50% vs 100% */}
            {tipoPago === "abono_50" ? (
              <div className="p-3.5 rounded-2xl bg-[#84CC16]/15 border border-[#84CC16]/40 flex items-center justify-between">
                <div>
                  <span className="font-display font-black text-xs text-[#14532D] block">
                    Abono Requerido Hoy (50%):
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Restante ({formatoUSD(saldoPendienteUSD)}) al llegar tu pedido
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-display font-black text-lg text-[#14532D]">
                    {formatoUSD(abonoUSD)}
                  </span>
                  <span className="text-[11px] font-bold text-[#14532D] block">
                    {formatoVES(abonoVES)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#064E3B]/10 border border-[#064E3B]/25 flex items-center justify-between">
                <div>
                  <span className="font-display font-black text-xs text-[#064E3B] block">
                    Pago Completo (100%):
                  </span>
                  <span className="text-[10px] text-slate-600">Sin saldo pendiente a la entrega</span>
                </div>
                <div className="text-right">
                  <span className="font-display font-black text-lg text-[#064E3B]">
                    {formatoUSD(subtotalUSD)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {formatoVES(subtotalVES)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#84CC16]/25 hover:scale-[1.01] active:scale-95 transition-all"
            >
              <span>Continuar al Checkout Seguro</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#064E3B]" />
              <span>Garantía de Entrega y Envíos Nacionales Asegurados</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
