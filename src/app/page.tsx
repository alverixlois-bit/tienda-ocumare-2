"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Sparkles,
  ShieldCheck,
  Truck,
  Store,
  ExternalLink,
  MessageCircle,
  Star,
  Package,
  Clock,
  MapPin,
  ChevronRight,
  Flame,
  TrendingUp,
  Heart,
  Home,
  MessageSquare,
  CreditCard,
  DollarSign,
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

// Reseñas de clientes (sección Unboxing & Clientes)
const RESEÑAS = [
  {
    id: 1,
    nombre: "Valentina R.",
    ciudad: "Ocumare del Tuy",
    texto: "Llegaron mis Nike en 10 días exactos. El unboxing fue increíble, cero daños. El abono del 50% me ayudó mucho. ¡Volvería a comprar sin dudar!",
    stars: 5,
    producto: "Nike Air Force 1",
    avatar: "V",
    color: "bg-purple-600",
  },
  {
    id: 2,
    nombre: "Carlos M.",
    ciudad: "Charallave",
    texto: "El PIN de entrega personal me dio mucha confianza. Se los retiré en la plaza y todo perfecto. Atención por WhatsApp súper rápida.",
    stars: 5,
    producto: "Smartwatch Ultra",
    avatar: "C",
    color: "bg-blue-600",
  },
  {
    id: 3,
    nombre: "Andrea L.",
    ciudad: "Los Teques",
    texto: "Pedí 2 carteritas y llegaron por Zoom en perfectas condiciones. El precio en Bs calculado automático es una maravilla. 100% recomendado.",
    stars: 5,
    producto: "Cartera Emerald Chic",
    avatar: "A",
    color: "bg-rose-600",
  },
  {
    id: 4,
    nombre: "Pedro G.",
    ciudad: "San Antonio",
    texto: "Primera vez comprando por encargo y fue exitosa. El chat P2P me mantuvo informado de cada paso del despacho MRW.",
    stars: 4,
    producto: "Hoodie Oversize",
    avatar: "P",
    color: "bg-amber-600",
  },
];

