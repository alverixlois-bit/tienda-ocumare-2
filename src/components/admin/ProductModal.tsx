"use client";

import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Video, DollarSign, Package, Tag, Save, RefreshCw } from "lucide-react";
import { ProductoRow, CategoriaRow } from "@/types/database.types";
import { convertirUsdaVes, formatoVES, sanitizarNumero } from "@/utils/currency";
import { guardarProducto } from "@/actions/products";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  producto?: ProductoRow | null;
  tasaBcv: number;
  categorias: CategoriaRow[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

function extraerMensajeError(err: unknown): string {
  if (!err) return "Error desconocido";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const obj = err as Record<string, any>;
    const mensaje = obj.message || obj.error_description || obj.error;
    const detalles = obj.details ? ` (${obj.details})` : "";
    const hint = obj.hint ? ` - Sugerencia: ${obj.hint}` : "";
    if (mensaje) return `${mensaje}${detalles}${hint}`;
    try {
      return JSON.stringify(err);
    } catch {
      return "Error de base de datos en Supabase";
    }
  }
  return String(err);
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

  useEffect(() => {
    if (producto) {
      setTitulo(producto.titulo || producto.nombre || "");
      setDescripcion(producto.descripcion || "");
      setCategoriaId(producto.categoria_id || "");
      setPrecioBase(
        producto.precio_base ||
        (producto.precio_usd !== undefined && producto.precio_usd !== null
          ? producto.precio_usd.toString()
          : "0.00")
      );
      setUnidadMedida(producto.unidad_medida || "unidad");
      setStock(producto.stock ? producto.stock.toString() : "0");
      const img = producto.imagen_url || (producto.imagenes && producto.imagenes[0]) || "";
      setImagenUrl(img);
      setVideoUrl(producto.video_url || "");
      setEnOferta(Boolean(producto.en_oferta));
      setPrecioOferta(
        producto.precio_oferta !== undefined && producto.precio_oferta !== null
          ? producto.precio_oferta.toString()
          : ""
      );
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

    try {
      const tiendaId =
        process.env.NEXT_PUBLIC_TIENDA_ID || "00000000-0000-0000-0000-000000000001";

      if (!titulo.trim()) {
        showToast("El nombre del producto es obligatorio", "error");
        setSaving(false);
        return;
      }

      // 1. Sanitizar número de precio USD (reemplaza coma por punto y parseFloat)
      const precioNum = sanitizarNumero(precioBase, -1);
      if (precioNum < 0) {
        showToast("Por favor ingresa un precio válido en USD", "error");
        setSaving(false);
        return;
      }

      // 2. Sanitizar imágenes (array vacío [] si no se ingresó URL)
      const trimmedImg = imagenUrl.trim();
      const imagenesArray: string[] = trimmedImg ? [trimmedImg] : [];

      // 3. Ejecutar Server Action con compatibilidad dual
      const res = await guardarProducto({
        id: producto?.id,
        nombre: titulo.trim(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        precio_usd: precioNum,
        precio_base: precioNum.toFixed(2),
        stock: sanitizarNumero(stock, 0),
        categoria_id: categoriaId || null,
        imagen_url: trimmedImg || null,
        imagenes: imagenesArray,
        video_url: videoUrl.trim() || null,
        en_oferta: enOferta,
        precio_oferta: enOferta && precioOferta ? sanitizarNumero(precioOferta, 0) : null,
        activo: activo,
        tienda_id: tiendaId,
      });

      if (!res.success) {
        // 3. Manejo de errores detallado: mostrar mensaje exacto de Supabase
        const detalle = res.error || "Error no especificado por la base de datos";
        console.error("Error al guardar producto:", detalle);
        showToast(`Error al guardar: ${detalle}`, "error");
        return;
      }

      showToast(
        producto?.id ? "Producto actualizado exitosamente" : "Producto creado exitosamente",
        "success"
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = extraerMensajeError(err);
      console.error("Excepción inesperada en modal:", err);
      showToast(`Error al guardar: ${message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  const precioNumCalculo = sanitizarNumero(precioBase, 0);
  const precioVes = convertirUsdaVes(precioNumCalculo, tasaBcv);

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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nombre / Título */}
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

          {/* Precios y Stock (Soporta comas y puntos) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Precio USD ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
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
                type="text"
                inputMode="numeric"
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
                    type="text"
                    inputMode="decimal"
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
