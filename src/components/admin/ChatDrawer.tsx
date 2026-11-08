"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  CheckCircle2,
  Truck,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  DollarSign,
  User,
  Phone,
  MapPin,
  Clock,
  Eye,
} from "lucide-react";
import { OrdenRow, MensajeChatRow, MensajeChatInsert, EstadoOrden } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { formatoUSD, formatoVES } from "@/utils/currency";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenRow | null;
  onOrderUpdated: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function ChatDrawer({
  isOpen,
  onClose,
  orden,
  onOrderUpdated,
  showToast,
}: ChatDrawerProps) {
  const [mensajes, setMensajes] = useState<MensajeChatRow[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [zoomComprobante, setZoomComprobante] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !orden?.id) return;

    // 1. Cargar mensajes iniciales del chat
    cargarMensajes(orden.id);

    // 2. Suscripción en Tiempo Real con Supabase Realtime
    const channel = supabase
      .channel(`chat_orden_${orden.id}`)
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
  }, [isOpen, orden?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function cargarMensajes(ordenId: string) {
    try {
      const { data, error } = await supabase
        .from("mensajes_chat")
        .select("*")
        .eq("orden_id", ordenId)
        .order("created_at", { ascending: true });

      if (data) {
        setMensajes(data);
      }
      if (error) {
        console.warn("Aviso al cargar chat:", error.message);
      }
    } catch (err) {
      console.error("Error al cargar mensajes:", err);
    }
  }

  async function enviarMensaje(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !orden?.id || enviando) return;

    setEnviando(true);
    const texto = nuevoMensaje.trim();
    setNuevoMensaje("");

    const msgPayload: MensajeChatInsert = {
      tienda_id: orden.tienda_id,
      orden_id: orden.id,
      cliente_id: orden.cliente_id,
      remitente_id: null,
      remitente_rol: "vendedor",
      mensaje: texto,
      leido: true,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from("mensajes_chat").insert([msgPayload]).select().single();
      if (error) throw error;
      if (data) {
        setMensajes((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      showToast("No se pudo enviar el mensaje", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function actualizarEstadoOrden(nuevoEstado: EstadoOrden, mensajeNotificacion: string) {
    if (!orden?.id) return;
    setActualizandoEstado(true);

    try {
      // 1. Actualizar orden en Supabase
      const { error: ordErr } = await supabase
        .from("ordenes")
        .update({
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orden.id);

      if (ordErr) throw ordErr;

      // 2. Enviar mensaje del sistema al chat
      await supabase.from("mensajes_chat").insert([
        {
          tienda_id: orden.tienda_id,
          orden_id: orden.id,
          cliente_id: orden.cliente_id,
          remitente_rol: "sistema",
          mensaje: mensajeNotificacion,
          leido: true,
          created_at: new Date().toISOString(),
        },
      ]);

      showToast(`Orden actualizada a: "${nuevoEstado}"`, "success");
      onOrderUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar estado";
      console.error("Error:", err);
      showToast(msg, "error");
    } finally {
      setActualizandoEstado(false);
    }
  }

  if (!isOpen || !orden) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Encabezado del Drawer */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Orden #{orden.numero}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  {orden.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Coordinación y Verificación P2P de Pago por Encargo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha Resumen de la Orden */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-400 block font-medium">Cliente</span>
            <span className="text-white font-semibold truncate block">{orden.cliente_nombre}</span>
            <span className="text-slate-400 text-[11px] block">{orden.cliente_telefono || "Sin tel."}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Entrega / Agencia</span>
            <span className="text-cyan-400 font-bold uppercase block">{orden.metodo_entrega}</span>
            <span className="text-slate-400 text-[11px] truncate block">{orden.direccion_entrega || "Ocumare"}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Modalidad de Pago</span>
            <span className="text-amber-400 font-bold uppercase block">
              {orden.modalidad_pago === "abono" ? "50% Abono" : "Pago Total"}
            </span>
            <span className="text-slate-400 text-[11px] block font-mono">
              Tasa: Bs. {parseFloat(orden.tasa_cambio_bcv || "0").toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Monto a Verificar</span>
            <span className="text-emerald-400 font-extrabold text-sm block font-mono">
              {formatoUSD(orden.modalidad_pago === "abono" ? orden.monto_inicial_usd : orden.total_usd)}
            </span>
            <span className="text-slate-400 text-[10px] block font-mono">
              ({formatoVES(orden.modalidad_pago === "abono" ? orden.monto_inicial_ves : orden.total_ves)})
            </span>
          </div>
        </div>

        {/* Panel de Comprobante de Pago (si existe) */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Comprobante de Pago Reportado
            </span>
            {orden.comprobante_url && (
              <a
                href={orden.comprobante_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Abrir original</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {orden.comprobante_url ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-36 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={orden.comprobante_url}
                alt="Comprobante"
                className="w-full h-36 object-contain cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => setZoomComprobante(true)}
              />
              <button
                type="button"
                onClick={() => setZoomComprobante(true)}
                className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-medium text-xs transition-opacity"
              >
                <Eye className="w-4 h-4" />
                <span>Hacer zoom al comprobante</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              El cliente aún no ha adjuntado el capture de la transferencia o pago móvil.
            </div>
          )}
        </div>

        {/* Acciones Rápidas del Vendedor */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={actualizandoEstado || orden.estado === "pagada" || orden.estado === "abono_verificado"}
            onClick={() =>
              actualizarEstadoOrden(
                "abono_verificado",
                "✅ ¡Tu abono del 50% ha sido VERIFICADO y APROBADO por el vendedor! Tu encargo pasa a fase de preparación."
              )
            }
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs active:scale-95 transition-all disabled:opacity-40"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprobar Abono 50%</span>
          </button>

          <button
            type="button"
            disabled={actualizandoEstado || orden.estado === "despachado"}
            onClick={() => {
              const guia = prompt("Ingresa el número de guía de envío (Zoom / MRW):", "ZOOM-");
              actualizarEstadoOrden(
                "despachado",
                `📦 ¡Tu pedido ha sido DESPACHADO! Número de Guía: ${guia || "En proceso de confirmación"}. Agencia: ${orden.metodo_entrega.toUpperCase()}.`
              );
            }}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs active:scale-95 transition-all disabled:opacity-40"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Marcar Despachado</span>
          </button>

          <button
            type="button"
            disabled={actualizandoEstado || orden.estado === "completada" || orden.estado === "entregado"}
            onClick={() =>
              actualizarEstadoOrden(
                "completada",
                "🎉 ¡Pedido marcado como ENTREGADO y COMPLETADO! Muchas gracias por tu compra en OcumareHub."
              )
            }
            className="py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors disabled:opacity-40"
          >
            Completar
          </button>
        </div>

        {/* Área de Mensajes del Chat en Tiempo Real */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-900 to-slate-950">
          {mensajes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay mensajes en este chat aún.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Escribe un mensaje para coordinar la entrega o el pago con el comprador.
              </p>
            </div>
          ) : (
            mensajes.map((m) => {
              const esVendedor = m.remitente_rol === "vendedor";
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
                  className={`flex flex-col ${esVendedor ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                      esVendedor
                        ? "bg-cyan-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                    }`}
                  >
                    <span className="block text-[10px] font-bold opacity-75 mb-0.5">
                      {esVendedor ? "Tú (Vendedor)" : orden.cliente_nombre || "Cliente"}
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
          <input
            type="text"
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            placeholder="Escribe una respuesta al comprador..."
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={enviando || !nuevoMensaje.trim()}
            className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl active:scale-95 transition-all disabled:opacity-40"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

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
              alt="Comprobante en alta resolución"
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
