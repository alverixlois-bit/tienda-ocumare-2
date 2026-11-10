"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Image as ImageIcon,
  Video,
  DollarSign,
  Package,
  Tag,
  Save,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  Film,
  Link2,
  Loader2,
} from "lucide-react";
import { ProductoRow, CategoriaRow } from "@/types/database.types";
import { convertirUsdaVes, formatoVES, sanitizarNumero } from "@/utils/currency";
import { guardarProducto } from "@/actions/products";
import { createClient } from "@/lib/supabase/client";

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

  // Estados para subida directa de archivos a Supabase Storage
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [modoImagen, setModoImagen] = useState<"upload" | "url">("upload");
  const [modoVideo, setModoVideo] = useState<"upload" | "url">("upload");

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
      if (img) setModoImagen("upload");
      if (producto.video_url) setModoVideo("upload");
    } else {
      setTitulo("");
      setDescripcion("");
      setCategoriaId("");
      setPrecioBase("");
      setUnidadMedida("unidad");
      setStock("10");
      setImagenUrl("");
      setVideoUrl("");
      setEnOferta(false);
      setPrecioOferta("");
      setActivo(true);
      setModoImagen("upload");
      setModoVideo("upload");
    }
  }, [producto, categorias, isOpen]);

  if (!isOpen) return null;

  /**
   * Manejador de subida directa de archivos a Supabase Storage (Bucket 'productos')
   */
  async function handleUploadArchivo(
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: "imagen" | "video"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === "imagen") {
      setSubiendoImagen(true);
    } else {
      setSubiendoVideo(true);
    }

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || (tipo === "imagen" ? "jpg" : "mp4");
      const cleanBase = file.name
        .substring(0, file.name.lastIndexOf(".") || file.name.length)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase();
      const fileName = `${tipo}s/${Date.now()}_${cleanBase}.${ext}`;

      const { data, error } = await supabase.storage
        .from("productos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Error al subir a Supabase Storage:", error);
        showToast(`Error al subir ${tipo}: ${error.message}`, "error");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("productos")
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        if (tipo === "imagen") {
          setImagenUrl(publicData.publicUrl);
          showToast("Imagen subida exitosamente a Supabase Storage", "success");
        } else {
          setVideoUrl(publicData.publicUrl);
          showToast("Video subido exitosamente a Supabase Storage", "success");
        }
      }
    } catch (err: unknown) {
      const msg = extraerMensajeError(err);
      console.error("Excepción en upload:", err);
      showToast(`Error al procesar archivo: ${msg}`, "error");
    } finally {
      if (tipo === "imagen") setSubiendoImagen(false);
      if (tipo === "video") setSubiendoVideo(false);
      e.target.value = "";
    }
  }

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

      // 3. Sanitizar categoria_id: si está vacío o no seleccionado, enviar null estricto
      const categoriaIdLimpia =
        categoriaId &&
        categoriaId !== "all" &&
        categoriaId.trim() !== "" &&
        categoriaId.trim() !== "null"
          ? categoriaId.trim()
          : null;

      // 4. Ejecutar Server Action con compatibilidad dual
      const res = await guardarProducto({
        id: producto?.id,
        nombre: titulo.trim(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        precio_usd: precioNum,
        precio_base: precioNum.toFixed(2),
        stock: sanitizarNumero(stock, 0),
        categoria_id: categoriaIdLimpia,
        imagen_url: trimmedImg || null,
        imagenes: imagenesArray,
        video_url: videoUrl.trim() || null,
        en_oferta: enOferta,
        precio_oferta: enOferta && precioOferta ? sanitizarNumero(precioOferta, 0) : null,
        activo: activo,
        tienda_id: tiendaId,
      });

      if (!res.success) {
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
                Categoría (Opcional)
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

          {/* MULTIMEDIA: FOTO PRINCIPAL (SUBIDA DIRECTA O URL MANUAL) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                Imagen Principal del Producto
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setModoImagen("upload")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    modoImagen === "upload"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Subir desde PC
                </button>
                <button
                  type="button"
                  onClick={() => setModoImagen("url")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    modoImagen === "url"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pegar URL
                </button>
              </div>
            </div>

            {modoImagen === "upload" ? (
              <div>
                <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all text-center">
                  {subiendoImagen ? (
                    <div className="flex flex-col items-center py-2 text-cyan-400">
                      <Loader2 className="w-7 h-7 animate-spin mb-2" />
                      <span className="text-xs font-semibold">Subiendo imagen a Supabase Storage...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-1">
                      <UploadCloud className="w-8 h-8 text-cyan-400 mb-1.5" />
                      <span className="text-xs font-semibold text-white">
                        Haz clic aquí para seleccionar imagen desde tu computadora
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Formatos soportados: JPG, PNG, WEBP (Hasta 10MB)
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={subiendoImagen}
                    onChange={(e) => handleUploadArchivo(e, "imagen")}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... o enlace directo de imagen"
                  className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {/* Vista previa de la imagen cargada */}
            {imagenUrl && (
              <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagenUrl}
                    alt="Vista previa"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/100x100/1e293b/ffffff?text=Error+Img";
                    }}
                  />
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Imagen lista
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-xs block font-mono">
                      {imagenUrl}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImagenUrl("")}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  title="Quitar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* MULTIMEDIA: VIDEO DEMOSTRATIVO (SUBIDA DIRECTA O URL MANUAL) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="w-4 h-4" />
                Video Demostrativo (Opcional)
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setModoVideo("upload")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    modoVideo === "upload"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Subir desde PC
                </button>
                <button
                  type="button"
                  onClick={() => setModoVideo("url")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    modoVideo === "url"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pegar URL
                </button>
              </div>
            </div>

            {modoVideo === "upload" ? (
              <div>
                <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all text-center">
                  {subiendoVideo ? (
                    <div className="flex flex-col items-center py-2 text-cyan-400">
                      <Loader2 className="w-7 h-7 animate-spin mb-2" />
                      <span className="text-xs font-semibold">Subiendo video a Supabase Storage...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-1">
                      <UploadCloud className="w-8 h-8 text-cyan-400 mb-1.5" />
                      <span className="text-xs font-semibold text-white">
                        Haz clic aquí para seleccionar video desde tu computadora
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Formatos soportados: MP4, WebM (Hasta 50MB)
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    disabled={subiendoVideo}
                    onChange={(e) => handleUploadArchivo(e, "video")}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="relative">
                <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... o enlace de video"
                  className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {videoUrl && (
              <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-semibold truncate max-w-xs">{videoUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoUrl("")}
                  className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                  title="Quitar video"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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
              disabled={saving || subiendoImagen || subiendoVideo}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || subiendoImagen || subiendoVideo}
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