// Productos de respaldo garantizados
const SAMPLE_PRODUCTS: ProductoRow[] = [
  {
    id: "sample-1",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "calzado",
    titulo: "Nike Air Force 1 Retro Emerald",
    nombre: "Nike Air Force 1 Retro Emerald",
    descripcion: "Icónica zapatilla deportiva con acabado en cuero verde esmeralda y suela Air.",
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
    descripcion: "Clásico del básquet de los 80 con correa de velcro tobillera y detalles en azul.",
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
    descripcion: "Sneaker vintage minimalista en tonos blancos y gris claro.",
    moneda_base: "USD",
    precio_base: "42.00",
    precio_usd: 42.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "7",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-4",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "accesorios",
    titulo: "Lentes Tortoise Gold Oversized",
    nombre: "Lentes Tortoise Gold Oversized",
    descripcion: "Gafas de sol estilo vintage con montura carey y cristales polarizados UV400.",
    moneda_base: "USD",
    precio_base: "15.00",
    precio_usd: 15.0,
    unidad_medida: "unidad",
    permite_decimales: false,
    stock: "20",
    activo: true,
    imagen_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80",
    en_oferta: true,
    precio_oferta: "12.00",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-5",
    tienda_id: "00000000-0000-0000-0000-000000000001",
    categoria_id: "ropa",
    titulo: "Hoodie Oversize Essential Sand",
    nombre: "Hoodie Oversize Essential Sand",
    descripcion: "Buzo con capucha confeccionado en algodón perchado pesado de 400 gsm.",
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
    descripcion: "Reloj inteligente con caja de titanio aeroespacial y GPS de doble frecuencia.",
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

type NavTab = "catalogo" | "encargos" | "abonar" | "chat";

export default function StorefrontHomePage() {
  const { tasaBcv, setTasaBcv, totalItems, subtotalUSD, setIsCartOpen, setIsCheckoutOpen } = useCart();
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [orden, setOrden] = useState<string>("destacados");
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<NavTab>("catalogo");

  // Modales
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoRow | null>(null);
  const [videoModalData, setVideoModalData] = useState<{ url: string; titulo: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    cargarDatos();

    const canalProductos = supabase
      .channel("storefront-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "productos" },
        () => { cargarProductos(); }
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

    return () => { supabase.removeChannel(canalProductos); };
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
      if (Array.isArray(data) && data.length > 0) setCategorias(data);
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
        if (!isNaN(val) && val > 0) setTasaBcv(val);
      }
    } catch (e) {
      console.warn("Tasa BCV por defecto:", e);
    }
  }

  const productosFiltrados = useMemo(() => {
    let res = [...productos];
    if (categoriaActiva !== "todas") {
      res = res.filter((p) =>
        (p.categoria_id || "").toLowerCase() === categoriaActiva.toLowerCase()
      );
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
      res.sort((a, b) => Number(a.precio_usd ?? a.precio_base ?? 0) - Number(b.precio_usd ?? b.precio_base ?? 0));
    } else if (orden === "mayor_precio") {
      res.sort((a, b) => Number(b.precio_usd ?? b.precio_base ?? 0) - Number(a.precio_usd ?? a.precio_base ?? 0));
    } else if (orden === "ofertas") {
      res.sort((a, b) => (b.en_oferta ? 1 : 0) - (a.en_oferta ? 1 : 0));
    }
    return res;
  }, [productos, categoriaActiva, busqueda, orden]);

  function handleNavClick(tab: NavTab) {
    setActiveNav(tab);
    if (tab === "catalogo") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (tab === "encargos") {
      // Redirigir a la página de seguimiento si tiene ordenes guardadas en localStorage
      const lastOrder = typeof window !== "undefined" ? localStorage.getItem("ultimo_pedido_numero") : null;
      if (lastOrder) {
        window.location.href = `/pedido/${lastOrder}`;
      } else {
        window.location.href = "/pedido/buscar";
      }
    } else if (tab === "abonar") {
      setIsCartOpen(true);
    } else if (tab === "chat") {
      const wa = "https://api.whatsapp.com/send?phone=584129998877&text=Hola%2C%20quisiera%20consultar%20sobre%20un%20pedido%20en%20Boutique%20Ocumare%20%F0%9F%92%8E";
      window.open(wa, "_blank");
    }
  }

  const catPills = categorias.length > 0
    ? categorias
    : [
        { id: "calzado", nombre: "👟 Calzado" },
        { id: "ropa", nombre: "👕 Ropa" },
        { id: "accesorios", nombre: "🕶️ Accesorios" },
        { id: "tecnologia", nombre: "⌚ Tecnología" },
      ];

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#FAFAF9] text-slate-900 flex flex-col font-sans">

      {/* 1. Ticker Superior BCV en Vivo */}
      <div className="bg-[#064E3B] text-white px-3 py-2 border-b border-[#0D6E53]">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16] animate-pulse shrink-0" />
            <span className="truncate">
              Tasa BCV:{" "}
              <strong className="text-[#84CC16]">Bs. {tasaBcv.toFixed(2)} / USD</strong>
            </span>
            <span className="hidden sm:inline text-white/50 mx-1">•</span>
            <span className="hidden sm:inline text-emerald-100/80 truncate">
              Zoom · MRW · Tealca · Entrega Personal
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[#84CC16] font-bold whitespace-nowrap">Abono 50%</span>
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1 text-white/70 hover:text-[#84CC16] transition-colors font-semibold"
            >
              <Store className="w-3 h-3" />
              <span>ERP</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Header Pegajoso con Búsqueda */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm w-full">
        <div className="px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 w-full">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#064E3B] text-[#84CC16] flex items-center justify-center font-black shadow-md shadow-[#064E3B]/20 shrink-0">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
            <div className="hidden xs:block">
              <span className="font-display font-extrabold text-sm text-[#064E3B] tracking-tight block leading-tight">
                Encargos Boutique
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">
                Ocumare · Valles del Tuy
              </span>
            </div>
          </Link>

          {/* Barra de búsqueda (desktop y tablet) */}
          <div className="hidden sm:flex flex-1 max-w-sm mx-3">
            <div className="relative w-full">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar calzado, ropa, tecnología..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-stone-50 text-xs focus:bg-white focus:border-[#064E3B] focus:ring-2 focus:ring-[#064E3B]/20 outline-none transition-all placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Acciones Derecha */}
          <div className="flex items-center gap-2">
            {/* Acceso rápido al Catálogo PDF */}
            <Link
              href="/catalogo/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#064E3B]/40 hover:text-[#064E3B] text-xs font-bold transition-all"
              title="Ver Catálogo PDF imprimible"
            >
              📄 PDF
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#043E2F] text-white shadow-sm transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#84CC16] text-[#14532D] text-[9px] font-black flex items-center justify-center shadow-xs">
                  {totalItems}
                </span>
              )}
              <span className="hidden sm:block font-display font-bold text-xs">
                {totalItems > 0 ? formatoUSD(subtotalUSD) : "Carrito"}
              </span>
            </button>
          </div>

        </div>

        {/* Barra de búsqueda móvil */}
        <div className="sm:hidden px-3 pb-2.5">
          <div className="relative w-full">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en el catálogo..."
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-stone-50 text-xs focus:bg-white focus:border-[#064E3B] outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </header>

      {/* 3. Banner Hero Compacto para Móvil */}
      <section className="px-3 sm:px-6 pt-4 pb-3 w-full">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#043E2F] to-[#022C21] text-white p-4 sm:p-8 border border-emerald-800/60">
          {/* Efecto decorativo de fondo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#84CC16]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-700/20 rounded-full blur-2xl" />

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-semibold text-[#84CC16] mb-3">
              <Sparkles className="w-3 h-3" />
              <span>Colección Importada Bajo Pedido · Zoom · Tealca · MRW</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-extrabold text-lg sm:text-3xl text-white leading-tight mb-1">
                  Importación{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#84CC16] to-lime-300">
                    Por Encargo
                  </span>
                </h1>
                <p className="text-emerald-100/80 text-[11px] sm:text-sm leading-relaxed mb-3">
                  Abona solo el 50% hoy. El resto lo pagas cuando llega tu pedido.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs shadow-lg shadow-[#84CC16]/30 transition-all active:scale-95"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Ver Carrito</span>
                  </button>

                  <div className="flex items-center gap-1 text-[10px] text-emerald-100/70">
                    <ShieldCheck className="w-3 h-3 text-[#84CC16]" />
                    <span>Entrega con PIN secreto</span>
                  </div>
                </div>
              </div>

              {/* Card de Tasa BCV */}
              <div className="shrink-0 bg-black/20 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center min-w-[90px]">
                <span className="text-[9px] text-emerald-300 font-bold uppercase tracking-widest block mb-1">
                  Tasa BCV
                </span>
                <span className="font-display font-black text-[#84CC16] text-base block leading-none">
                  {tasaBcv.toFixed(2)}
                </span>
                <span className="text-[9px] text-white/60 font-mono block mt-0.5">Bs / USD</span>
                <div className="mt-1.5 p-1 rounded-lg bg-[#84CC16]/20 border border-[#84CC16]/30">
                  <span className="text-[9px] font-bold text-[#84CC16]">50% Abono</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pills de Categorías — scroll horizontal */}
      <section className="w-full px-3 sm:px-6 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setCategoriaActiva("todas")}
            className={`shrink-0 py-1.5 px-3.5 rounded-full text-[11px] font-display font-bold transition-all ${
              categoriaActiva === "todas"
                ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            🛍️ Todo
          </button>

          {catPills.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaActiva(c.id)}
              className={`shrink-0 py-1.5 px-3.5 rounded-full text-[11px] font-display font-bold transition-all ${
                categoriaActiva === c.id
                  ? "bg-[#064E3B] text-[#84CC16] shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {c.nombre}
            </button>
          ))}

          {/* Selector de Orden */}
          <div className="shrink-0 ml-auto">
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold outline-none focus:border-[#064E3B] text-slate-600"
            >
              <option value="destacados">Recomendados</option>
              <option value="menor_precio">Precio ↑</option>
              <option value="mayor_precio">Precio ↓</option>
              <option value="ofertas">Ofertas</option>
            </select>
          </div>
        </div>
      </section>

      {/* 5. Catálogo en Grid 2 Columnas (Mobile-First) */}
      <main className="w-full px-3 sm:px-6 py-3 pb-28 flex-1">
        {/* Contador */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-500">
            {loading ? "Cargando catálogo..." : `${productosFiltrados.length} artículos disponibles`}
          </span>
          {totalItems > 0 && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-[#064E3B] bg-[#84CC16]/15 border border-[#84CC16]/30 px-2.5 py-1 rounded-full"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>{totalItems} en carrito</span>
            </button>
          )}
        </div>

        {loading ? (
          /* Skeleton de carga */
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-2xl bg-slate-200 animate-pulse">
                <div className="h-36 sm:h-44 rounded-xl bg-slate-300 mb-2" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-300 rounded w-3/4" />
                  <div className="h-3 bg-slate-300 rounded w-1/2" />
                  <div className="h-8 bg-slate-300 rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 px-6">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="font-display font-bold text-slate-800 text-sm">
              No se encontraron productos
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Intenta con otra palabra clave o selecciona otra categoría.
            </p>
            <button
              onClick={() => { setBusqueda(""); setCategoriaActiva("todas"); }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#064E3B] text-[#84CC16] text-xs font-bold"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          /* ✅ Grid 2 columnas en móvil, 3 en tablet, 4 en desktop */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

        {/* 6. Sección Unboxing & Reseñas de Clientes */}
        {!loading && productosFiltrados.length > 0 && (
          <section className="mt-8 sm:mt-12">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-sm text-slate-900">
                  Unboxing & Reseñas de Clientes
                </h2>
                <span className="text-[10px] text-slate-500">Lo que dicen quienes ya recibieron su encargo</span>
              </div>
            </div>

            {/* Carrusel de tarjetas de reseñas — scroll horizontal en móvil */}
            <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar -mx-3 px-3">
              {RESEÑAS.map((r) => (
                <div
                  key={r.id}
                  className="shrink-0 w-[260px] sm:w-[300px] bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
                >
                  {/* Estrellas */}
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < r.stars
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200 fill-slate-200"
                        }`}
                      />
                    ))}
                    <span className="text-[10px] text-slate-400 ml-1 font-mono">{r.stars}.0</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                    &ldquo;{r.texto}&rdquo;
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <div
                      className={`w-7 h-7 rounded-full ${r.color} text-white text-xs font-black flex items-center justify-center shrink-0`}
                    >
                      {r.avatar}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {r.nombre}
                      </span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {r.ciudad} · {r.producto}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* CTA final del carrusel */}
              <div className="shrink-0 w-[200px] bg-gradient-to-br from-[#064E3B] to-[#043E2F] rounded-2xl border border-emerald-800 p-4 flex flex-col items-center justify-center text-center gap-2">
                <Heart className="w-6 h-6 text-[#84CC16]" />
                <span className="text-xs font-bold text-white">
                  ¡Sé el próximo en compartir tu experiencia!
                </span>
                <a
                  href="https://api.whatsapp.com/send?phone=584129998877&text=Quiero%20compartir%20mi%20reseña%20de%20Boutique%20Ocumare%20%F0%9F%92%8E"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#84CC16] text-[#14532D] text-[11px] font-black"
                >
                  Enviar Reseña
                </a>
              </div>
            </div>
          </section>
        )}

        {/* 7. Garantías y Puntos Seguros */}
        {!loading && (
          <section className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: Truck, label: "Zoom · MRW · Tealca", sub: "Envíos nacionales" },
              { icon: ShieldCheck, label: "PIN de Entrega", sub: "Retiro seguro" },
              { icon: Clock, label: "7-12 Días Hábiles", sub: "Importación directa" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5"
              >
                <item.icon className="w-5 h-5 text-[#064E3B]" />
                <span className="text-[10px] font-bold text-slate-900 leading-tight">{item.label}</span>
                <span className="text-[9px] text-slate-500">{item.sub}</span>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* 8. Footer */}
      <footer className="bg-[#064E3B] text-white border-t border-[#0D6E53] pb-20 sm:pb-6">
        <div className="px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#84CC16] text-[#14532D] flex items-center justify-center font-black">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <span className="font-display font-extrabold text-sm text-white">Encargos Boutique</span>
            </div>
            <p className="text-emerald-100/70 leading-relaxed text-[11px]">
              Plataforma digital especializada en compras por encargo y preventas internacionales en Venezuela.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="font-display font-bold text-white text-xs block">Puntos de Entrega</span>
            <ul className="space-y-1 text-emerald-100/80 text-[11px]">
              <li>· Plaza Bolívar Ocumare (Kiosco Central)</li>
              <li>· C.C. Colonial - Entrada Principal</li>
              <li>· Estación Ferrocarril Charallave Sur</li>
              <li>· Zoom · MRW · Tealca (Nacional)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-display font-bold text-white text-xs block">Garantía y Seguridad</span>
            <p className="text-emerald-100/70 text-[11px] leading-relaxed">
              Reserva con 50% de abono. PIN secreto para retiro personal. Seguimiento en tiempo real con chat P2P.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#84CC16] font-bold text-[11px] transition-colors"
            >
              <span>Portal ERP Vendedor</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <div className="border-t border-[#0D6E53] py-3 text-center text-[10px] text-emerald-200/50">
          © {new Date().getFullYear()} Encargos Boutique · Next.js 15 · TypeScript · Supabase
        </div>
      </footer>

      {/* ========== MODALES Y DRAWERS GLOBALES ========== */}
      <ProductDetailModal
        producto={productoSeleccionado}
        isOpen={Boolean(productoSeleccionado)}
        onClose={() => setProductoSeleccionado(null)}
        onAddToCart={() => {}}
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

      {/* ========== BARRA DE NAVEGACIÓN INFERIOR FIJA (MOBILE) ========== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-4 h-16">
          {/* Catálogo */}
          <button
            type="button"
            onClick={() => handleNavClick("catalogo")}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeNav === "catalogo" ? "text-[#064E3B]" : "text-slate-400"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeNav === "catalogo" ? "bg-[#064E3B]/10" : ""
            }`}>
              <Home className="w-4.5 h-4.5" />
            </div>
            <span className="text-[9px] font-bold">Catálogo</span>
          </button>

          {/* Mis Encargos */}
          <button
            type="button"
            onClick={() => handleNavClick("encargos")}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeNav === "encargos" ? "text-[#064E3B]" : "text-slate-400"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeNav === "encargos" ? "bg-[#064E3B]/10" : ""
            }`}>
              <Package className="w-4.5 h-4.5" />
            </div>
            <span className="text-[9px] font-bold">Mis Encargos</span>
          </button>

          {/* Abonar (CTA principal) */}
          <button
            type="button"
            onClick={() => handleNavClick("abonar")}
            className="flex flex-col items-center justify-center gap-0.5 relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#064E3B] hover:bg-[#043E2F] text-[#84CC16] flex items-center justify-center shadow-lg shadow-[#064E3B]/40 active:scale-95 transition-all -mt-5">
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-3.5 w-4 h-4 rounded-full bg-[#84CC16] text-[#14532D] text-[9px] font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold text-[#064E3B]">Abonar 50%</span>
          </button>

          {/* Chat / Soporte */}
          <button
            type="button"
            onClick={() => handleNavClick("chat")}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeNav === "chat" ? "text-[#064E3B]" : "text-slate-400"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeNav === "chat" ? "bg-[#064E3B]/10" : ""
            }`}>
              <MessageCircle className="w-4.5 h-4.5" />
            </div>
            <span className="text-[9px] font-bold">Chat P2P</span>
          </button>
        </div>
      </nav>

      {/* WhatsApp flotante para Desktop (oculto en móvil porque ya está el nav) */}
      <a
        href="https://api.whatsapp.com/send?phone=584129998877&text=Hola%2C%20quisiera%20consultar%20sobre%20un%20producto%20por%20encargo%20en%20Boutique%20Ocumare%20%F0%9F%92%8E"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 p-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all items-center gap-2 group"
        title="Contactar por WhatsApp"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-bold text-xs pr-1">
          ¿Dudas? Escríbenos
        </span>
      </a>
    </div>
  );
}
