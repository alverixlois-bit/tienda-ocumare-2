"use client";

import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Video, DollarSign, Package, Tag, Save, RefreshCw } from "lucide-react";
import { ProductoRow, ProductoInsert, ProductoUpdate, CategoriaRow } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { convertirUsdaVes, formatoVES } from "@/utils/currency";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  producto?: ProductoRow | null;
  tasaBcv: number;
  categorias: CategoriaRow[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function ProductModal({
  isOpen,
  onClose,
  onSaved,
  producto,
  tasaBcv,
  categorias,
  showToast,
}: ProductModalProps) {
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [precioBase, setPrecioBase] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("unidad");
  const [stock, setStock] = useState("10");
  const [imagenUrl, setImagenUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [enOferta, setEnOferta] = useState(false);
  const [precioOferta, setPrecioOferta] = useState("");
  const [activo, setActivo] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (producto) {
      setTitulo(producto.titulo || "");
      setDescripcion(producto.descripcion || "");
      setCategoriaId(producto.categoria_id || "");
      setPrecioBase(producto.precio_base || "0.00");
      setUnidadMedida(producto.unidad_medida || "unidad");
      setStock(producto.stock || "0");
      setImagenUrl(producto.imagen_url || "");
      setVideoUrl(producto.video_url || "");
      setEnOferta(Boolean(producto.en_oferta));
      setPrecioOferta(producto.precio_oferta || "");
      setActivo(producto.activo ?? true);
    } else {
      setTitulo("");
      setDescripcion("");
      setCategoriaId(categorias[0]?.id || "");
      setPrecioBase("");
      setUnidadMedida("unidad");
      setStock("10");
      setImagenUrl("");
      setVideoUrl("");
      setEnOferta(false);
      setPrecioOferta("");
      setActivo(true);
    }
  }, [producto, categorias, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const tiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

    if (!titulo.trim()) {
      showToast("El nombre del producto es obligatorio", "error");
      setSaving(false);
      return;
    }

    const precioNum = parseFloat(precioBase);
    if (isNaN(precioNum) || precioNum < 0) {
      showToast("El precio en USD debe ser válido", "error");
      setSaving(false);
      return;
    }

    const insertPayload: ProductoInsert = {
      tienda_id: tiendaId,
      categoria_id: categoriaId || null,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      moneda_base: "USD",
      precio_base: parseFloat(precioBase).toFixed(2),
      unidad_medida: unidadMedida,
      permite_decimales: unidadMedida === "kg" || unidadMedida === "litro",
      stock: parseFloat(stock || "0").toFixed(0),
      activo: activo,
      imagen_url: imagenUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      en_oferta: enOferta,
      precio_oferta: enOferta && precioOferta ? parseFloat(precioOferta).toFixed(2) : null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (producto?.id) {
        // UPDATE
        const { error } = await supabase
          .from("productos")
          .update(insertPayload as ProductoUpdate)
          .eq("id", producto.id);

        if (error) {
          // Reintentar con columnas base si las columnas nuevas no están creadas en DB
          console.warn("Reintentando con columnas base...", error.message);
          const { error: retryError } = await supabase
            .from("productos")
            .update({
              titulo: insertPayload.titulo,
              descripcion: insertPayload.descripcion,
              precio_base: insertPayload.precio_base,
              stock: insertPayload.stock,
              activo: insertPayload.activo,
              categoria_id: insertPayload.categoria_id,
              unidad_medida: insertPayload.unidad_medida,
            })
            .eq("id", producto.id);

          if (retryError) throw retryError;
        }
        showToast("Producto actualizado exitosamente", "success");
      } else {
        // INSERT
        const { error } = await supabase.from("productos").insert([insertPayload]);

        if (error) {
          console.warn("Reintentando insert con columnas base...", error.message);
          const { error: retryError } = await supabase.from("productos").insert([
            {
              tienda_id: tiendaId,
              categoria_id: insertPayload.categoria_id,
              titulo: insertPayload.titulo,
              descripcion: insertPayload.descripcion,
              moneda_base: "USD",
              precio_base: insertPayload.precio_base,
              unidad_medida: insertPayload.unidad_medida,
              permite_decimales: false,
              stock: insertPayload.stock,
              activo: insertPayload.activo,
            },
          ]);
          if (retryError) throw retryError;
        }
        showToast("Producto creado exitosamente en el inventario", "success");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      console.error("Error al guardar producto:", err);
      showToast(`Error al guardar: ${message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  const precioVes = convertirUsdaVes(precioBase || 0, tasaBcv);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">
              {producto ? "Editar Producto" : "Nuevo Producto por Encargo"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Batería Portátil 10000mAh Carga Rápida"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Categoría y Unidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="">(Sin categoría asignada)</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Unidad de Medida
              </label>
              <select
                value={unidadMedida}
                onChange={(e) => setUnidadMedida(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo (kg)</option>
                <option value="g">Gramo (g)</option>
                <option value="litro">Litro (L)</option>
                <option value="ml">Mililitro (ml)</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Descripción detallada
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles del producto, especificaciones, disponibilidad por encargo..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Precios y Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Precio USD ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Equivalente BCV
              </label>
              <div className="py-2 px-3 bg-slate-900/50 border border-slate-800 rounded-lg text-emerald-400 font-mono text-sm font-semibold truncate">
                {formatoVES(precioVes)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Stock Disponible *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Sección de Oferta */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">¿Producto en Oferta?</span>
              </div>
              <input
                type="checkbox"
                checked={enOferta}
                onChange={(e) => setEnOferta(e.target.checked)}
                className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-400 cursor-pointer"
              />
            </div>

            {enOferta && (
              <div>
                <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                  Precio Oferta USD ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioOferta}
                    onChange={(e) => setPrecioOferta(e.target.value)}
                    placeholder="Ej. 19.99"
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-amber-500/50 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* URLs de Multimedia (Imagen y Video) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                URL de Imagen Principal
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... o enlace de Supabase Storage"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {imagenUrl && (
              <div className="flex items-center gap-3 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenUrl}
                  alt="Vista previa"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/100x100/1e293b/ffffff?text=Error+Img";
                  }}
                />
                <span className="text-xs text-slate-400">Vista previa de imagen cargada</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                URL de Video Demostrativo (Opcional)
              </label>
              <div className="relative">
                <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... o video directo .mp4"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Toggle Activo */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-semibold text-slate-300">
              Estado en Catálogo: {activo ? "Visible para clientes" : "Oculto"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? "Guardando..." : producto ? "Actualizar" : "Crear Producto"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
