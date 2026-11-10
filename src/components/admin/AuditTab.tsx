"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  RefreshCw,
  FileText,
  ShieldCheck,
  User,
  Database,
  Calendar,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface AuditoriaLogItem {
  id: string | number;
  email?: string | null;
  accion: string;
  tabla?: string | null;
  registro_id?: string | null;
  detalles: any;
  created_at: string;
}

interface AuditTabProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function AuditTab({ showToast }: AuditTabProps) {
  const [logs, setLogs] = useState<AuditoriaLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    cargarAuditoria();
  }, []);

  async function cargarAuditoria() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("auditoria_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Aviso al consultar auditoria_logs:", error.message);
        // Si no existen filas o falla, inicializar vacío
        setLogs([]);
      } else if (data) {
        const parsed: AuditoriaLogItem[] = (Array.isArray(data) ? data : []).map((row) => {
          let detallesParsed = row.detalles;
          if (typeof detallesParsed === "string") {
            try {
              detallesParsed = JSON.parse(detallesParsed);
            } catch {
              // mantener string si no es JSON válido
            }
          }
          return {
            id: row.id,
            email: row.email || "admin@ocumarehub.com",
            accion: row.accion || "evento_sistema",
            tabla: row.tabla || "general",
            registro_id: row.registro_id || null,
            detalles: detallesParsed,
            created_at: row.created_at || new Date().toISOString(),
          };
        });
        setLogs(parsed);
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
    const email = (log.email || "").toLowerCase();
    const accion = (log.accion || "").toLowerCase();
    const tabla = (log.tabla || "").toLowerCase();
    const detallesStr = JSON.stringify(log.detalles || "").toLowerCase();

    return (
      searchLower === "" ||
      email.includes(searchLower) ||
      accion.includes(searchLower) ||
      tabla.includes(searchLower) ||
      detallesStr.includes(searchLower)
    );
  });

  function getBadgeColor(accion: string) {
    const act = (accion || "").toLowerCase();
    if (act.includes("cread") || act.includes("activad")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (act.includes("actualiz") || act.includes("cambiado")) {
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
    if (act.includes("elimin") || act.includes("cancelad") || act.includes("desactivad")) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }
    if (act.includes("pago") || act.includes("pedido") || act.includes("tasa")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-slate-700/20 text-slate-300 border-slate-700/30";
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Buscador */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Registro y Auditoría de Operaciones
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historial inmutable de cambios en productos, categorías, tasas BCV y órdenes registradas en Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, acción, tabla..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <button
            onClick={cargarAuditoria}
            title="Refrescar auditoría"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Tabla de Registros */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
          <p className="text-sm">Consultando registros de auditoría de Supabase...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No hay registros de auditoría que mostrar</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? "No se encontraron eventos coincidentes con la búsqueda." : "Las acciones administrativas se registrarán aquí automáticamente."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-mono text-[11px]">
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Admin / Usuario</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Tabla</th>
                <th className="py-3 px-4">ID Registro</th>
                <th className="py-3 px-4">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.map((log) => {
                const detallesText =
                  typeof log.detalles === "object" && log.detalles !== null
                    ? JSON.stringify(log.detalles, null, 1)
                    : String(log.detalles || "Sin detalles");

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Fecha y hora */}
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("es-VE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    {/* Email del actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.email || "admin@ocumarehub.com"}</span>
                      </div>
                    </td>

                    {/* Acción con Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getBadgeColor(
                          log.accion
                        )}`}
                      >
                        {log.accion}
                      </span>
                    </td>

                    {/* Tabla Afectada */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                        <Database className="w-3 h-3 text-cyan-400" />
                        <span>{log.tabla || "general"}</span>
                      </div>
                    </td>

                    {/* Registro ID */}
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {log.registro_id ? (
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                          {log.registro_id}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Detalles */}
                    <td className="py-3 px-4 text-[11px]">
                      <code className="bg-slate-950/80 border border-slate-800/80 px-2 py-1 rounded text-slate-300 font-mono block max-w-md truncate" title={detallesText}>
                        {detallesText}
                      </code>
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