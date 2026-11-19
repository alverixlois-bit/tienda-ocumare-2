"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProductoRow } from "@/types/database.types";
import { formatoUSD, formatoVES, sanitizarNumero } from "@/utils/currency";

// Muestra el catálogo en un layout limpio pensado para imprimir/exportar PDF
export default function CatalogoPdfPage() {
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [tasaBcv, setTasaBcv] = useState(64.5);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("Encargos Boutique");
  const [contacto, setContacto] = useState("wa.me/584129998877");
  const [fecha] = useState(new Date().toLocaleDateString("es-VE", { year: "numeric", month: "long", day: "numeric" }));

  useEffect(() => {
    const supabase = createClient();
    async function cargar() {
      try {
        // Cargar configuración
        const { data: conf } = await supabase.from("configuracion_tienda").select("*").limit(1).maybeSingle();
        const confAny = conf as any;
        if (confAny?.tasa_bcv) setTasaBcv(parseFloat(String(confAny.tasa_bcv)) || 64.5);
        if (confAny?.nombre_tienda) setStoreName(confAny.nombre_tienda);
        if (confAny?.whatsapp_principal) setContacto(`wa.me/${(confAny.whatsapp_principal || "").replace(/\D/g, "")}`);

        // Cargar productos activos
        const { data } = await supabase.from("productos").select("*").eq("activo", true).order("created_at", { ascending: false });
        if (data && data.length > 0) setProductos(data);
      } catch (e) {
        console.warn("Error cargando catálogo PDF:", e);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-600">
        <p>Preparando catálogo para imprimir...</p>
      </div>
    );
  }

  return (
    <>
      {/* Botón de imprimir — se oculta en impresión */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl bg-[#064E3B] text-[#84CC16] font-bold text-sm shadow-lg hover:bg-[#043E2F] transition-all"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
        <a
          href="/"
          className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-300 transition-all"
        >
          ← Volver
        </a>
      </div>

      {/* Contenido imprimible */}
      <div className="bg-white min-h-screen p-6 sm:p-10 max-w-4xl mx-auto print:p-6 print:max-w-full">

        {/* Encabezado del catálogo */}
        <div className="border-b-2 border-[#064E3B] pb-5 mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#064E3B] flex items-center justify-center print:hidden">
                <span className="text-[#84CC16] font-black text-sm">EB</span>
              </div>
              <h1 className="font-bold text-2xl text-[#064E3B] tracking-tight">{storeName}</h1>
            </div>
            <p className="text-xs text-slate-500">Catálogo de Encargos · Importación Internacional Boutique</p>
            <p className="text-xs text-slate-400 mt-0.5">📆 {fecha} · Tasa Oficial BCV: <strong>Bs. {tasaBcv.toFixed(2)} / USD</strong></p>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <p className="font-bold text-[#064E3B]">🛒 Sistema de Encargos</p>
            <p>📱 {contacto}</p>
            <p className="mt-1 font-semibold text-[10px] bg-[#84CC16]/20 text-[#064E3B] border border-[#84CC16]/40 px-2 py-0.5 rounded-full inline-block">
              Abona 50% al ordenar
            </p>
          </div>
        </div>

        {/* Grid de productos — 2 col en papel */}
        {productos.length === 0 ? (
          <p className="text-center text-slate-400 py-12">No hay productos activos en el catálogo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 print:grid-cols-2 print:gap-4">
            {productos.map((prod) => {
              const precioBase = sanitizarNumero(prod.precio_usd || prod.precio_base, 0);
              const precioFinal = prod.en_oferta && prod.precio_oferta
                ? sanitizarNumero(prod.precio_oferta, precioBase)
                : precioBase;
              const precioVes = precioFinal * tasaBcv;
              const abono50Usd = precioFinal / 2;
              const abono50Ves = precioVes / 2;

              return (
                <div
                  key={prod.id}
                  className="border border-slate-200 rounded-xl overflow-hidden flex gap-3 p-3 print:break-inside-avoid"
                >
                  {/* Imagen pequeña */}
                  <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {prod.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prod.imagen_url}
                        alt={prod.titulo || prod.nombre || "Producto"}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs text-center p-1">Sin imagen</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 leading-tight line-clamp-2">
                      {prod.titulo || prod.nombre}
                    </h3>
                    {prod.descripcion && (
                      <p className="text-[10px] text-slate-500 line-clamp-2">{prod.descripcion}</p>
                    )}
                    <div className="pt-1 space-y-0.5">
                      <div className="flex items-baseline justify-between">
                        <span className="font-black text-base text-slate-900">{formatoUSD(precioFinal)}</span>
                        {prod.en_oferta && prod.precio_oferta && (
                          <span className="text-[10px] text-red-500 font-bold line-through">{formatoUSD(precioBase)}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-amber-700 font-mono">{formatoVES(precioVes)}</p>
                      <div className="text-[10px] bg-[#84CC16]/15 border border-[#84CC16]/30 rounded-lg px-2 py-0.5 flex items-center justify-between">
                        <span className="font-bold text-[#064E3B]">50% Abono:</span>
                        <span className="font-black text-[#064E3B]">{formatoUSD(abono50Usd)} · {formatoVES(abono50Ves)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pie del catálogo */}
        <div className="mt-8 pt-5 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
          <p>
            Todos los precios en USD a tasa oficial BCV Bs. {tasaBcv.toFixed(2)} al {fecha}.
          </p>
          <p className="font-semibold text-[#064E3B]">
            Para hacer tu encargo: Zoom · MRW · Tealca (Envíos Nacionales) · Entrega Personal con PIN Secreto
          </p>
          <p>{storeName} · OcumareHub · Valles del Tuy, Venezuela</p>
        </div>
      </div>
    </>
  );
}
