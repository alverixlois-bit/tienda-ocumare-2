"use client";

import React, { useState, useEffect } from "react";
import { History, Search, RefreshCw, FileText, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { AuditoriaOrdenRow } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";

interface AuditTabProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function AuditTab({ showToast }: AuditTabProps) {
  const [logs, setLogs] = useState<AuditoriaOrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    cargarAuditoria();
  }, []);

  async function cargarAuditoria() {
    setLoading(true);
    try {
      const tiendaId = process.env.NEXT_PUBLIC_TIENDA_ID || "11111111-1111-4111-8111-111111111111";

      const { data: auditData } = await supabase
        .from("auditoria_ordenes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (auditData && auditData.length > 0) {
        setLogs(auditData);
      } else {
        // Fallback a auditoria_logs existente en Supabase
        const { data: logsData } = await supabase
          .from("auditoria_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (logsData && logsData.length > 0) {
          const mapped: AuditoriaOrdenRow[] = logsData.map((l) => ({
            id: String(l.id),
            orden_id: "",
            tienda_id: tiendaId,
            numero_orden: `LOG-${String(l.id)}`,
            accion: ((l.accion || "").toLowerCase().includes("actualiz") ? "actualizada" : "creada") as "creada" | "actualizada",
            estado_anterior: null,
            estado_nuevo: "procesando",
            cambios: (typeof l.detalles === "object" && l.detalles !== null ? l.detalles : { detalle: l.detalles }) as any,
            actor_id: null,
            created_at: l.created_at || new Date().toISOString(),
          }));
          setLogs(mapped);
        } else {
          setLogs([]);
        }
      }
    } catch (err) {
      console.error("Error al cargar auditoría:", err);
      showToast("Error al cargar historial de auditoría", "error");
    } finally {
      setLoading(false);
    }
  }

  const listaLogs = Array.isArray(logs) ? logs : [];
  const searchLower = (search || "").toLowerCase().trim();

  const filteredLogs = listaLogs.filter((log) => {
    if (!log) return false;
    const num = (log.numero_orden || "").toLowerCase();
    const accion = (log.accion || "").toLowerCase();
    return searchLower === "" || num.includes(searchLower) || accion.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* Controles de Auditoría */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar evento por # Orden..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <button
          onClick={cargarAuditoria}
          title="Refrescar auditoría"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar Historial</span>
        </button>
      </div>

      {/* Tabla de Registros */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
          <p className="text-sm">Consultando registros de auditoría de Supabase...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No hay registros de auditoría aún</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Cada vez que un cliente realice un pedido o modifiques su estado, se registrará aquí de forma inmutable.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-mono text-[11px]">
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Transición de Estado</th>
                <th className="py-3 px-4">Detalles Registrados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.map((log) => {
                const tieneCambios = log.cambios && Object.keys(log.cambios).length > 0;

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("es-VE")}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      #{log.numero_orden}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.accion === "creada"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {log.accion}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-slate-400">
                          {log.estado_anterior || "(Inicial)"}
                        </span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <span className="font-bold text-emerald-400">{log.estado_nuevo}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {tieneCambios ? (
                        <code className="bg-slate-950 px-2 py-1 rounded text-cyan-300">
                          {JSON.stringify(log.cambios)}
                        </code>
                      ) : (
                        <span className="text-slate-500 italic">Sin datos adicionales</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
