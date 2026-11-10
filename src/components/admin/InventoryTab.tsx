"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  RefreshCw,
  Tag,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { ProductoRow, CategoriaRow } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { ProductModal } from "./ProductModal";
import { convertirUsdaVes, formatoUSD, formatoVES } from "@/utils/currency";
import { obtenerCategorias } from "@/actions/categories";

interface InventoryTabProps {
  tasaBcv: number;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function InventoryTab({ tasaBcv, showToast }: InventoryTabProps) {
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoRow | null>(null);

  const supabase = createClient();

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      const tiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

      // 1. Cargar Categorías
      const catData = await obtenerCategorias(false);
      if (catData && catData.length > 0) {
        setCategorias(catData);
      }

      // 2. Cargar Productos
      const { data: prodData, error: prodErr } = await supabase
        .from("productos")
        .select("*")
        .eq("tienda_id", tiendaId)
        .order("created_at", { ascending: false });

      if (prodData && prodData.length > 0) {
        setProductos(prodData);
      } else {
        // Fallback datos demo si aún no se han creado en Supabase
        setProductos([]);
      }

      if (prodErr) {
        console.warn("Aviso al consultar productos:", prodErr.message);
      }
    } catch (err) {
      console.error("Error al cargar inventario:", err);
      showToast("Error al conectar con el inventario de Supabase", "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActivo(prod: ProductoRow) {
    const nuevoEstado = !prod.activo;
    // Optimistic update
    setProductos((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, activo: nuevoEstado } : p))
    );

    try {
      const { error } = await supabase
        .from("productos")
        .update({ activo: nuevoEstado, updated_at: new Date().toISOString() })
        .eq("id", prod.id);

      if (error) {
        throw error;
      }

      showToast(
        nuevoEstado
          ? `"${prod.titulo}" ahora está VISIBLE en el catálogo`
          : `"${prod.titulo}" ha sido OCULTADO del catálogo`,
        "info"
      );
    } catch (err: unknown) {
      // Revert
      setProductos((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, activo: prod.activo } : p))
      );
      const msg = err instanceof Error ? err.message : "Error al actualizar";
      showToast(msg, "error");
    }
  }

  async function eliminarProducto(id: string, titulo: string) {
    if (!confirm(`¿Estás seguro de eliminar "${titulo}" del inventario?`)) return;

    try {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw error;

      setProductos((prev) => prev.filter((p) => p.id !== id));
      showToast(`Producto "${titulo}" eliminado exitosamente`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      showToast(msg, "error");
    }
  }

  function handleOpenCreate() {
    setEditingProduct(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(prod: ProductoRow) {
    setEditingProduct(prod);
    setIsModalOpen(true);
  }

  // Filtrado
  const filteredProducts = productos.filter((prod) => {
    const matchesSearch =
      prod.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (prod.descripcion && prod.descripcion.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || prod.categoria_id === selectedCategory;

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && prod.activo) ||
      (filterStatus === "inactive" && !prod.activo);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Barra superior de controles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {categorias.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
            className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo Activos</option>
            <option value="inactive">Solo Ocultos</option>
          </select>

          <button
            onClick={cargarDatos}
            title="Recargar inventario"
            className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto</span>
          </button>
        </div>
      </div>

      {/* Métricas rápidas de inventario */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block">Total Productos</span>
          <span className="text-xl font-bold text-white">{productos.length}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block">Activos en Catálogo</span>
          <span className="text-xl font-bold text-emerald-400">
            {productos.filter((p) => p.activo).length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block">En Oferta</span>
          <span className="text-xl font-bold text-amber-400">
            {productos.filter((p) => p.en_oferta).length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block">Stock Bajo / Crítico</span>
          <span className="text-xl font-bold text-red-400">
            {productos.filter((p) => parseFloat(p.stock || "0") <= 3).length}
          </span>
        </div>
      </div>

      {/* Grid / Tabla de Productos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
          <p className="text-sm">Cargando inventario de productos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No se encontraron productos</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? "Prueba con otro término de búsqueda o limpia los filtros."
              : "Comienza agregando tu primer producto para el catálogo virtual."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Producto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const precioVes = convertirUsdaVes(prod.precio_base, tasaBcv);
            const stockNum = parseFloat(prod.stock || "0");
            const esStockBajo = stockNum <= 3;

            return (
              <div
                key={prod.id}
                className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 backdrop-blur-sm ${
                  prod.activo
                    ? "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                    : "bg-slate-950/50 border-slate-900 opacity-60"
                }`}
              >
                <div>
                  {/* Encabezado de Tarjeta e Imagen */}
                  <div className="flex gap-3 mb-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.imagen_url}
                          alt={prod.titulo}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/100x100/1e293b/ffffff?text=Ocumare";
                          }}
                        />
                      ) : (
                        <Package className="w-7 h-7 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-semibold text-sm text-white truncate" title={prod.titulo}>
                          {prod.titulo}
                        </h4>
                        {prod.en_oferta && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            OFERTA
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {prod.descripcion || "Sin descripción"}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            prod.activo
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.activo ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          {prod.activo ? "Activo" : "Oculto"}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${
                            esStockBajo ? "text-red-400" : "text-slate-400"
                          }`}
                        >
                          {esStockBajo && <AlertTriangle className="w-3 h-3 text-red-400 inline" />}
                          Stock: {stockNum} {prod.unidad_medida}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Precios (USD y Bolívares) */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Precio Base USD
                      </span>
                      <span className="text-base font-extrabold text-white">
                        {formatoUSD(prod.precio_base)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Tasa BCV ({tasaBcv.toFixed(2)})
                      </span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {formatoVES(precioVes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la tarjeta */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
                  <button
                    onClick={() => toggleActivo(prod)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                    title={prod.activo ? "Ocultar del catálogo" : "Publicar en el catálogo"}
                  >
                    {prod.activo ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ocultar</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Publicar</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                      title="Editar producto"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => eliminarProducto(prod.id, prod.titulo)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={cargarDatos}
        producto={editingProduct}
        tasaBcv={tasaBcv}
        categorias={categorias}
        showToast={showToast}
      />
    </div>
  );
}
