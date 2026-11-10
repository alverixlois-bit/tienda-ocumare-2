"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Loader2,
  X,
  Save,
} from "lucide-react";
import { CategoriaRow } from "@/types/database.types";
import {
  obtenerCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  toggleEstadoCategoria,
} from "@/actions/categories";

interface CategoriesTabProps {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function CategoriesTab({ showToast }: CategoriesTabProps) {
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaRow | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formOrden, setFormOrden] = useState("0");
  const [formActivo, setFormActivo] = useState(true);

  // Blindaje estricto: siempre asegurar que categorias sea un array
  const listaCategorias = Array.isArray(categorias) ? categorias : [];

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const data = await obtenerCategorias(false);
      setCategorias(Array.isArray(data) ? data : []);
    } catch {
      setCategorias([]);
      showToast("Error al cargar categorías", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const openAddModal = () => {
    setEditingCategoria(null);
    setFormNombre("");
    setFormDescripcion("");
    setFormOrden((listaCategorias.length * 10).toString());
    setFormActivo(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoriaRow) => {
    setEditingCategoria(cat);
    setFormNombre(cat.nombre || "");
    setFormDescripcion(cat.descripcion || "");
    setFormOrden(cat.orden !== undefined && cat.orden !== null ? cat.orden.toString() : "0");
    setFormActivo(cat.activo ?? true);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      showToast("El nombre de la categoría es requerido", "error");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("nombre", formNombre.trim());
      formData.append("descripcion", formDescripcion.trim());
      formData.append("orden", formOrden);
      formData.append("activo", formActivo ? "true" : "false");

      if (editingCategoria) {
        const res = await actualizarCategoria(editingCategoria.id, formData);
        if (res.success) {
          showToast("Categoría actualizada exitosamente", "success");
          setIsModalOpen(false);
          await fetchCategorias();
        } else {
          showToast(res.error || "Error al actualizar", "error");
        }
      } else {
        const res = await crearCategoria(formData);
        if (res.success) {
          showToast("Categoría creada exitosamente", "success");
          setIsModalOpen(false);
          await fetchCategorias();
        } else {
          showToast(res.error || "Error al crear categoría", "error");
        }
      }
    });
  };

  const handleToggleEstado = (cat: CategoriaRow) => {
    startTransition(async () => {
      const nuevoEstado = !cat.activo;
      const res = await toggleEstadoCategoria(cat.id, nuevoEstado);
      if (res.success) {
        showToast(
          `Categoría ${nuevoEstado ? "activada" : "desactivada"}`,
          "success"
        );
        setCategorias((prev) =>
          (Array.isArray(prev) ? prev : []).map((c) =>
            c.id === cat.id ? { ...c, activo: nuevoEstado } : c
          )
        );
      } else {
        showToast(res.error || "No se pudo cambiar el estado", "error");
      }
    });
  };

  const handleDelete = (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?`)) return;

    startTransition(async () => {
      const res = await eliminarCategoria(id);
      if (res.success) {
        showToast("Categoría eliminada", "success");
        setCategorias((prev) => (Array.isArray(prev) ? prev : []).filter((c) => c.id !== id));
      } else {
        showToast(res.error || "Error al eliminar categoría", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Botón de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-cyan-400" />
            Gestión de Categorías
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organiza tus productos por departamentos y secciones para facilitar la búsqueda al comprador.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Grid de Categorías */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
          <p className="text-sm">Cargando categorías...</p>
        </div>
      ) : listaCategorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center p-6">
          <FolderOpen className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No hay categorías registradas</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Crea la primera categoría para organizar los productos de tu catálogo por tipo.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Crear categoría ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listaCategorias.map((cat) => (
            <div
              key={cat.id}
              className={`p-5 rounded-2xl border transition-all ${
                cat.activo
                  ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  : "bg-slate-950/60 border-slate-900 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white truncate">
                      {cat.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleEstado(cat)}
                      title={cat.activo ? "Desactivar" : "Activar"}
                      className="shrink-0 transition-opacity hover:opacity-80 cursor-pointer"
                    >
                      {cat.activo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          Inactiva
                        </span>
                      )}
                    </button>
                  </div>
                  {cat.slug && (
                    <span className="text-[11px] font-mono text-cyan-400/80 block mt-0.5">
                      /{cat.slug}
                    </span>
                  )}
                  {cat.descripcion && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {cat.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id, cat.nombre)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Orden: #{cat.orden ?? 0}</span>
                <span>
                  {cat.created_at
                    ? new Date(cat.created_at).toLocaleDateString()
                    : "Reciente"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Agregar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-cyan-400" />
              {editingCategoria ? "Editar Categoría" : "Nueva Categoría"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. Ropa y Calzado, Tecnología, Accesorios"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Breve reseña sobre los productos de esta categoría"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Prioridad / Orden
                  </label>
                  <input
                    type="number"
                    value={formOrden}
                    onChange={(e) => setFormOrden(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                    <input
                      type="checkbox"
                      checked={formActivo}
                      onChange={(e) => setFormActivo(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-cyan-500/40"
                    />
                    <span className="text-xs font-medium text-slate-300">
                      Categoría Activa
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingCategoria ? "Guardar Cambios" : "Crear Categoría"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
