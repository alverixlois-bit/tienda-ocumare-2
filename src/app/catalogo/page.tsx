"use client";

import React, { useState, useEffect } from "react";
import { HeaderCatalogo } from "@/components/catalogo/HeaderCatalogo";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { VideoModal } from "@/components/catalogo/VideoModal";
import { CartDrawer } from "@/components/catalogo/CartDrawer";
import { CheckoutModal } from "@/components/catalogo/CheckoutModal";
import { ProductoRow, CategoriaRow } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/context/CartContext";
import { Package, RefreshCw, Sparkles, Globe, Share2 } from "lucide-react";
import { obtenerCategorias } from "@/actions/categories";
import { obtenerConfiguracionTienda, ConfiguracionTiendaData } from "@/actions/config";

export default function CatalogoPage() {
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [configTienda, setConfigTienda] = useState<ConfiguracionTiendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("all");

  // Video Modal
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ url: string; titulo: string } | null>(null);

  const { tasaBcv, setTasaBcv } = useCart();
  const supabase = createClient();

  useEffect(() => {
    cargarDatosCatalogo();
  }, []);

  async function cargarDatosCatalogo() {
    setLoading(true);
    try {
      const defaultTiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

      // 1. Cargar Configuración de Tienda (Tasa BCV y Redes)
      const conf = await obtenerConfiguracionTienda();
      if (conf) {
        setConfigTienda(conf);
        if (conf.tasa_bcv > 0) {
          setTasaBcv(conf.tasa_bcv);
        }
      }

      // 2. Cargar Categorías Activas desde Supabase
      const catData = await obtenerCategorias(true);
      if (catData && catData.length > 0) {
        setCategorias(catData);
      }

      // 3. Cargar Todos los Productos Activos sin filtros restrictivos
      let query = supabase
        .from("productos")
        .select("*")
        .or("activo.eq.true,activo.is.null")
        .order("created_at", { ascending: false });

      let { data: prodData, error } = await query;

      if (error) {
        // Reintentar consulta simple si 'activo' no admite la sintaxis .or
        const fallbackQuery = await supabase
          .from("productos")
          .select("*")
          .order("created_at", { ascending: false });
        prodData = fallbackQuery.data;
      }

      if (prodData && prodData.length > 0) {
        // Normalizar mapeo de campos (nombre / titulo, imagen_url / imagenes)
        const productosNormalizados = prodData.map((p) => {
          const tituloFinal = p.titulo || p.nombre || "Producto por encargo";
          const imagenFinal =
            p.imagen_url ||
            (Array.isArray(p.imagenes) && p.imagenes.length > 0 ? p.imagenes[0] : null) ||
            p.imagen ||
            null;

          return {
            ...p,
            titulo: tituloFinal,
            nombre: tituloFinal,
            imagen_url: imagenFinal,
            activo: p.activo ?? true,
          };
        });
        setProductos(productosNormalizados as ProductoRow[]);
      } else {
        setProductos([]);
      }

      if (error) {
        console.warn("Aviso al consultar catálogo:", error.message);
      }
    } catch (err) {
      console.error("Error cargando catálogo:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenVideo(url: string, titulo: string) {
    setActiveVideo({ url, titulo });
    setVideoModalOpen(true);
  }

  // Filtrado seguro y blindado
  const listaProds = Array.isArray(productos) ? productos : [];
  const busquedaLower = (busqueda || "").toLowerCase().trim();

  const productosFiltrados = listaProds.filter((p) => {
    if (!p) return false;
    const titulo = (p.titulo || p.nombre || "").toLowerCase();
    const desc = (p.descripcion || "").toLowerCase();

    const matchesSearch =
      busquedaLower === "" ||
      titulo.includes(busquedaLower) ||
      desc.includes(busquedaLower);

    const matchesCat =
      categoriaSeleccionada === "all" || p.categoria_id === categoriaSeleccionada;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header Catalogo */}
      <HeaderCatalogo
        categorias={categorias}
        categoriaSeleccionada={categoriaSeleccionada}
        onSelectCategoria={(catId) => setCategoriaSeleccionada(catId)}
        busqueda={busqueda}
        onBusquedaChange={(val) => setBusqueda(val)}
      />

      {/* Contenido Principal */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Banner de bienvenida al catálogo */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900 border border-slate-800 p-6 sm:p-8 mb-8 backdrop-blur">
          <div className="max-w-2xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Catálogo Oficial por Encargo
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Compra tus productos con solo el 50% de abono
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300">
              Elige lo que necesitas, confirma tu pedido y paga el 50% inicial en Bolívares a tasa oficial BCV o en divisas. El saldo restante lo pagas el día de la entrega o despacho por Zoom/MRW.
            </p>
          </div>
        </div>

        {/* Grid de Productos */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
            <p className="text-sm">Cargando catálogo en tiempo real...</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="text-center py-20 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No hay productos en esta selección</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {busqueda
                ? "Prueba con otro término de búsqueda o selecciona otra categoría."
                : "Pronto se agregarán nuevos productos a este catálogo."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productosFiltrados.map((prod) => (
              <ProductCard
                key={prod.id}
                producto={prod}
                tasaBcv={tasaBcv}
                onOpenVideo={handleOpenVideo}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer con Redes Sociales */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 space-y-3">
        {(configTienda?.instagram_url || configTienda?.tiktok_url || configTienda?.facebook_url) && (
          <div className="flex items-center justify-center gap-4 text-slate-400">
            {configTienda.instagram_url && (
              <a
                href={configTienda.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-pink-400 transition-colors flex items-center gap-1"
              >
                <Share2 className="w-4 h-4" />
                <span>Instagram</span>
              </a>
            )}
            {configTienda.tiktok_url && (
              <a
                href={configTienda.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-400 transition-colors"
              >
                <span>TikTok</span>
              </a>
            )}
            {configTienda.facebook_url && (
              <a
                href={configTienda.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <Globe className="w-4 h-4" />
                <span>Facebook</span>
              </a>
            )}
          </div>
        )}
        <p>OcumareHub &copy; {new Date().getFullYear()} — Catálogo Virtual con Envíos a todo el país.</p>
      </footer>

      {/* Componentes Flotantes y Modales */}
      <CartDrawer />
      <CheckoutModal />
      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoUrl={activeVideo?.url || null}
        titulo={activeVideo?.titulo || ""}
      />
    </div>
  );
}
