"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Paperclip,
  X,
  ExternalLink,
  Eye,
} from "lucide-react";
import { OrdenRow, MensajeChatRow, MensajeChatInsert } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";

interface OrderP2PChatProps {
  orden: OrdenRow;
  onOrderUpdated: () => void;
}

export function OrderP2PChat({ orden, onOrderUpdated }: OrderP2PChatProps) {
  const [mensajes, setMensajes] = useState<MensajeChatRow[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modalComprobanteOpen, setModalComprobanteOpen] = useState(false);
  const [urlComprobanteInput, setUrlComprobanteInput] = useState("");
  const [guardandoComprobante, setGuardandoComprobante] = useState(false);
  const [zoomComprobante, setZoomComprobante] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!orden?.id) return;

    cargarMensajes(orden.id);

    // Suscripción Realtime a mensajes de esta orden
    const channel = supabase
      .channel(`chat_cliente_${orden.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_chat",
          filter: `orden_id=eq.${orden.id}`,
        },
        (payload) => {
          const newMsg = payload.new as MensajeChatRow;
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
  }, [orden.id]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function cargarMensajes(ordenId: string) {
    try {
      const { data } = await supabase
        .from("mensajes_chat")
        .select("*")
        .or(`orden_id.eq.${ordenId},pedido_id.eq.${ordenId}`)
        .order("created_at", { ascending: true });

      if (data) {
        setMensajes(data);
      }
    } catch (err) {
      console.error("Error al cargar chat:", err);
    }
  }

  async function enviarMensaje(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoMensaje.trim() || enviando) return;

    setEnviando(true);
    const texto = nuevoMensaje.trim();
    setNuevoMensaje("");

    const msgPayload = {
      tienda_id: orden.tienda_id,
      orden_id: orden.id,
      pedido_id: orden.id,
      cliente_id: orden.cliente_id,
      remitente_id: null,
      remitente: "cliente",
      remitente_rol: "cliente" as const,
      mensaje: texto,
      leido: false,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("mensajes_chat")
        .insert([msgPayload as any])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setMensajes((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    } finally {
      setEnviando(false);
    }
  }

  async function guardarComprobante(e: React.FormEvent) {
    e.preventDefault();
    if (!urlComprobanteInput.trim()) return;

    setGuardandoComprobante(true);
    const url = urlComprobanteInput.trim();

    try {
      // 1. Actualizar comprobante en ordenes
      const { error: ordErr } = await supabase
        .from("ordenes")
        .update({
          comprobante_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orden.id);

      if (ordErr) throw ordErr;

      // 2. Enviar mensaje informando al vendedor en el chat
      await supabase.from("mensajes_chat").insert([
        {
          tienda_id: orden.tienda_id,
          orden_id: orden.id,
          cliente_id: orden.cliente_id,
          remitente_rol: "cliente",
          mensaje: `📸 ¡Adjunté el comprobante de mi pago móvil / transferencia! Por favor verifícalo para iniciar mi pedido. Enlace: ${url}`,
          leido: false,
          created_at: new Date().toISOString(),
        },
      ]);

      setModalComprobanteOpen(false);
      setUrlComprobanteInput("");
      onOrderUpdated();
    } catch (err) {
      console.error("Error al adjuntar comprobante:", err);
    } finally {
      setGuardandoComprobante(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[580px]">
      {/* Encabezado del Chat */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">
              Chat Directo con el Vendedor (P2P)
            </h4>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Canal en Tiempo Real Activo
            </span>
          </div>
        </div>

        {/* Botón Adjuntar Capture */}
        <button
          type="button"
          onClick={() => setModalComprobanteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition-all"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{orden.comprobante_url ? "Actualizar Capture" : "Adjuntar Capture"}</span>
        </button>
      </div>

      {/* Banner de Comprobante Adjunto si existe */}
      {orden.comprobante_url && (
        <div className="px-4 py-2.5 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Comprobante de pago adjuntado. En espera de verificación.</span>
          </div>
          <button
            type="button"
            onClick={() => setZoomComprobante(true)}
            className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
          >
            <Eye className="w-3 h-3" />
            <span>Ver capture</span>
          </button>
        </div>
      )}

      {/* Área de Mensajes */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-900 to-slate-950">
        {mensajes.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Inicia la conversación con el vendedor.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Puedes preguntar por el avance o enviar tu comprobante de pago.
            </p>
          </div>
        ) : (
          mensajes.map((m) => {
            const esCliente = m.remitente_rol === "cliente";
            const esSistema = m.remitente_rol === "sistema";

            if (esSistema) {
              return (
                <div key={m.id} className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 text-[11px] max-w-md text-center">
                    {m.mensaje}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${esCliente ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs shadow-md ${
                    esCliente
                      ? "bg-cyan-600 text-white rounded-tr-none"
                      : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                  }`}
                >
                  <span className="block text-[10px] font-bold opacity-75 mb-0.5">
                    {esCliente ? "Tú" : "Vendedor de OcumareHub"}
                  </span>
                  <p className="whitespace-pre-wrap">{m.mensaje}</p>
                  <span className="block text-[9px] opacity-60 text-right mt-1 font-mono">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Chat */}
      <form
        onSubmit={enviarMensaje}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setModalComprobanteOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Adjuntar comprobante"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder="Escribe un mensaje al vendedor..."
          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
        />

        <button
          type="submit"
          disabled={enviando || !nuevoMensaje.trim()}
          className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl active:scale-95 transition-all disabled:opacity-40"
          title="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Modal para adjuntar comprobante */}
      {modalComprobanteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setModalComprobanteOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Adjuntar Capture de Pago
              </h3>
              <button
                onClick={() => setModalComprobanteOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={guardarComprobante} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Enlace de la Imagen / Capture del Pago *
                </label>
                <input
                  type="url"
                  required
                  value={urlComprobanteInput}
                  onChange={(e) => setUrlComprobanteInput(e.target.value)}
                  placeholder="https://... enlace de la foto o capture"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Pega el enlace de la captura de tu transferencia o pago móvil para que el vendedor lo revise y apruebe tu encargo.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalComprobanteOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoComprobante || !urlComprobanteInput.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs active:scale-95 disabled:opacity-50"
                >
                  {guardandoComprobante ? "Guardando..." : "Subir Comprobante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Zoom del Comprobante */}
      {zoomComprobante && orden.comprobante_url && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomComprobante(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={orden.comprobante_url}
              alt="Comprobante en grande"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-slate-700 shadow-2xl"
            />
            <button
              onClick={() => setZoomComprobante(false)}
              className="absolute -top-3 -right-3 bg-slate-800 text-white p-2 rounded-full border border-slate-600 shadow"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
