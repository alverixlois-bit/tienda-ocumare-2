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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  obtenerConfiguracionTienda,
  actualizarMetodosPago,
  actualizarRedesYContactos,
  actualizarDatosTienda,
} from "@/actions/config";
import {
  guardarPuntoEntregaAction,
  eliminarPuntoEntregaAction,
} from "@/actions/orders";

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

export function SettingsGatewayTab({ showToast }: SettingsGatewayTabProps) {
  const [activeSection, setActiveSection] = useState<"pagos" | "puntos" | "canales" | "marca">("pagos");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // 1. Datos Bancarios
  const [pagoMovilBanco, setPagoMovilBanco] = useState("0102 - Banco de Venezuela");
  const [pagoMovilTelefono, setPagoMovilTelefono] = useState("0412 123 4567");
  const [pagoMovilCedula, setPagoMovilCedula] = useState("J-50123984-1");

  const [transferenciaBanco, setTransferenciaBanco] = useState("0134 - Banesco Banco Universal");
  const [transferenciaCuenta, setTransferenciaCuenta] = useState("0134 0012 98 0001234567");
  const [transferenciaBeneficiario, setTransferenciaBeneficiario] = useState("Encargos Boutique C.A.");
  const [transferenciaRif, setTransferenciaRif] = useState("J-50123984-1");

  const [binancePayId, setBinancePayId] = useState("49812903");
  const [binancePayEmail, setBinancePayEmail] = useState("finanzas@encargosboutique.ve");
  const [otrosMetodos, setOtrosMetodos] = useState("Zelle disponible previa confirmación. Efectivo USD en entregas personales.");

  // 2. Puntos Seguros de Entrega
  const [puntos, setPuntos] = useState<PuntoItem[]>([]);
  const [nuevoNombrePunto, setNuevoNombrePunto] = useState("");
  const [nuevaDirPunto, setNuevaDirPunto] = useState("");
  const [nuevoHorarioPunto, setNuevoHorarioPunto] = useState("");

  // 3. Canales y Redes
  const [whatsappVentas, setWhatsappVentas] = useState("0412 123 4567");
  const [whatsappDespacho, setWhatsappDespacho] = useState("0414 990 8181");
  const [instagramUrl, setInstagramUrl] = useState("@encargosboutique.ve");
  const [tiktokUrl, setTiktokUrl] = useState("@encargosboutique");

  // 4. Marca
  const [nombreTienda, setNombreTienda] = useState("Encargos Boutique");
  const [slogan, setSlogan] = useState("Tu Boutique Digital de Encargos & Despachos Asegurados");

  const supabase = createClient();

  useEffect(() => {
    cargarConfig();
    cargarPuntos();
  }, []);

  async function cargarConfig() {
    setLoading(true);
    try {
      const conf = await obtenerConfiguracionTienda();
      if (conf) {
        if (conf.pago_movil_banco) setPagoMovilBanco(conf.pago_movil_banco);
        if (conf.pago_movil_telefono) setPagoMovilTelefono(conf.pago_movil_telefono);
        if (conf.pago_movil_cedula) setPagoMovilCedula(conf.pago_movil_cedula);

        if (conf.transferencia_banco) setTransferenciaBanco(conf.transferencia_banco);
        if (conf.transferencia_cuenta) setTransferenciaCuenta(conf.transferencia_cuenta);
        if (conf.transferencia_beneficiario) setTransferenciaBeneficiario(conf.transferencia_beneficiario);
        if (conf.transferencia_rif) setTransferenciaRif(conf.transferencia_rif);

        if (conf.binance_pay_id) setBinancePayId(conf.binance_pay_id);
        if (conf.binance_pay_email) setBinancePayEmail(conf.binance_pay_email);
        if (conf.otros_metodos_pago) setOtrosMetodos(conf.otros_metodos_pago);

        if (conf.whatsapp_1) setWhatsappVentas(conf.whatsapp_1);
        if (conf.whatsapp_2) setWhatsappDespacho(conf.whatsapp_2);
        if (conf.instagram_url) setInstagramUrl(conf.instagram_url);
        if (conf.tiktok_url) setTiktokUrl(conf.tiktok_url);
        if ((conf as any).nombre) setNombreTienda((conf as any).nombre);
      }
    } catch (e) {
      console.warn("Aviso cargando config:", e);
    } finally {
      setLoading(false);
    }
  }

  async function cargarPuntos() {
    try {
      const { data } = await supabase.from("puntos_entrega").select("*").order("created_at", { ascending: true });
      if (Array.isArray(data) && data.length > 0) {
        setPuntos(data as PuntoItem[]);
      } else {
        setPuntos([
          { id: "1", nombre: "Plaza Bolívar Ocumare (Kiosco Central)", direccion: "Casco Central Ocumare", horario: "Lun-Sáb 9:00 AM - 4:00 PM", activo: true },
          { id: "2", nombre: "C.C. Colonial - Entrada Principal", direccion: "Frente a Farmatodo", horario: "Lun-Sáb 10:00 AM - 5:00 PM", activo: true },
          { id: "3", nombre: "Estación Ferrocarril Charallave Sur", direccion: "Torniquetes Mezzanina", horario: "Lun-Vie 11:00 AM - 3:00 PM", activo: true },
        ]);
      }
    } catch {
      // ignore
    }
  }

  async function handleGuardarPagos(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append("pago_movil_banco", pagoMovilBanco);
      fd.append("pago_movil_telefono", pagoMovilTelefono);
      fd.append("pago_movil_cedula", pagoMovilCedula);

      fd.append("transferencia_banco", transferenciaBanco);
      fd.append("transferencia_cuenta", transferenciaCuenta);
      fd.append("transferencia_beneficiario", transferenciaBeneficiario);
      fd.append("transferencia_rif", transferenciaRif);

      fd.append("binance_pay_email", binancePayEmail);
      fd.append("binance_pay_id", binancePayId);
      fd.append("otros_metodos_pago", otrosMetodos);

      const res = await actualizarMetodosPago(fd);
      if (res.success) {
        showToast("Métodos de pago guardados exitosamente", "success");
      } else {
        showToast(res.error || "Error al guardar pagos", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al guardar pagos", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function handleCrearPunto(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombrePunto.trim()) return;

    try {
      const res = await guardarPuntoEntregaAction({
        nombre: nuevoNombrePunto.trim(),
        direccion: nuevaDirPunto.trim(),
        horario: nuevoHorarioPunto.trim(),
        activo: true,
      });

      if (res.success) {
        showToast("Punto seguro de entrega creado", "success");
        setNuevoNombrePunto("");
        setNuevaDirPunto("");
        setNuevoHorarioPunto("");
        cargarPuntos();
      } else {
        showToast(res.error || "Error al crear punto", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  }

  async function handleEliminarPunto(id: string) {
    if (!confirm("¿Deseas eliminar este punto seguro de entrega?")) return;
    try {
      const res = await eliminarPuntoEntregaAction(id);
      if (res.success) {
        showToast("Punto de entrega eliminado", "success");
        cargarPuntos();
      } else {
        showToast(res.error || "Error al eliminar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  }

  async function handleGuardarCanales(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append("whatsapp_1", whatsappVentas);
      fd.append("whatsapp_1_nombre", "Ventas");
      fd.append("whatsapp_2", whatsappDespacho);
      fd.append("whatsapp_2_nombre", "Despacho");
      fd.append("instagram_url", instagramUrl);
      fd.append("tiktok_url", tiktokUrl);

      const res = await actualizarRedesYContactos(fd);
      if (res.success) {
        showToast("Canales de atención guardados con éxito", "success");
      } else {
        showToast(res.error || "Error al guardar canales", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarMarca(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await actualizarDatosTienda({
        nombre: nombreTienda.trim(),
        telefono: whatsappVentas.trim(),
        modoOfertas: false,
        permiteAbono: true,
      });
      if (res.success) {
        showToast("Branding de la tienda actualizado", "success");
      } else {
        showToast(res.error || "Error al actualizar branding", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error", "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Selector de Subsecciones Stitch */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: "pagos", label: "Cuentas Bancarias & Pagos", icon: Landmark },
          { id: "puntos", label: "Puntos Seguros de Entrega", icon: MapPin },
          { id: "canales", label: "Canales de Soporte & Redes", icon: Share2 },
          { id: "marca", label: "Personalizador de Marca", icon: Store },
        ].map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-display font-bold text-xs whitespace-nowrap transition-all ${
                activeSection === sec.id
                  ? "bg-[#064E3B] text-[#84CC16] border border-[#0D6E53] shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sección 1: Cuentas Bancarias */}
      {activeSection === "pagos" && (
        <form onSubmit={handleGuardarPagos} className="space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#84CC16] text-[#14532D] flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-white text-sm">
                  Configuración de Pago Móvil (VES)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Banco Receptor:</label>
                <input
                  type="text"
                  value={pagoMovilBanco}
                  onChange={(e) => setPagoMovilBanco(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Teléfono Asociado:</label>
                <input
                  type="text"
                  value={pagoMovilTelefono}
                  onChange={(e) => setPagoMovilTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Cédula / RIF:</label>
                <input
                  type="text"
                  value={pagoMovilCedula}
                  onChange={(e) => setPagoMovilCedula(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Landmark className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-white text-sm">
                Transferencia Bancaria Nacional (VES)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Banco:</label>
                <input
                  type="text"
                  value={transferenciaBanco}
                  onChange={(e) => setTransferenciaBanco(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Número de Cuenta (20 dígitos):</label>
                <input
                  type="text"
                  value={transferenciaCuenta}
                  onChange={(e) => setTransferenciaCuenta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Beneficiario:</label>
                <input
                  type="text"
                  value={transferenciaBeneficiario}
                  onChange={(e) => setTransferenciaBeneficiario(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">RIF / Cédula Titular:</label>
                <input
                  type="text"
                  value={transferenciaRif}
                  onChange={(e) => setTransferenciaRif(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-white text-sm">
                Binance Pay &amp; Otros Métodos (Zelle, Efectivo)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Binance Pay ID:</label>
                <input
                  type="text"
                  value={binancePayId}
                  onChange={(e) => setBinancePayId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Email Registrado en Binance:</label>
                <input
                  type="text"
                  value={binancePayEmail}
                  onChange={(e) => setBinancePayEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Instrucciones Adicionales (Efectivo / Zelle):
              </label>
              <textarea
                rows={2}
                value={otrosMetodos}
                onChange={(e) => setOtrosMetodos(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-3.5 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Ajustes de Pago y Bancos</span>
          </button>
        </form>
      )}

      {/* Sección 2: Puntos Seguros de Entrega */}
      {activeSection === "puntos" && (
        <div className="space-y-5">
          {/* Formulario nuevo punto */}
          <form onSubmit={handleCrearPunto} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-sm">
                  Agregar Punto Seguro de Entrega
                </h3>
                <span className="text-[11px] text-slate-400">
                  Puntos con vigilancia y coordinación para retiro con PIN
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nombre del Punto *</label>
                <input
                  type="text"
                  required
                  value={nuevoNombrePunto}
                  onChange={(e) => setNuevoNombrePunto(e.target.value)}
                  placeholder="Ej: C.C. Paseo del Tuy (Nivel 1)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Dirección / Referencia</label>
                <input
                  type="text"
                  value={nuevaDirPunto}
                  onChange={(e) => setNuevaDirPunto(e.target.value)}
                  placeholder="Ej: Frente a la feria de comida"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Horarios Disponibles</label>
                <input
                  type="text"
                  value={nuevoHorarioPunto}
                  onChange={(e) => setNuevoHorarioPunto(e.target.value)}
                  placeholder="Ej: Lun-Sáb 10:00 AM - 4:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-display font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Punto Seguro</span>
            </button>
          </form>

          {/* Lista de Puntos */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <h4 className="font-display font-bold text-white text-sm">
              Puntos Pre-Aprobados Activos ({puntos.length})
            </h4>

            <div className="space-y-2.5">
              {puntos.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">{p.nombre}</span>
                    <span className="text-[11px] text-slate-400 block">
                      {p.direccion || "Ocumare Centro"} &bull; {p.horario || "Horario comercial"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEliminarPunto(p.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    title="Eliminar punto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección 3: Canales y Redes */}
      {activeSection === "canales" && (
        <form onSubmit={handleGuardarCanales} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-white text-sm">
            Canales de Atención Oficial &amp; Redes Sociales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">WhatsApp Ventas 1 (Principal):</label>
              <input
                type="text"
                value={whatsappVentas}
                onChange={(e) => setWhatsappVentas(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">WhatsApp Despachos 2:</label>
              <input
                type="text"
                value={whatsappDespacho}
                onChange={(e) => setWhatsappDespacho(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Instagram (@usuario):</label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">TikTok (@usuario):</label>
              <input
                type="text"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-3 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Canales de Atención</span>
          </button>
        </form>
      )}

      {/* Sección 4: Personalizador de Marca */}
      {activeSection === "marca" && (
        <form onSubmit={handleGuardarMarca} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-white text-sm">
            Personalizador de Marca e Identidad Boutique
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nombre Comercial de la Tienda:</label>
              <input
                type="text"
                value={nombreTienda}
                onChange={(e) => setNombreTienda(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Slogan Promocional:</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-[#84CC16]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-3 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Ajustes de Marca</span>
          </button>
        </form>
      )}
    </div>
  );
}
