"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Sparkles,
  ShieldCheck,
  Truck,
  ArrowRight,
  Flame,
  Layers,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Store,
  ExternalLink,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import { ProductoRow, CategoriaRow } from "@/types/database.types";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { ProductDetailModal } from "@/components/catalogo/ProductDetailModal";
import { CartDrawer } from "@/components/catalogo/CartDrawer";
import { CheckoutModal } from "@/components/catalogo/CheckoutModal";
import { VideoModal } from "@/components/catalogo/VideoModal";

// Productos de respaldo garantizados según especificación Stitch (50 productos en preventa)
const SAMPLE_PRODUCTS: ProductoRow[] = [
  {
    id: "sample-1",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "calzado",
    titulo: "Nike Air Force 1 Retro Emerald Edition",
    nombre: "Nike Air Force 1 Retro Emerald Edition",
    descripcion: "Icónica zapatilla deportiva con acabado en cuero verde esmeralda y suela con amortiguación Air.",
    moneda_base: "USD",
    precio_base: "35.00",
    precio_usd: 35.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "11",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    en_oferta: true,
    precio_oferta: "29.99",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-2",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "calzado",
    titulo: "Adidas Forum Low White Royal",
    nombre: "Adidas Forum Low White Royal",
    descripcion: "Clásico del básquet de los años 80 remasterizado con correa de velcro tobillera y detalles en azul.",
    moneda_base: "USD",
    precio_base: "38.00",
    precio_usd: 38.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "12",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-3",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "calzado",
    titulo: "New Balance 550 Vintage White",
    nombre: "New Balance 550 Vintage White",
    descripcion: "Sneaker vintage minimalista en tonos blancos y gris claro que combina con cualquier look diario.",
    moneda_base: "USD",
    precio_base: "42.00",
    precio_usd: 42.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "15",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&auto=format&fit=crop&q=80",
    en_oferta: true,
    precio_oferta: "36.00",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-4",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "calzado",
    titulo: "Puma Palermo Special Forest",
    nombre: "Puma Palermo Special Forest",
    descripcion: "Zapatilla terrace emblemática con suela de goma caramelo y gamuza verde oliva de primera calidad.",
    moneda_base: "USD",
    precio_base: "32.00",
    precio_usd: 32.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "8",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-5",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "ropa",
    titulo: "Hoodie Oversize Essential Sand",
    nombre: "Hoodie Oversize Essential Sand",
    descripcion: "Buzo con capucha confeccionado en algodón perchado pesado de 400 gsm para máxima durabilidad.",
    moneda_base: "USD",
    precio_base: "28.00",
    precio_usd: 28.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "20",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-6",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "tecnologia",
    titulo: "Smartwatch Ultra Titanium Series",
    nombre: "Smartwatch Ultra Titanium Series",
    descripcion: "Reloj inteligente con caja de titanio aeroespacial, GPS de doble frecuencia y autonomía de 48 horas.",
    moneda_base: "USD",
    precio_base: "49.00",
    precio_usd: 49.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "6",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    en_oferta: true,
    precio_oferta: "42.50",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function StorefrontHomePage() {
  const { tasaBcv, setTasaBcv, totalItems, subtotalUSD, setIsCartOpen } = useCart();
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [orden, setOrden] = useState<string>("destacados");
  const [loading, setLoading] = useState(true);

  // Modales
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoRow | null>(null);
  const [videoModalData, setVideoModalData] = useState<{ url: string; titulo: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    cargarDatos();

    // Suscripción Realtime a productos y configuración
    const canalProductos = supabase
      .channel("storefront-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "productos" },
        () => {
          cargarProductos();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "configuracion_tienda" },
        (payload: any) => {
          if (payload?.new?.tasa_bcv) {
            const nuevaTasa = parseFloat(payload.new.tasa_bcv);
            if (!isNaN(nuevaTasa) && nuevaTasa > 0) {
              setTasaBcv(nuevaTasa);
              localStorage.setItem("ocumare_tasa_bcv", String(nuevaTasa));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalProductos);
    };
  }, []);

  async function cargarDatos() {
    setLoading(true);
    await Promise.all([cargarProductos(), cargarCategorias(), cargarTasaConfig()]);
    setLoading(false);
  }

  async function cargarProductos() {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setProductos(SAMPLE_PRODUCTS);
      } else {
        setProductos(data);
      }
    } catch {
      setProductos(SAMPLE_PRODUCTS);
    }
  }

  async function cargarCategorias() {
    try {
      const { data } = await supabase
        .from("categorias")
        .select("*")
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (Array.isArray(data) && data.length > 0) {
        setCategorias(data);
      }
    } catch (e) {
      console.warn("Categorías por defecto activadas:", e);
    }
  }

  async function cargarTasaConfig() {
    try {
      const { data } = await supabase
        .from("configuracion_tienda")
        .select("tasa_bcv")
        .limit(1)
        .maybeSingle();

      if (data?.tasa_bcv) {
        const val = parseFloat(String(data.tasa_bcv));
        if (!isNaN(val) && val > 0) {
          setTasaBcv(val);
        }
      }
    } catch (e) {
      console.warn("Tasa BCV por defecto 64.50:", e);
    }
  }

  // Filtrado y Búsqueda en Vivo
  const productosFiltrados = useMemo(() => {
    let res = [...productos];

    if (categoriaActiva !== "todas") {
      res = res.filter((p) => {
        const catId = (p.categoria_id || "").toLowerCase();
        return catId === categoriaActiva.toLowerCase();
      });
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      res = res.filter((p) => {
        const tit = (p.titulo || p.nombre || "").toLowerCase();
        const desc = (p.descripcion || "").toLowerCase();
        return tit.includes(q) || desc.includes(q);
      });
    }

    if (orden === "menor_precio") {
      res.sort((a, b) => {
        const pa = Number(a.precio_usd ?? a.precio_base ?? 0);
        const pb = Number(b.precio_usd ?? b.precio_base ?? 0);
        return pa - pb;
      });
    } else if (orden === "mayor_precio") {
      res.sort((a, b) => {
        const pa = Number(a.precio_usd ?? a.precio_base ?? 0);
        const pb = Number(b.precio_usd ?? b.precio_base ?? 0);
        return pb - pa;
      });
    } else if (orden === "ofertas") {
      res.sort((a, b) => (b.en_oferta ? 1 : 0) - (a.en_oferta ? 1 : 0));
    }

    return res;
  }, [productos, categoriaActiva, busqueda, orden]);

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-900 flex flex-col font-sans">
      
      {/* 1. Ticker Oficial Superior Stitch */}
      <div className="bg-[#064E3B] text-white px-4 py-2 border-b border-[#0D6E53] text-[11px] sm:text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse" />
            <span>Tasa Oficial BCV: <strong className="text-[#84CC16] font-display">Bs. {tasaBcv.toFixed(2)} / USD</strong></span>
            <span className="hidden md:inline text-white/40">•</span>
            <span className="hidden md:inline text-emerald-100">Envíos Nacionales Asegurados Zoom • MRW • Tealca</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#84CC16] font-bold">Abono 50% al ordenar</span>
            <span className="text-white/40">|</span>
            <Link
              href="/admin"
              className="text-white hover:text-[#84CC16] transition-colors flex items-center gap-1 font-semibold"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Portal ERP Vendedor</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Glassmorphic Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-[#064E3B] text-[#84CC16] flex items-center justify-center font-black shadow-md shadow-[#064E3B]/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-base sm:text-lg text-[#064E3B] tracking-tight block leading-tight">
                Encargos Boutique
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase block">
                OcumareHub &middot; Valles del Tuy
              </span>
            </div>
          </Link>

          {/* Buscador Rápido */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar calzado, tecnología, ropa o accesorios..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-stone-50 text-xs focus:bg-white focus:border-[#064E3B] focus:ring-2 focus:ring-[#064E3B]/20 outline-none transition-all placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Botón Carrito Flotante */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative py-2.5 px-4 rounded-2xl bg-white border border-slate-200 hover:border-[#84CC16] text-[#064E3B] shadow-sm hover:shadow-md transition-all flex items-center gap-2.5 group"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform text-[#064E3B]" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#84CC16] text-[#14532D] text-[10px] font-black flex items-center justify-center shadow-xs">
                    {totalItems}
                  </span>
                )}
              </div>

              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-[10px] text-slate-500 font-medium">Mi Carrito</span>
                <span className="font-display font-extrabold text-xs text-[#064E3B]">
                  {formatoUSD(subtotalUSD)}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Buscador móvil */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative w-full">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos en preventa..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-stone-50 text-xs focus:bg-white focus:border-[#064E3B] outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </header>

      {/* 3. Hero Promo Banner (Stitch Reference) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#043E2F] to-[#022C21] text-white p-6 sm:p-10 shadow-xl border border-emerald-800">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#84CC16]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zoom &middot; Tealca &middot; MRW | Envíos Nacionales Asegurados</span>
                <span className="text-white/60">|</span>
                <span className="text-white">Abonas 50%</span>
              </div>

              <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-white leading-tight">
                Importación Boutique <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#84CC16] via-lime-300 to-white">
                  Por Encargo con Abono del 50%
                </span>
              </h1>

              <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Catálogo curado para compras exclusivas. Selecciona tus prendas o tecnología favorita, calcula la conversión exacta a tasa oficial BCV (Bs. {tasaBcv.toFixed(2)}) y finaliza tu encargo cancelando hoy solo la mitad.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#84CC16]/25 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ver Mi Carrito de Compras</span>
                </button>

                <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-[#84CC16]" />
                  <span>Entrega Personal Segura con PIN</span>
                </div>
              </div>
            </div>

            {/* Tarjeta de Tasa y Abono Flotante en Hero */}
            <div className="lg:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 space-y-3">
              <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
                Garantía y Conversión en Vivo
              </span>

              <div className="p-3 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-between">
                <span className="text-xs text-white">Tasa Oficial BCV:</span>
                <span className="font-display font-black text-[#84CC16] text-sm">
                  Bs. {tasaBcv.toFixed(2)} / USD
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#84CC16]/20 border border-[#84CC16]/40 flex items-center justify-between text-xs">
                <span className="font-bold text-white">Reserva Inicial:</span>
                <span className="font-display font-black text-[#84CC16]">50% Requerido</span>
              </div>

              <p className="text-[10px] text-emerald-200/80 leading-tight">
                El 50% restante se abona en efectivo USD o Pago Móvil una vez llegue tu paquete al punto de encuentro o agencia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Categorías & Filtro en Barra (Pills) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCategoriaActiva("todas")}
              className={`py-2 px-4 rounded-full text-xs font-display font-bold transition-all ${
                categoriaActiva === "todas"
                  ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              Todas las Colecciones
            </button>

            {categorias.length > 0 ? (
              categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoriaActiva(c.id)}
                  className={`py-2 px-4 rounded-full text-xs font-display font-bold transition-all ${
                    categoriaActiva === c.id
                      ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {c.nombre}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => setCategoriaActiva("calzado")}
                  className={`py-2 px-4 rounded-full text-xs font-display font-bold transition-all ${
                    categoriaActiva === "calzado"
                      ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Calzado
                </button>
                <button
                  onClick={() => setCategoriaActiva("ropa")}
                  className={`py-2 px-4 rounded-full text-xs font-display font-bold transition-all ${
                    categoriaActiva === "ropa"
                      ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Ropa &amp; Hoodies
                </button>
                <button
                  onClick={() => setCategoriaActiva("tecnologia")}
                  className={`py-2 px-4 rounded-full text-xs font-display font-bold transition-all ${
                    categoriaActiva === "tecnologia"
                      ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Tecnología
                </button>
              </>
            )}
          </div>

          {/* Selector de Orden */}
          <div className="shrink-0 flex items-center gap-2 text-xs">
            <span className="text-slate-400 hidden sm:inline">Ordenar:</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold outline-none focus:border-[#064E3B]"
            >
              <option value="destacados">Prioridad Recomendada</option>
              <option value="menor_precio">Precio: Menor a Mayor</option>
              <option value="mayor_precio">Precio: Mayor a Menor</option>
              <option value="ofertas">Ofertas Especiales</option>
            </select>
          </div>
        </div>
      </section>

      {/* 5. Catálogo Interactivo en Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500">
            Mostrando {productosFiltrados.length} artículos en preventa
          </span>
          <span className="text-[11px] text-[#064E3B] font-bold">
            Conversión en vivo con Decimal.js
          </span>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 p-8">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-display font-bold text-slate-800 text-base">
              No se encontraron productos
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Intenta con otra palabra clave o selecciona otra categoría del catálogo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {productosFiltrados.map((prod) => (
              <ProductCard
                key={prod.id}
                producto={prod}
                tasaBcv={tasaBcv}
                onSelectProducto={(p) => setProductoSeleccionado(p)}
                onOpenVideo={(url, tit) => setVideoModalData({ url, titulo: tit })}
              />
            ))}
          </div>
        )}
      </main>

      {/* 6. Footer Boutique */}
      <footer className="mt-16 bg-[#064E3B] text-white border-t border-[#0D6E53]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#84CC16] text-[#14532D] flex items-center justify-center font-black">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-display font-extrabold text-base text-white">
                Encargos Boutique
              </span>
            </div>
            <p className="text-emerald-100/80 leading-relaxed">
              Plataforma digital especializada en compras por encargo, preventas internacionales y despachos asegurados a nivel nacional en Venezuela.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-display font-bold text-white text-sm block">
              Puntos Seguros de Entrega
            </span>
            <ul className="space-y-1.5 text-emerald-100/90">
              <li>&bull; Plaza Bolívar Ocumare (Kiosco Central)</li>
              <li>&bull; C.C. Colonial - Entrada Principal</li>
              <li>&bull; Estación Ferrocarril Charallave Sur</li>
              <li>&bull; Envíos asegurados: Zoom, MRW, Tealca</li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-display font-bold text-white text-sm block">
              Garantía y Seguridad
            </span>
            <p className="text-emerald-100/80 leading-relaxed">
              Reserva con el 50% de abono. Todo pedido incluye código PIN secreto de 4 dígitos para retiro personal y seguimiento en tiempo real con chat P2P.
            </p>
            <div className="pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#84CC16] font-bold transition-colors"
              >
                <span>Acceso Administrativo ERP</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-[#0D6E53] py-4 text-center text-[11px] text-emerald-200/60">
          &copy; {new Date().getFullYear()} Encargos Boutique &middot; Desarrollado con Next.js 15, TypeScript y Supabase
        </div>
      </footer>

      {/* Modales y Drawers Globales */}
      <ProductDetailModal
        producto={productoSeleccionado}
        isOpen={Boolean(productoSeleccionado)}
        onClose={() => setProductoSeleccionado(null)}
        onAddToCart={(p) => {
          // El modal llama a useCart() internamente o pasa el producto
        }}
        tasaBcv={tasaBcv}
      />

      <CartDrawer />
      <CheckoutModal />

      {videoModalData && (
        <VideoModal
          videoUrl={videoModalData.url}
          titulo={videoModalData.titulo}
          isOpen={Boolean(videoModalData)}
          onClose={() => setVideoModalData(null)}
        />
      )}
    </div>
  );
}
