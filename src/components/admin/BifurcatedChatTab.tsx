"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  MessageSquare,
  Users,
  Search,
  Paperclip,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Image as ImageIcon,
  Video,
  User,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { enviarMensajeChatAction } from "@/actions/orders";

interface ChatItem {
  id: string; // orden_id o "INTERNO"
  titulo: string;
  subtitulo: string;
  estadoBadge: "En Espera" | "Atendido";
  atendidoPor?: string;
  ultimoMensaje: string;
  hora: string;
  esInterno?: boolean;
}

interface MensajeItem {
  id: string;
  remitente: "cliente" | "admin";
  admin_alias?: string | null;
  mensaje?: string | null;
  archivo_url?: string | null;
  tipo_archivo?: string | null;
  created_at: string;
}

interface BifurcatedChatTabProps {
  initialOrdenId?: string | null;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function BifurcatedChatTab({
  initialOrdenId,
  showToast,
}: BifurcatedChatTabProps) {
  const [activeMode, setActiveMode] = useState<"clientes" | "interno">("clientes");
  const [chatSeleccionadoId, setChatSeleccionadoId] = useState<string>(initialOrdenId || "");
  const [adminAlias, setAdminAlias] = useState<string>("@operador");
  const [busqueda, setBusqueda] = useState<string>("");

  const [listaClientes, setListaClientes] = useState<ChatItem[]>([]);
  const [mensajes, setMensajes] = useState<MensajeItem[]>([]);
  const [textoInput, setTextoInput] = useState<string>("");
  const [enviando, setEnviando] = useState<boolean>(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    cargarListaChats();
    // Cargar alias real del admin autenticado
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (!userId) return;
      (supabase as any)
        .from("perfiles_admin")
        .select("alias, nombre")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data: perfil }: { data: any }) => {
          if (perfil?.alias) setAdminAlias(perfil.alias);
          else if (perfil?.nombre) setAdminAlias(`@${perfil.nombre.split(' ')[0].toLowerCase()}`);
        });
    });
  }, []);

  useEffect(() => {
    if (activeMode === "interno") {
      setChatSeleccionadoId("INTERNO");
    } else if (listaClientes.length > 0 && (!chatSeleccionadoId || chatSeleccionadoId === "INTERNO")) {
      setChatSeleccionadoId(listaClientes[0].id);
    }
  }, [activeMode, listaClientes]);

  useEffect(() => {
    if (!chatSeleccionadoId) return;

    cargarMensajesChat(chatSeleccionadoId);

    const channel = supabase
      .channel(`chat_realtime_${chatSeleccionadoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_chat",
          filter: `orden_id=eq.${chatSeleccionadoId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMensajes((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatSeleccionadoId]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function cargarListaChats() {
    try {
      const { data: ordenes } = await supabase
        .from("ordenes")
        .select("id, numero, cliente_nombre, estado, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (ordenes && ordenes.length > 0) {
        const chats: ChatItem[] = ordenes.map((o) => ({
          id: o.id,
          titulo: `${o.cliente_nombre || "Cliente"} (#${o.numero || o.id.slice(0, 8)})`,
          subtitulo: `Estado: ${o.estado}`,
          estadoBadge: (o.estado === "pendiente" || o.estado === "pendiente_abono") ? "En Espera" : "Atendido" as "En Espera" | "Atendido",
          ultimoMensaje: "Chat en tiempo real",
          hora: new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        setListaClientes(chats);
        if (!chatSeleccionadoId && chats.length > 0) {
          setChatSeleccionadoId(chats[0].id);
        }
      }
    } catch (e) {
      console.warn("Aviso cargando chats:", e);
    }
  }

  async function cargarMensajesChat(targetId: string) {
    try {
      const { data } = await supabase
        .from("mensajes_chat")
        .select("*")
        .or(`orden_id.eq.${targetId},pedido_id.eq.${targetId}`)
        .order("created_at", { ascending: true });

      if (data) {
        setMensajes(data as any);
      } else {
        setMensajes([]);
      }
    } catch {
      setMensajes([]);
    }
  }

  async function handleEnviarMensaje(e?: React.FormEvent, cannedText?: string) {
    if (e) e.preventDefault();
    const texto = cannedText || textoInput.trim();
    if (!texto || enviando || !chatSeleccionadoId) return;

    setEnviando(true);
    if (!cannedText) setTextoInput("");

    try {
      const res = await enviarMensajeChatAction({
        ordenId: chatSeleccionadoId,
        remitente: "admin",
        adminAlias,
        mensaje: texto,
      });

      if (!res.success) {
        showToast(res.error || "Error al enviar mensaje", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al enviar", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubirMultimedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !chatSeleccionadoId) return;

    setSubiendoArchivo(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `chat-media-${Date.now()}.${ext}`;
      const isVideo = file.type.startsWith("video");

      const { error: upErr } = await supabase.storage.from("productos").upload(fileName, file);
      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage.from("productos").getPublicUrl(fileName);
      if (pubData?.publicUrl) {
        await enviarMensajeChatAction({
          ordenId: chatSeleccionadoId,
          remitente: "admin",
          adminAlias,
          archivoUrl: pubData.publicUrl,
          tipoArchivo: isVideo ? "video" : "imagen",
          mensaje: isVideo ? "📹 Video adjunto" : "📸 Imagen adjunta",
        });
        showToast("Archivo multimedia enviado", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Error al subir archivo", "error");
    } finally {
      setSubiendoArchivo(false);
    }
  }

  function exportarHistorial(formato: "txt" | "pdf") {
    if (mensajes.length === 0) {
      showToast("No hay mensajes para exportar", "info");
      return;
    }

    const lines = mensajes.map((m) => {
      const time = new Date(m.created_at).toLocaleString("es-VE");
      const sender = m.remitente === "cliente" ? "Cliente" : m.admin_alias || "Operador";
      return `[${time}] ${sender}: ${m.mensaje || (m.archivo_url ? `[Adjunto: ${m.archivo_url}]` : "")}`;
    });

    const header = `--- REGISTRO HISTÓRICO DE CHAT (${chatSeleccionadoId}) ---\nFecha de Exportación: ${new Date().toLocaleString("es-VE")}\nOperador Responsable: ${adminAlias}\n\n`;
    const fullText = header + lines.join("\n");

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-${chatSeleccionadoId}-${Date.now()}.${formato === "pdf" ? "txt" : "txt"}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Historial exportado con éxito", "success");
  }

  const chatsFiltrados = listaClientes.filter((c) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return c.titulo.toLowerCase().includes(q) || c.subtitulo.toLowerCase().includes(q);
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[750px]">
      
      {/* Selector Superior Bifurcado: Clientes vs Interno Staff */}
      <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMode("clientes")}
            className={`px-4 py-2 rounded-2xl font-display font-bold text-xs flex items-center gap-2 transition-all ${
              activeMode === "clientes"
                ? "bg-[#064E3B] text-[#84CC16] border border-[#0D6E53] shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Cola P2P Clientes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("interno")}
            className={`px-4 py-2 rounded-2xl font-display font-bold text-xs flex items-center gap-2 transition-all ${
              activeMode === "interno"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Chat Interno de Administradores</span>
          </button>
        </div>

        {/* Alias del Administrador & Exportación */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Operador:</span>
            <select
              value={adminAlias}
              onChange={(e) => setAdminAlias(e.target.value)}
              className="py-1 px-2.5 rounded-xl border border-slate-700 bg-slate-900 text-[#84CC16] font-mono font-bold text-xs outline-none"
            >
              <option value="@carlos_ventas">@carlos_ventas</option>
              <option value="@roberto_despacho">@roberto_despacho</option>
              <option value="@admin_general">@admin_general</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => exportarHistorial("txt")}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Exportar a TXT / Historial"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cuerpo Bifurcado: Lista Izquierda / Ventana Mensajes Derecha */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        
        {/* Columna Izquierda: Cola de Conversaciones */}
        <div className="md:col-span-4 flex flex-col min-h-0 bg-slate-950/60">
          {activeMode === "clientes" ? (
            <>
              {/* Buscador */}
              <div className="p-3 border-b border-slate-800">
                <div className="relative">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar chat por orden o cliente..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-white outline-none focus:border-[#84CC16]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Lista Scrollable */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
                {chatsFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No hay chats disponibles.
                  </div>
                ) : (
                  chatsFiltrados.map((item) => {
                    const isSelected = chatSeleccionadoId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setChatSeleccionadoId(item.id)}
                        className={`p-3.5 cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                          isSelected
                            ? "bg-slate-800/80 border-l-4 border-l-[#84CC16]"
                            : "hover:bg-slate-800/30"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-display font-bold text-xs text-white truncate">
                              {item.titulo}
                            </h5>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                            {item.subtitulo}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider block ${
                              item.estadoBadge === "En Espera"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {item.estadoBadge === "En Espera" ? "En Espera" : item.atendidoPor || "Atendido"}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1 block font-mono">
                            {item.hora}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="p-4 space-y-3">
              <div className="p-3.5 rounded-2xl bg-purple-600/10 border border-purple-500/20 space-y-1">
                <span className="font-display font-bold text-xs text-purple-300 block">
                  #sala-general-staff
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Chat interno seguro y privado entre administradores, operadores y personal de despacho de OcumareHub.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                  Operadores Conectados
                </span>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">@carlos_ventas</span>
                  <span className="text-[10px] text-slate-500 ml-auto">En Línea</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">@roberto_despacho</span>
                  <span className="text-[10px] text-slate-500 ml-auto">En Línea</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Área de Conversación */}
        <div className="md:col-span-8 flex flex-col min-h-0 bg-slate-950">
          
          {/* Header del Chat Activo */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-xs text-white block">
                {activeMode === "interno"
                  ? "🔒 Sala Interna de Administradores"
                  : `Canal P2P Orden #${chatSeleccionadoId.slice(0, 12)}`}
              </span>
              <span className="text-[10px] text-slate-400">
                {activeMode === "interno"
                  ? "Solo visible por el equipo autenticado"
                  : "El cliente ve tus respuestas como 'Asesor de Ventas' (alias protegido)"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime</span>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {mensajes.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p>No hay mensajes en esta conversación.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Envía una respuesta rápida o escribe tu mensaje abajo.
                </p>
              </div>
            ) : (
              mensajes.map((m) => {
                const esAdmin = m.remitente === "admin";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${esAdmin ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                        esAdmin
                          ? "bg-[#064E3B] text-white rounded-tr-none border border-[#0D6E53]"
                          : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-[#84CC16]">
                          {esAdmin ? m.admin_alias || adminAlias : "Cliente"}
                        </span>
                        <span className="text-[9px] text-white/50 font-mono">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {m.mensaje && <p className="whitespace-pre-wrap leading-relaxed">{m.mensaje}</p>}

                      {m.archivo_url && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-white/20">
                          {m.tipo_archivo === "video" ? (
                            <video src={m.archivo_url} controls className="max-w-full max-h-48" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.archivo_url} alt="Adjunto" className="max-w-full max-h-48 object-cover" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Respuestas Rápidas (Canned responses) */}
          <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-slate-500 shrink-0 font-semibold">Plantillas:</span>
            <button
              type="button"
              onClick={() => handleEnviarMensaje(undefined, "✅ ¡Tu pago ha sido verificado con éxito! Iniciamos la preparación de tu encargo.")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
            >
              Pago Verificado
            </button>
            <button
              type="button"
              onClick={() => handleEnviarMensaje(undefined, "📦 Tu paquete está despachado. Te adjuntamos la guía de seguimiento en este chat.")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
            >
              Pedido Despachado
            </button>
            <button
              type="button"
              onClick={() => handleEnviarMensaje(undefined, "📸 Por favor adjunta un capture legible del comprobante de Pago Móvil con fecha y número de referencia.")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
            >
              Solicitar Capture
            </button>
          </div>

          {/* Input de Mensaje */}
          <form
            onSubmit={(e) => handleEnviarMensaje(e)}
            className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
          >
            <div className="relative">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleSubirMultimedia}
                className="hidden"
                id="chatMultimediaInput"
              />
              <label
                htmlFor="chatMultimediaInput"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors block"
                title="Adjuntar Imagen o Video"
              >
                {subiendoArchivo ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#84CC16]" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </label>
            </div>

            <input
              type="text"
              value={textoInput}
              onChange={(e) => setTextoInput(e.target.value)}
              placeholder={`Escribe como ${adminAlias}...`}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-800 bg-slate-950 text-xs text-white outline-none focus:border-[#84CC16]"
            />

            <button
              type="submit"
              disabled={enviando || !textoInput.trim()}
              className="p-2.5 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-bold transition-all disabled:opacity-40"
            >
              {enviando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
