"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  User,
  Camera,
  CheckCircle2,
  Loader2,
  Shield,
  Clock,
  Edit2,
  Save,
  Wifi,
  WifiOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PerfilAdmin {
  id: string;
  alias: string;
  nombre: string;
  email: string;
  grado: number;
  avatar_url: string | null;
  en_linea: boolean;
  ultima_conexion: string | null;
}

interface AdminProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function AdminProfilePanel({ isOpen, onClose, showToast }: AdminProfilePanelProps) {
  const [perfil, setPerfil] = useState<PerfilAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [alias, setAlias] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [otrosAdmins, setOtrosAdmins] = useState<PerfilAdmin[]>([]);

  const supabase = createClient();

  const cargarPerfil = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;

      const { data } = await (supabase as any)
        .from("perfiles_admin")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setPerfil(data as PerfilAdmin);
        setAlias(data.alias || "");
        setNombre(data.nombre || "");
      }

      // Cargar otros admins para mostrar presencia
      const { data: todos } = await (supabase as any)
        .from("perfiles_admin")
        .select("id, alias, nombre, grado, en_linea, ultima_conexion, avatar_url")
        .neq("id", userId)
        .order("grado", { ascending: true });
      setOtrosAdmins((todos as PerfilAdmin[]) || []);
    } catch (e) {
      console.warn("Error cargando perfil:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Heartbeat — actualiza presencia cada 30s
  useEffect(() => {
    if (!isOpen) return;
    cargarPerfil();

    const heartbeat = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
      await (supabase as any)
        .from("perfiles_admin")
        .update({ en_linea: true, ultima_conexion: new Date().toISOString() })
        .eq("id", userId);
    };

    heartbeat();
    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [isOpen, cargarPerfil]);

  async function handleGuardarPerfil() {
    if (!perfil || !alias.trim()) return;
    setGuardando(true);
    try {
      const { error } = await (supabase as any)
        .from("perfiles_admin")
        .update({
          alias: alias.trim(),
          nombre: nombre.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", perfil.id);

      if (error) {
        showToast("Error al guardar perfil: " + error.message, "error");
      } else {
        setPerfil((prev) => prev ? { ...prev, alias: alias.trim(), nombre: nombre.trim() } : prev);
        setEditando(false);
        showToast("✅ Perfil actualizado exitosamente", "success");
      }
    } finally {
      setGuardando(false);
    }
  }

  async function handleSubirAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !perfil) return;
    setSubiendoAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `avatars/${perfil.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("productos")
        .upload(fileName, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage.from("productos").getPublicUrl(fileName);
      if (pubData?.publicUrl) {
        await (supabase as any)
          .from("perfiles_admin")
          .update({ avatar_url: pubData.publicUrl })
          .eq("id", perfil.id);
        setPerfil((prev) => prev ? { ...prev, avatar_url: pubData.publicUrl } : prev);
        showToast("✅ Foto de perfil actualizada", "success");
      }
    } catch (err: any) {
      showToast("Error al subir avatar: " + (err?.message || ""), "error");
    } finally {
      setSubiendoAvatar(false);
      e.target.value = "";
    }
  }

  function formatHora(ts: string | null) {
    if (!ts) return "Nunca";
    return new Date(ts).toLocaleString("es-VE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white">Mi Perfil de Admin</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : !perfil ? (
            <div className="text-center py-8 text-slate-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Perfil no configurado en la base de datos.</p>
              <p className="text-xs mt-1 text-slate-500">Verifica que tu usuario esté registrado en perfiles_admin.</p>
            </div>
          ) : (
            <>
              {/* Avatar + Info */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {perfil.avatar_url ? (
                    <img
                      src={perfil.avatar_url}
                      alt={perfil.alias}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-500/40"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-2xl font-bold text-white">
                      {(perfil.alias || perfil.nombre || "A").charAt(1)?.toUpperCase() || "A"}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors">
                    {subiendoAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleSubirAvatar}
                      disabled={subiendoAvatar}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-bold text-lg truncate">
                      {perfil.alias || "@sin_alias"}
                    </span>
                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Grado {perfil.grado}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm truncate">{perfil.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-2 h-2 rounded-full ${perfil.en_linea ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                    <span className={`text-xs font-medium ${perfil.en_linea ? "text-emerald-400" : "text-slate-500"}`}>
                      {perfil.en_linea ? "En línea" : "Desconectado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editar datos */}
              {editando ? (
                <div className="space-y-3 p-4 bg-slate-800/60 rounded-2xl border border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Alias (@usuario)
                    </label>
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      placeholder="@mi_alias"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setEditando(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium transition-colors hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarPerfil}
                      disabled={guardando || !alias.trim()}
                      className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-white">{perfil.nombre || "Sin nombre"}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Última conexión: {formatHora(perfil.ultima_conexion)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditando(true)}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Otros admins online */}
              {otrosAdmins.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Equipo Administrador
                  </h3>
                  <div className="space-y-2">
                    {otrosAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl"
                      >
                        {admin.avatar_url ? (
                          <img src={admin.avatar_url} alt={admin.alias} className="w-9 h-9 rounded-xl object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                            {(admin.alias || admin.nombre || "A").charAt(1)?.toUpperCase() || "A"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{admin.alias || admin.nombre}</p>
                          <p className="text-xs text-slate-500 truncate">{formatHora(admin.ultima_conexion)}</p>
                        </div>
                        {admin.en_linea ? (
                          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
