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
  Upload,
  Download,
  ArrowUpDown,
  Flame,
  X,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { ProductoRow, CategoriaRow } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { ProductModal } from "./ProductModal";
import { SocialStoryModal } from "./SocialStoryModal";
import { convertirUsdaVes, formatoUSD, formatoVES, sanitizarNumero } from "@/utils/currency";
import { obtenerCategorias } from "@/actions/categories";
import {
  eliminarProducto as eliminarProductoAction,
  actualizarPrioridadProducto,
  importarProductosMasivoAction,
} from "@/actions/products";

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
  const [storyProduct, setStoryProduct] = useState<ProductoRow | null>(null);

  // Importador Masivo CSV/Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");
  const [duplicateMode, setDuplicateMode] = useState<"sumar_stock" | "omitir">("sumar_stock");
  const [importing, setImporting] = useState(false);

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
      setCategorias(Array.isArray(catData) ? catData : []);

      // 2. Cargar Productos
      let { data: prodData, error: prodErr } = await supabase
        .from("productos")
        .select("*")
        .order("created_at", { ascending: false });

      if (prodData && prodData.length > 0) {
        setProductos(prodData);
      } else {
        setProductos([]);
      }

      if (prodErr) {
        console.warn("Aviso al consultar productos:", prodErr.message);
      }
    } catch (err: unknown) {
      console.error("Error al cargar inventario:", err);
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : "Error al conectar con Supabase";
      showToast(`Error al cargar inventario: ${msg}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActivo(prod: ProductoRow) {
    const nombreMostrar = prod.titulo || prod.nombre || "Producto";
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
          ? `"${nombreMostrar}" ahora está VISIBLE en el catálogo`
          : `"${nombreMostrar}" ha sido OCULTADO del catálogo`,
        "info"
      );
    } catch (err: unknown) {
      // Revert
      setProductos((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, activo: prod.activo } : p))
      );
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : "Error al actualizar";
      showToast(`Error al actualizar estado: ${msg}`, "error");
    }
  }

  async function eliminarProducto(id: string, titulo: string) {
    if (!confirm(`¿Estás seguro de eliminar "${titulo}" del inventario?`)) return;

    try {
      const res = await eliminarProductoAction(id, titulo);
      if (!res.success) throw new Error(res.error || "Error al eliminar");

      setProductos((prev) => prev.filter((p) => p.id !== id));
      showToast(`Producto "${titulo}" eliminado exitosamente`, "success");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : "Error al eliminar";
      showToast(`Error al eliminar: ${msg}`, "error");
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

  async function handleCambiarPrioridad(prodId: string, nuevaPrioridad: number) {
    setProductos((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, prioridad: nuevaPrioridad } as any : p))
    );
    try {
      await actualizarPrioridadProducto(prodId, nuevaPrioridad);
      showToast("Prioridad visual actualizada", "success");
    } catch {
      showToast("Error al guardar prioridad", "error");
    }
  }

  async function handleToggleOferta(prod: ProductoRow) {
    const nuevoEstado = !prod.en_oferta;
    setProductos((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, en_oferta: nuevoEstado } : p))
    );
    try {
      await supabase
        .from("productos")
        .update({ en_oferta: nuevoEstado, updated_at: new Date().toISOString() })
        .eq("id", prod.id);
      showToast(nuevoEstado ? "Producto marcado en oferta" : "Oferta removida", "info");
    } catch {
      showToast("Error al actualizar oferta", "error");
    }
  }

  function exportToCsv() {
    if (productos.length === 0) {
      showToast("No hay productos para exportar", "info");
      return;
    }

    const headers = ["SKU", "Nombre", "Categoria_ID", "Precio_USD", "Stock", "En_Oferta", "Precio_Oferta", "Prioridad", "Imagen_URL"];
    const rows = productos.map((p) => [
      `"${(p as any).sku || ""}"`,
      `"${(p.nombre || p.titulo || "").replace(/"/g, '""')}"`,
      `"${p.categoria_id || ""}"`,
      p.precio_usd ?? p.precio_base ?? "0.00",
      p.stock || "0",
      p.en_oferta ? "SI" : "NO",
      p.precio_oferta || "",
      (p as any).prioridad || "1",
      `"${p.imagen_url || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo-boutique-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Catálogo exportado exitosamente", "success");
  }

  async function handleEjecutarImportacion(e: React.FormEvent) {
    e.preventDefault();
    if (!importCsvText.trim()) return;

    setImporting(true);
    try {
      // Parsear líneas CSV (admite coma o punto y coma)
      const lineas = importCsvText.trim().split("\n");
      const itemsParaImportar: any[] = [];

      for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea) continue;
        if (i === 0 && (linea.toLowerCase().includes("nombre") || linea.toLowerCase().includes("sku"))) {
          // Encabezado
          continue;
        }

        const cols = linea.split(/[,;\t]/).map((c) => c.replace(/^["']|["']$/g, "").trim());
        if (cols.length >= 2) {
          // Formato esperado: [sku, nombre, precio_usd, stock] o [nombre, precio_usd, stock]
          let sku = "";
          let nombre = "";
          let precioUsd = 0;
          let stock = 10;

          if (isNaN(parseFloat(cols[1])) && cols.length >= 3) {
            sku = cols[0];
            nombre = cols[1];
            precioUsd = parseFloat(cols[2]) || 0;
            stock = parseInt(cols[3] || "10", 10);
          } else {
            nombre = cols[0];
            precioUsd = parseFloat(cols[1]) || 0;
            stock = parseInt(cols[2] || "10", 10);
          }

          itemsParaImportar.push({
            nombre,
            sku,
            precio_usd: precioUsd,
            stock,
            categoria_id: selectedCategory !== "all" ? selectedCategory : null,
          });
        }
      }

      if (itemsParaImportar.length === 0) {
        showToast("No se detectaron productos válidos en el texto CSV.", "error");
        setImporting(false);
        return;
      }

      const res = await importarProductosMasivoAction(itemsParaImportar, duplicateMode);
      if (res.success) {
        showToast(
          `Importación completa: ${res.creados} creados, ${res.actualizados} actualizados, ${res.omitidos} omitidos.`,
          "success"
        );
        setIsImportModalOpen(false);
        setImportCsvText("");
        cargarDatos();
      } else {
        showToast(res.error || "Error al importar productos", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al procesar CSV", "error");
    } finally {
      setImporting(false);
    }
  }

  // Filtrado seguro y blindado
  const listaProductos = Array.isArray(productos) ? productos : [];
  const searchLower = (search || "").toLowerCase().trim();

  const filteredProducts = listaProductos.filter((prod) => {
    if (!prod) return false;
    const titulo = (prod.titulo || prod.nombre || "").toLowerCase();
    const descripcion = (prod.descripcion || "").toLowerCase();

    const matchesSearch =
      searchLower === "" ||
      titulo.includes(searchLower) ||
      descripcion.includes(searchLower);

    const matchesCategory =
      selectedCategory === "all" || prod.categoria_id === selectedCategory;

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && Boolean(prod.activo)) ||
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
          {Array.isArray(categorias) && categorias.length > 0 && (
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
            onClick={() => setIsImportModalOpen(true)}
            title="Importar CSV/Excel con resolución de duplicados"
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={exportToCsv}
            title="Exportar catálogo a CSV"
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={cargarDatos}
            title="Recargar inventario"
            className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs rounded-xl shadow-lg shadow-[#84CC16]/20 active:scale-95 transition-all"
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
          <span className="text-xl font-bold text-white">{listaProductos.length}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block">Activos en Catálogo</span>
          <span className="text-xl font-bold text-emerald-400">
            {listaProductos.filter((p) => Boolean(p?.activo)).length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block">En Oferta</span>
          <span className="text-xl font-bold text-amber-400">
            {listaProductos.filter((p) => Boolean(p?.en_oferta)).length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block">Stock Bajo / Crítico</span>
          <span className="text-xl font-bold text-red-400">
            {listaProductos.filter((p) => parseFloat((p?.stock ?? "0").toString()) <= 3).length}
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
            const precioNumerico = sanitizarNumero(prod.precio_base ?? prod.precio_usd, 0);
            const precioVes = convertirUsdaVes(precioNumerico, tasaBcv);
            const stockNum = parseFloat(prod.stock ? prod.stock.toString() : "0");
            const esStockBajo = stockNum <= 3;
            const tituloMostrar = prod.titulo || prod.nombre || "Producto sin nombre";
            const imgMostrar = prod.imagen_url || (prod.imagenes && prod.imagenes[0]) || "";

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
                      {imgMostrar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgMostrar}
                          alt={tituloMostrar}
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
                        <h4 className="font-semibold text-sm text-white truncate" title={tituloMostrar}>
                          {tituloMostrar}
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
                          Stock: {stockNum} {prod.unidad_medida || "unidad"}
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
                        {formatoUSD(precioNumerico)}
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
                  <div className="flex items-center gap-2">
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

                    <button
                      onClick={() => handleToggleOferta(prod)}
                      className={`p-1 rounded-lg transition-colors flex items-center gap-1 ${
                        prod.en_oferta
                          ? "text-amber-400 bg-amber-500/10"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                      title={prod.en_oferta ? "Desactivar oferta" : "Activar oferta"}
                    >
                      <Flame className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Prioridad Visual */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                      <span>#</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        defaultValue={(prod as any).prioridad || 1}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            handleCambiarPrioridad(prod.id, val);
                          }
                        }}
                        className="w-8 bg-transparent text-white font-mono font-bold text-center outline-none"
                        title="Prioridad visual (1 = primero en el catálogo)"
                      />
                    </div>

                    <button
                      onClick={() => setStoryProduct(prod)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#84CC16] hover:bg-slate-800 transition-colors"
                      title="Generar Historia 9:16 (IG / WhatsApp)"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

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

      {/* Modal Importador Masivo CSV/Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleEjecutarImportacion}
            className="relative w-full sm:max-w-xl bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <h4 className="font-display font-bold text-white text-sm">
                  Importación Masiva de Productos (CSV / Excel)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Pega las filas exportadas de tu hoja de cálculo (Excel / Google Sheets) o archivo CSV. Formato aceptado por fila: <code className="text-cyan-300">SKU, Nombre, Precio_USD, Stock</code> o <code className="text-cyan-300">Nombre, Precio_USD, Stock</code>.
            </p>

            {/* Resolución interactiva de duplicados */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-display font-bold text-xs text-slate-300 block">
                Resolución de Duplicados (si coincide el SKU o Nombre):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDuplicateMode("sumar_stock")}
                  className={`p-2.5 rounded-xl border font-bold text-left transition-all ${
                    duplicateMode === "sumar_stock"
                      ? "border-[#84CC16] bg-[#84CC16]/10 text-[#84CC16]"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Sumar al Stock</span>
                  <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                    Incrementa el stock existente con las nuevas unidades.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDuplicateMode("omitir")}
                  className={`p-2.5 rounded-xl border font-bold text-left transition-all ${
                    duplicateMode === "omitir"
                      ? "border-cyan-400 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Omitir Duplicados</span>
                  <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                    Mantiene el producto existente intacto sin modificarlo.
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Contenido CSV o líneas copiadas:
              </label>
              <textarea
                rows={6}
                required
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder="ENC-CAL-001, Nike Air Force 1 Emerald, 35.00, 10&#10;ENC-CAL-002, Adidas Forum Low, 38.00, 15&#10;Hoodie Oversize Sand, 28.00, 20"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white font-mono text-xs outline-none focus:border-[#84CC16]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={importing || !importCsvText.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Ejecutar Importación Masiva</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal Historia para Redes Sociales */}
      {storyProduct && (
        <SocialStoryModal
          producto={storyProduct}
          tasaBcv={tasaBcv}
          onClose={() => setStoryProduct(null)}
        />
      )}
    </div>
  );
}
