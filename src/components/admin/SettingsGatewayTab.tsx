"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Smartphone,
  Landmark,
  Coins,
  Store,
  Share2,
  Save,
  RefreshCw,
  Clock,
  Sparkles,
  Edit2,
  X,
  Loader2,
  MessageCircle,
  Mail,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  obtenerConfiguracionTienda,
  obtenerCuentasBancarias,
  guardarCuentaBancaria,
  eliminarCuentaBancaria,
  obtenerCanalesContacto,
  guardarCanalContacto,
  eliminarCanalContacto,
  guardarMarcaTienda,
  type CuentaBancaria,
  type CanalContacto,
} from "@/actions/config";
import {
  guardarPuntoEntregaAction,
  eliminarPuntoEntregaAction,
} from "@/actions/orders";
import { TasaBCVCard } from "./TasaBCVCard";

interface PuntoItem {
  id: string;
  nombre: string;
  direccion?: string | null;
  referencia?: string | null;
  horario?: string | null;
  activo: boolean;
}

interface SettingsGatewayTabProps {
  onTasaUpdated?: (nuevaTasa: number) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

const TIPO_CUENTA_LABELS: Record<string, string> = {
  pago_movil: "📱 Pago Móvil",
  transferencia: "🏦 Transferencia VES",
  binance: "₿ Binance/USDT",
  zelle: "💵 Zelle / USD",
  efectivo: "💵 Efectivo",
  otro: "💳 Otro",
};

const TIPO_CANAL_LABELS: Record<string, string> = {
  whatsapp: "📱 WhatsApp",
  instagram: "📸 Instagram",
  tiktok: "🎵 TikTok",
  telegram: "✈️ Telegram",
  facebook: "👤 Facebook",
  email: "✉️ Email",
  otro: "🔗 Otro",
};

function CuentaForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<CuentaBancaria>;
  onSave: (c: Omit<CuentaBancaria, "id">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState<CuentaBancaria["tipo"]>(initial?.tipo || "pago_movil");
  const [nombre, setNombre] = useState(initial?.nombre || "");
  const [datos, setDatos] = useState<Record<string, string>>(
    (initial?.datos as Record<string, string>) || {}
  );

  function setDato(key: string, val: string) {
    setDatos((prev) => ({ ...prev, [key]: val }));
  }

  const fieldsCls =
    "w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors";

  return (
    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Tipo de Cuenta
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as CuentaBancaria["tipo"])}
            className={fieldsCls}
          >
            {Object.entries(TIPO_CUENTA_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Nombre Visible
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Pago Móvil BDV Principal"
            className={fieldsCls}
          />
        </div>
      </div>

      {/* Campos dinámicos según tipo */}
      {tipo === "pago_movil" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Banco (ej. 0102 - BDV)" value={datos.banco || ""} onChange={(e) => setDato("banco", e.target.value)} className={fieldsCls} />
          <input type="text" placeholder="Teléfono (0412...)" value={datos.telefono || ""} onChange={(e) => setDato("telefono", e.target.value)} className={fieldsCls} />
          <input type="text" placeholder="Cédula / RIF" value={datos.cedula_rif || ""} onChange={(e) => setDato("cedula_rif", e.target.value)} className={fieldsCls} />
        </div>
      )}
      {tipo === "transferencia" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="Banco (ej. Banesco)" value={datos.banco || ""} onChange={(e) => setDato("banco", e.target.value)} className={fieldsCls} />
          <input type="text" placeholder="Número de cuenta (20 dígitos)" value={datos.numero_cuenta || ""} onChange={(e) => setDato("numero_cuenta", e.target.value)} className={fieldsCls} />
          <input type="text" placeholder="Beneficiario" value={datos.beneficiario || ""} onChange={(e) => setDato("beneficiario", e.target.value)} className={fieldsCls} />
          <input type="text" placeholder="RIF titular" value={datos.rif || ""} onChange={(e) => setDato("rif", e.target.value)} className={fieldsCls} />
        </div>
      )}
      {tipo === "binance" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="Binance Pay ID" value={datos.pay_id || ""} onChange={(e) => setDato("pay_id", e.target.value)} className={fieldsCls} />
          <input type="email" placeholder="Email Binance" value={datos.email || ""} onChange={(e) => setDato("email", e.target.value)} className={fieldsCls} />
        </div>
      )}
      {tipo === "zelle" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="email" placeholder="Email Zelle" value={datos.email || ""} onChange={(e) => setDato("email", e.target.value)} className={fieldsCls} />
          <input type="text" placeholder="Titular" value={datos.titular || ""} onChange={(e) => setDato("titular", e.target.value)} className={fieldsCls} />
        </div>
      )}
      {(tipo === "efectivo" || tipo === "otro") && (
        <textarea
          rows={2}
          placeholder="Instrucciones o descripción..."
          value={datos.instrucciones || datos.descripcion || ""}
          onChange={(e) => setDato(tipo === "efectivo" ? "instrucciones" : "descripcion", e.target.value)}
          className={fieldsCls}
        />
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium transition-colors hover:bg-slate-700">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave({ tipo, nombre, datos, activo: true, orden: 0 })}
          disabled={saving || !nombre.trim()}
          className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Cuenta
        </button>
      </div>
    </div>
  );
}

function CanalForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<CanalContacto>;
  onSave: (c: Omit<CanalContacto, "id">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState<CanalContacto["tipo"]>(initial?.tipo || "whatsapp");
  const [valor, setValor] = useState(initial?.valor || "");
  const [etiqueta, setEtiqueta] = useState(initial?.etiqueta || "");

  const fieldsCls =
    "w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors";

  const placeholders: Record<string, string> = {
    whatsapp: "+58 412 1234567",
    instagram: "@usuario",
    tiktok: "@usuario",
    telegram: "@usuario o enlace t.me/...",
    facebook: "URL de página o @username",
    email: "correo@dominio.com",
    otro: "URL o contacto",
  };

  return (
    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Tipo de Canal
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as CanalContacto["tipo"])}
            className={fieldsCls}
          >
            {Object.entries(TIPO_CANAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Etiqueta (ej. Ventas, Soporte)
          </label>
          <input
            type="text"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Ventas, Soporte, Despachos..."
            className={fieldsCls}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          {tipo === "whatsapp" ? "Número" : tipo === "email" ? "Correo" : "Valor / URL"}
        </label>
        <input
          type={tipo === "email" ? "email" : "text"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={placeholders[tipo] || ""}
          className={fieldsCls}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium transition-colors hover:bg-slate-700">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave({ tipo, valor, etiqueta, activo: true, orden: 0 })}
          disabled={saving || !valor.trim()}
          className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Canal
        </button>
      </div>
    </div>
  );
}

export function SettingsGatewayTab({ onTasaUpdated, showToast }: SettingsGatewayTabProps) {
  const [activeSection, setActiveSection] = useState<"pagos" | "puntos" | "canales" | "marca">("pagos");
  const [loading, setLoading] = useState(true);

  // Cuentas Bancarias
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [showNuevaCuenta, setShowNuevaCuenta] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaBancaria | null>(null);
  const [savingCuenta, setSavingCuenta] = useState(false);

  // Puntos de Entrega
  const [puntos, setPuntos] = useState<PuntoItem[]>([]);
  const [nuevoNombrePunto, setNuevoNombrePunto] = useState("");
  const [nuevaDirPunto, setNuevaDirPunto] = useState("");
  const [nuevoHorarioPunto, setNuevoHorarioPunto] = useState("");
  const [savingPunto, setSavingPunto] = useState(false);

  // Canales de Contacto
  const [canales, setCanales] = useState<CanalContacto[]>([]);
  const [showNuevoCanal, setShowNuevoCanal] = useState(false);
  const [editingCanal, setEditingCanal] = useState<CanalContacto | null>(null);
  const [savingCanal, setSavingCanal] = useState(false);

  // Marca
  const [nombreTienda, setNombreTienda] = useState("Encargos Boutique");
  const [slogan, setSlogan] = useState("Tu Boutique Digital de Encargos & Despachos Asegurados");
  const [telefonoTienda, setTelefonoTienda] = useState("");
  const [savingMarca, setSavingMarca] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setLoading(true);
    try {
      const [cuentasData, canalesData, conf] = await Promise.all([
        obtenerCuentasBancarias(),
        obtenerCanalesContacto(),
        obtenerConfiguracionTienda(),
      ]);
      setCuentas(cuentasData);
      setCanales(canalesData);
      if (conf) {
        if ((conf as any).nombre_tienda) setNombreTienda((conf as any).nombre_tienda);
        if ((conf as any).slogan) setSlogan((conf as any).slogan);
        if ((conf as any).telefono_tienda) setTelefonoTienda((conf as any).telefono_tienda);
      }
      await cargarPuntos();
    } catch (e) {
      console.warn("Error cargando configuración:", e);
    } finally {
      setLoading(false);
    }
  }

  async function cargarPuntos() {
    try {
      const { data } = await supabase
        .from("puntos_entrega")
        .select("*")
        .order("nombre", { ascending: true });
      if (data) setPuntos(data as PuntoItem[]);
    } catch (e) {
      console.warn("Error cargando puntos:", e);
    }
  }

  // ── Cuentas ───────────────────────────────────────────────
  async function handleGuardarCuenta(cuenta: Omit<CuentaBancaria, "id">) {
    setSavingCuenta(true);
    try {
      const payload: CuentaBancaria = editingCuenta
        ? { ...editingCuenta, ...cuenta }
        : cuenta;
      const res = await guardarCuentaBancaria(payload);
      if (res.success) {
        showToast("✅ Cuenta guardada exitosamente", "success");
        const nuevas = await obtenerCuentasBancarias();
        setCuentas(nuevas);
        setShowNuevaCuenta(false);
        setEditingCuenta(null);
      } else {
        showToast(res.error || "Error al guardar cuenta", "error");
      }
    } finally {
      setSavingCuenta(false);
    }
  }

  async function handleEliminarCuenta(id: string) {
    if (!confirm("¿Eliminar esta cuenta bancaria?")) return;
    const res = await eliminarCuentaBancaria(id);
    if (res.success) {
      showToast("Cuenta eliminada", "info");
      setCuentas((prev) => prev.filter((c) => c.id !== id));
    } else {
      showToast(res.error || "Error al eliminar", "error");
    }
  }

  // ── Canales ────────────────────────────────────────────────
  async function handleGuardarCanal(canal: Omit<CanalContacto, "id">) {
    setSavingCanal(true);
    try {
      const payload: CanalContacto = editingCanal
        ? { ...editingCanal, ...canal }
        : canal;
      const res = await guardarCanalContacto(payload);
      if (res.success) {
        showToast("✅ Canal guardado exitosamente", "success");
        const nuevos = await obtenerCanalesContacto();
        setCanales(nuevos);
        setShowNuevoCanal(false);
        setEditingCanal(null);
      } else {
        showToast(res.error || "Error al guardar canal", "error");
      }
    } finally {
      setSavingCanal(false);
    }
  }

  async function handleEliminarCanal(id: string) {
    if (!confirm("¿Eliminar este canal de contacto?")) return;
    const res = await eliminarCanalContacto(id!);
    if (res.success) {
      showToast("Canal eliminado", "info");
      setCanales((prev) => prev.filter((c) => c.id !== id));
    } else {
      showToast(res.error || "Error al eliminar", "error");
    }
  }

  // ── Puntos ─────────────────────────────────────────────────
  async function handleAgregarPunto() {
    if (!nuevoNombrePunto.trim()) {
      showToast("El nombre del punto es obligatorio", "error");
      return;
    }
    setSavingPunto(true);
    try {
      const res = await guardarPuntoEntregaAction({
        nombre: nuevoNombrePunto.trim(),
        direccion: nuevaDirPunto.trim(),
        horario: nuevoHorarioPunto.trim() || undefined,
      });
      if (res.success) {
        showToast("✅ Punto de entrega guardado", "success");
        setNuevoNombrePunto("");
        setNuevaDirPunto("");
        setNuevoHorarioPunto("");
        await cargarPuntos();
      } else {
        showToast(res.error || "Error al guardar punto", "error");
      }
    } finally {
      setSavingPunto(false);
    }
  }

  async function handleEliminarPunto(id: string) {
    if (!confirm("¿Eliminar este punto de entrega?")) return;
    const res = await eliminarPuntoEntregaAction(id);
    if (res.success) {
      showToast("Punto eliminado", "info");
      setPuntos((prev) => prev.filter((p) => p.id !== id));
    } else {
      showToast(res.error || "Error al eliminar", "error");
    }
  }

  // ── Marca ──────────────────────────────────────────────────
  async function handleGuardarMarca() {
    setSavingMarca(true);
    try {
      const res = await guardarMarcaTienda({
        nombre_tienda: nombreTienda.trim(),
        slogan: slogan.trim(),
        telefono_tienda: telefonoTienda.trim(),
      });
      if (res.success) {
        showToast("✅ Marca guardada exitosamente", "success");
      } else {
        showToast(res.error || "Error al guardar marca", "error");
      }
    } finally {
      setSavingMarca(false);
    }
  }

  const sectionBtnCls = (s: string) =>
    `px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
      activeSection === s
        ? "bg-[#064E3B] text-[#84CC16] border border-[#0D6E53]"
        : "text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
    }`;

  const inputCls =
    "w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de sección */}
      <div className="flex flex-wrap gap-2">
        <button className={sectionBtnCls("pagos")} onClick={() => setActiveSection("pagos")}>
          <Landmark className="w-3.5 h-3.5 inline mr-1.5" />Cuentas Bancarias
        </button>
        <button className={sectionBtnCls("puntos")} onClick={() => setActiveSection("puntos")}>
          <MapPin className="w-3.5 h-3.5 inline mr-1.5" />Puntos de Entrega
        </button>
        <button className={sectionBtnCls("canales")} onClick={() => setActiveSection("canales")}>
          <Share2 className="w-3.5 h-3.5 inline mr-1.5" />Canales & Redes
        </button>
        <button className={sectionBtnCls("marca")} onClick={() => setActiveSection("marca")}>
          <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />Marca & Tasa BCV
        </button>
      </div>

      {/* ── 1. CUENTAS BANCARIAS ── */}
      {activeSection === "pagos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Métodos de Pago & Cuentas Bancarias</h2>
            <button
              onClick={() => { setShowNuevaCuenta(true); setEditingCuenta(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Agregar Cuenta
            </button>
          </div>

          {showNuevaCuenta && (
            <CuentaForm
              onSave={handleGuardarCuenta}
              onCancel={() => setShowNuevaCuenta(false)}
              saving={savingCuenta}
            />
          )}

          {cuentas.length === 0 && !showNuevaCuenta && (
            <div className="text-center py-10 text-slate-500">
              <Landmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay cuentas configuradas todavía.</p>
              <p className="text-xs mt-1">Pulsa "Agregar Cuenta" para añadir tu primer método de pago.</p>
            </div>
          )}

          <div className="space-y-3">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id}>
                {editingCuenta?.id === cuenta.id ? (
                  <CuentaForm
                    initial={editingCuenta || undefined}
                    onSave={handleGuardarCuenta}
                    onCancel={() => setEditingCuenta(null)}
                    saving={savingCuenta}
                  />
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                          {TIPO_CUENTA_LABELS[cuenta.tipo] || cuenta.tipo}
                        </span>
                        <span className="text-sm font-bold text-white truncate">{cuenta.nombre}</span>
                      </div>
                      {cuenta.datos && Object.keys(cuenta.datos).length > 0 && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {Object.entries(cuenta.datos as Record<string, string>).map(([k, v]) => (
                            <span key={k} className="text-xs text-slate-400">
                              <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                              <span className="text-slate-200 font-mono">{v}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingCuenta(cuenta)}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminarCuenta(cuenta.id!)}
                        className="p-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. PUNTOS DE ENTREGA ── */}
      {activeSection === "puntos" && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />Puntos Seguros de Entrega
          </h2>

          {/* Formulario nuevo punto */}
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agregar Punto</p>
            <input type="text" value={nuevoNombrePunto} onChange={(e) => setNuevoNombrePunto(e.target.value)} placeholder="Nombre del punto (ej. Plaza Bolívar Ocumare)" className={inputCls} />
            <input type="text" value={nuevaDirPunto} onChange={(e) => setNuevaDirPunto(e.target.value)} placeholder="Dirección y referencia" className={inputCls} />
            <input type="text" value={nuevoHorarioPunto} onChange={(e) => setNuevoHorarioPunto(e.target.value)} placeholder="Horario (ej. Lunes a Sábado 9am-5pm)" className={inputCls} />
            <button
              onClick={handleAgregarPunto}
              disabled={savingPunto || !nuevoNombrePunto.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPunto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Agregar Punto de Entrega
            </button>
          </div>

          {/* Lista */}
          {puntos.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-6">No hay puntos configurados.</p>
          ) : (
            <div className="space-y-3">
              {puntos.map((p) => (
                <div key={p.id} className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{p.nombre}</p>
                    {p.direccion && <p className="text-xs text-slate-400 mt-0.5">{p.direccion}</p>}
                    {p.horario && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{p.horario}
                      </p>
                    )}
                  </div>
                  <button onClick={() => handleEliminarPunto(p.id)} className="p-2 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. CANALES & REDES ── */}
      {activeSection === "canales" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Canales de Soporte & Redes Sociales</h2>
            <button
              onClick={() => { setShowNuevoCanal(true); setEditingCanal(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Agregar Canal
            </button>
          </div>

          {showNuevoCanal && (
            <CanalForm
              onSave={handleGuardarCanal}
              onCancel={() => setShowNuevoCanal(false)}
              saving={savingCanal}
            />
          )}

          {canales.length === 0 && !showNuevoCanal && (
            <div className="text-center py-10 text-slate-500">
              <Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay canales configurados todavía.</p>
              <p className="text-xs mt-1">Agrega tus WhatsApp, Instagram, TikTok y más.</p>
            </div>
          )}

          <div className="space-y-3">
            {canales.map((canal) => (
              <div key={canal.id}>
                {editingCanal?.id === canal.id ? (
                  <CanalForm
                    initial={editingCanal || undefined}
                    onSave={handleGuardarCanal}
                    onCancel={() => setEditingCanal(null)}
                    saving={savingCanal}
                  />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-lg shrink-0">
                      {canal.tipo === "whatsapp" ? "📱" : canal.tipo === "instagram" ? "📸" : canal.tipo === "tiktok" ? "🎵" : canal.tipo === "telegram" ? "✈️" : canal.tipo === "facebook" ? "👤" : canal.tipo === "email" ? "✉️" : "🔗"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          {TIPO_CANAL_LABELS[canal.tipo] || canal.tipo}
                        </span>
                        {canal.etiqueta && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
                            {canal.etiqueta}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-mono text-white truncate mt-0.5">{canal.valor}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingCanal(canal)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleEliminarCanal(canal.id!)} className="p-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. MARCA ── */}
      {activeSection === "marca" && (
        <div className="space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />Personalizador de Marca & Tasa BCV
          </h2>

          <TasaBCVCard onTasaUpdated={onTasaUpdated} showToast={showToast} />

          <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-4">
            <p className="text-sm font-bold text-slate-300">Datos de la Tienda</p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nombre Comercial
              </label>
              <input type="text" value={nombreTienda} onChange={(e) => setNombreTienda(e.target.value)} className={inputCls} placeholder="Encargos Boutique" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Eslogan
              </label>
              <input type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} className={inputCls} placeholder="Tu tienda de encargos de confianza" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Teléfono Principal
              </label>
              <input type="text" value={telefonoTienda} onChange={(e) => setTelefonoTienda(e.target.value)} className={inputCls} placeholder="+58 412 1234567" />
            </div>
            <button
              onClick={handleGuardarMarca}
              disabled={savingMarca}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingMarca ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Marca
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
