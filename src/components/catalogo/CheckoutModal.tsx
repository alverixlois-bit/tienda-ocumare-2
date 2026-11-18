"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ShieldCheck,
  Truck,
  User,
  Phone,
  MapPin,
  CreditCard,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Landmark,
  Coins,
  UploadCloud,
  FileCheck2,
  AlertCircle,
  KeyRound,
  Calendar,
  Clock,
  Banknote,
  DollarSign,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import { MetodoEntrega, PuntoEntregaRow } from "@/types/database.types";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { obtenerConfiguracionTienda, ConfiguracionTiendaData } from "@/actions/config";
import { crearPedidoAction } from "@/actions/orders";

const DEFAULT_PUNTOS_ENTREGA = [
  { id: "pto-1", nombre: "Plaza Bolívar Ocumare (Kiosco Central al lado de la estatua)", direccion: "Casco Central Ocumare", horario: "Lun-Sáb 9:00 AM - 4:00 PM" },
  { id: "pto-2", nombre: "C.C. Colonial - Entrada Principal (Frente a Farmatodo)", direccion: "Av. Miranda Centro", horario: "Lun-Sáb 10:00 AM - 5:00 PM" },
  { id: "pto-3", nombre: "Estación Ferrocarril Charallave Sur (Nivel Mezzanina)", direccion: "Terminal Charallave", horario: "Lun-Vie 11:00 AM - 3:00 PM" },
];

export function CheckoutModal() {
  const router = useRouter();
  const {
    items,
    isCheckoutOpen,
    setIsCheckoutOpen,
    tipoPago,
    setTipoPago,
    subtotalUSD,
    subtotalVES,
    abonoUSD,
    abonoVES,
    saldoPendienteUSD,
    saldoPendienteVES,
    montoPagarUSD,
    montoPagarVES,
    tasaBcv,
    limpiarCarrito,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [metodoEntrega, setMetodoEntrega] = useState<MetodoEntrega>("zoom");
  const [notas, setNotas] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Puntos Seguros y Entrega Personal
  const [puntosEntrega, setPuntosEntrega] = useState<any[]>(DEFAULT_PUNTOS_ENTREGA);
  const [puntoSeleccionadoId, setPuntoSeleccionadoId] = useState(DEFAULT_PUNTOS_ENTREGA[0].id);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("10:00 AM - 12:00 PM");
  const [metodoPagoSitio, setMetodoPagoSitio] = useState("efectivo_usd");
  const [denominacionBillete, setDenominacionBillete] = useState("Monto exacto");

  // Tab de datos bancarios activos: 'pago_movil' | 'transferencia' | 'binance' | 'efectivo'
  const [bancoTab, setBancoTab] = useState<"pago_movil" | "transferencia" | "binance" | "efectivo">("pago_movil");

  // Datos bancarios de configuracion_tienda
  const [configTienda, setConfigTienda] = useState<ConfiguracionTiendaData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Referencia y Comprobante
  const [referenciaPago, setReferenciaPago] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (isCheckoutOpen) {
      cargarConfigTienda();
      cargarPuntosEntrega();
    }
  }, [isCheckoutOpen]);

  async function cargarConfigTienda() {
    try {
      const conf = await obtenerConfiguracionTienda();
      if (conf) setConfigTienda(conf);
    } catch (err) {
      console.warn("Aviso al cargar datos bancarios:", err);
    }
  }

  async function cargarPuntosEntrega() {
    try {
      const { data } = await supabase.from("puntos_entrega").select("*").eq("activo", true);
      if (Array.isArray(data) && data.length > 0) {
        setPuntosEntrega(data);
        setPuntoSeleccionadoId(String(data[0].id));
      }
    } catch (err) {
      console.warn("Usando puntos por defecto:", err);
    }
  }

  function copyToClipboard(text: string, fieldName: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoComprobante(true);
    setUploadError("");

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const cleanBase = (file.name || "comprobante")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 20);
      const fileName = `comprobante-${Date.now()}-${cleanBase}.${ext}`;

      let bucketName = "comprobantes";
      let uploadRes = await supabase.storage.from(bucketName).upload(fileName, file);

      if (uploadRes.error) {
        bucketName = "productos";
        uploadRes = await supabase.storage.from(bucketName).upload(fileName, file);
      }

      if (uploadRes.error) {
        throw new Error(uploadRes.error.message || "No se pudo subir a Supabase Storage.");
      }

      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      if (publicData?.publicUrl) {
        setComprobanteUrl(publicData.publicUrl);
      }
    } catch (err: any) {
      console.error("Error subiendo comprobante:", err);
      setUploadError(err.message || "Error al subir comprobante a Supabase.");
    } finally {
      setSubiendoComprobante(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!nombre.trim() || !cedula.trim() || !telefono.trim()) {
      setErrorMsg("Por favor completa tu Nombre, Cédula y Teléfono WhatsApp.");
      return;
    }

    if (metodoEntrega !== "personal" && !direccion.trim()) {
      setErrorMsg("Indica la dirección o agencia de envío (Zoom, Tealca o MRW).");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Tu carrito está vacío.");
      return;
    }

    setLoading(true);

    try {
      const puntoObj = puntosEntrega.find((p) => p.id === puntoSeleccionadoId);
      const direccionFinal =
        metodoEntrega === "personal"
          ? `Entrega Personal en: ${puntoObj?.nombre || "Punto acordado"}`
          : direccion.trim();

      const itemsPayload = items.map((i) => ({
        productoId: i.producto.id,
        titulo: i.producto.titulo || i.producto.nombre || "Producto",
        unidadMedida: i.producto.unidad_medida || "unidad",
        precioUsd:
          i.producto.en_oferta && i.producto.precio_oferta
            ? i.producto.precio_oferta
            : (i.producto.precio_usd ?? i.producto.precio_base),
        cantidad: i.cantidad,
      }));

      const res = await crearPedidoAction({
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        telefono: telefono.trim(),
        direccion: direccionFinal,
        metodoEntrega,
        referenciaPago: referenciaPago.trim() || null,
        comprobanteUrl: comprobanteUrl || null,
        notas: notas.trim() || null,
        subtotalUSD,
        subtotalVES,
        abonoUSD,
        abonoVES,
        saldoPendienteUSD: tipoPago === "total_100" ? 0 : saldoPendienteUSD,
        saldoPendienteVES: tipoPago === "total_100" ? 0 : saldoPendienteVES,
        tasaBcv,
        items: itemsPayload,
        // Datos Stitch
        tipoEntrega: metodoEntrega === "personal" ? "personal" : "nacional",
        puntoEntregaId: metodoEntrega === "personal" ? puntoSeleccionadoId : null,
        puntoEntregaNombre: metodoEntrega === "personal" ? puntoObj?.nombre : null,
        fechaEntrega: metodoEntrega === "personal" ? fechaEntrega : null,
        horaEntrega: metodoEntrega === "personal" ? horaEntrega : null,
        metodoPagoSitio: metodoEntrega === "personal" ? metodoPagoSitio : null,
        denominacionBillete: metodoEntrega === "personal" ? denominacionBillete : null,
        tipoPago,
      });

      if (!res.success) {
        throw new Error(res.error || "No se pudo registrar el encargo.");
      }

      limpiarCarrito();
      setIsCheckoutOpen(false);

      const trackingId = res.numeroOrden || res.pedidoId;
      router.push(`/pedido/${trackingId}`);
    } catch (err: any) {
      console.error("Error al confirmar encargo:", err);
      setErrorMsg(err.message || "Error al procesar el pedido.");
      setLoading(false);
    }
  }

  if (!isCheckoutOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 overflow-hidden my-0 sm:my-auto max-h-[92dvh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#064E3B] text-[#84CC16] flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                Confirmar y Reservar Encargo
              </h2>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Reserva hoy con 50% de abono o pago completo 100%
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modalidad de Pago (Selector 50% vs 100%) */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-slate-200/90 space-y-3">
            <span className="font-display font-bold text-xs text-slate-700 block">
              1. Selecciona Modalidad de Pago:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoPago("abono_50")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipoPago === "abono_50"
                    ? "border-[#064E3B] bg-[#064E3B]/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-xs text-[#064E3B]">
                    Abono del 50%
                  </span>
                  <span className="w-4 h-4 rounded-full bg-[#84CC16] text-[#14532D] text-[10px] font-black flex items-center justify-center">
                    ✓
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pagas hoy <strong className="text-slate-800">{formatoUSD(abonoUSD)}</strong> y el resto al recibir.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTipoPago("total_100")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tipoPago === "total_100"
                    ? "border-[#064E3B] bg-[#064E3B]/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-xs text-slate-900">
                    Pago 100% Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pagas el total <strong className="text-slate-800">{formatoUSD(subtotalUSD)}</strong> de inmediato.
                </p>
              </button>
            </div>
          </div>

          {/* Datos Personales */}
          <div className="space-y-3">
            <span className="font-display font-bold text-xs text-slate-700 block">
              2. Datos del Destinatario:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Roberto Gómez"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Cédula / RIF *</label>
                <input
                  type="text"
                  required
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: V-24123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Teléfono WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 0412-1234567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Método de Entrega: Nacional vs Entrega Personal */}
          <div className="space-y-3">
            <span className="font-display font-bold text-xs text-slate-700 block">
              3. Método de Despacho:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "zoom", label: "Zoom", sub: "Nacional" },
                { id: "tealca", label: "Tealca", sub: "Nacional" },
                { id: "mrw", label: "MRW", sub: "Nacional" },
                { id: "personal", label: "Personal", sub: "Punto Seguro" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoEntrega(m.id as MetodoEntrega)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    metodoEntrega === m.id
                      ? "border-[#064E3B] bg-[#064E3B] text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="font-display font-black text-xs block">{m.label}</span>
                  <span className={`text-[10px] block ${metodoEntrega === m.id ? "text-emerald-200" : "text-slate-400"}`}>
                    {m.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Campos condicionales de entrega */}
            {metodoEntrega === "personal" ? (
              <div className="p-4 rounded-2xl bg-[#064E3B]/5 border border-[#064E3B]/20 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#064E3B]">
                  <KeyRound className="w-4 h-4 text-[#84CC16]" />
                  <span>Entrega Personal Segura (Protegida con PIN de 4 dígitos)</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Punto Seguro de Encuentro:
                  </label>
                  <select
                    value={puntoSeleccionadoId}
                    onChange={(e) => setPuntoSeleccionadoId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-[#064E3B] outline-none"
                  >
                    {puntosEntrega.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.horario ? `(${p.horario})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Método de Pago para Saldo en Sitio:
                    </label>
                    <select
                      value={metodoPagoSitio}
                      onChange={(e) => setMetodoPagoSitio(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-[#064E3B] outline-none"
                    >
                      <option value="efectivo_usd">Efectivo Divisas (USD)</option>
                      <option value="pago_movil_sitio">Pago Móvil en Sitio</option>
                      <option value="efectivo_ves">Efectivo Bolívares (VES)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Denominación de Billete (para cambio exacto):
                    </label>
                    <select
                      value={denominacionBillete}
                      onChange={(e) => setDenominacionBillete(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-[#064E3B] outline-none"
                    >
                      <option value="Monto exacto">Monto Exacto (Sin cambio)</option>
                      <option value="Billete de $20">Tengo billete de $20</option>
                      <option value="Billete de $50">Tengo billete de $50</option>
                      <option value="Billete de $100">Tengo billete de $100</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Dirección o Código de Agencia {metodoEntrega.toUpperCase()} *
                </label>
                <input
                  type="text"
                  required
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Agencia Zoom Ocumare Centro, Calle Miranda N° 12"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] outline-none"
                />
              </div>
            )}
          </div>

          {/* Cuentas Bancarias y Pasarela */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs text-slate-700 block">
                4. Realiza tu Pago ({formatoUSD(montoPagarUSD)} / {formatoVES(montoPagarVES)}):
              </span>
              <span className="text-[11px] font-bold text-amber-700">
                Tasa BCV: Bs. {tasaBcv.toFixed(2)}
              </span>
            </div>

            {/* Tabs de métodos bancarios */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setBancoTab("pago_movil")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  bancoTab === "pago_movil"
                    ? "bg-[#064E3B] text-[#84CC16]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Pago Móvil
              </button>
              <button
                type="button"
                onClick={() => setBancoTab("transferencia")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  bancoTab === "transferencia"
                    ? "bg-[#064E3B] text-[#84CC16]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => setBancoTab("binance")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  bancoTab === "binance"
                    ? "bg-[#064E3B] text-[#84CC16]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Binance / USDT
              </button>
            </div>

            {/* Datos del banco activo */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-slate-200 text-xs space-y-2">
              {bancoTab === "pago_movil" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Banco:</span>
                    <span className="font-bold text-slate-800">{configTienda?.pago_movil_banco || "Banco de Venezuela (0102)"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Teléfono:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(configTienda?.pago_movil_telefono || "04121234567", "pm_tel")}
                      className="font-mono font-bold text-[#064E3B] flex items-center gap-1 hover:underline"
                    >
                      <span>{configTienda?.pago_movil_telefono || "0412-1234567"}</span>
                      {copiedField === "pm_tel" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">C.I. / RIF:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(configTienda?.pago_movil_cedula || "V-12345678", "pm_ci")}
                      className="font-mono font-bold text-[#064E3B] flex items-center gap-1 hover:underline"
                    >
                      <span>{configTienda?.pago_movil_cedula || "V-12345678"}</span>
                      {copiedField === "pm_ci" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {bancoTab === "transferencia" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Banco:</span>
                    <span className="font-bold text-slate-800">{configTienda?.transferencia_banco || "Banesco (0134)"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Cuenta:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(configTienda?.transferencia_cuenta || "01340000000000000000", "tr_cta")}
                      className="font-mono font-bold text-[#064E3B] flex items-center gap-1 hover:underline"
                    >
                      <span className="text-[11px] truncate max-w-[180px]">{configTienda?.transferencia_cuenta || "0134-0000-00-0000000000"}</span>
                      {copiedField === "tr_cta" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Titular:</span>
                    <span className="font-bold text-slate-800">{configTienda?.transferencia_beneficiario || "Encargos Boutique C.A."}</span>
                  </div>
                </div>
              )}

              {bancoTab === "binance" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Binance Pay ID:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(configTienda?.binance_pay_id || "49812903", "bin_id")}
                      className="font-mono font-bold text-[#064E3B] flex items-center gap-1 hover:underline"
                    >
                      <span>{configTienda?.binance_pay_id || "49812903"}</span>
                      {copiedField === "bin_id" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Email Binance:</span>
                    <span className="font-bold text-slate-800">{configTienda?.binance_pay_email || "pagos@ocumarehub.com"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Referencia de Pago y Subida de Capture */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Número de Referencia de Pago:
                </label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: 123456 o 009871"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Capture del Pago (Opcional):
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="comprobanteFileInput"
                  />
                  <label
                    htmlFor="comprobanteFileInput"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-[#064E3B] bg-stone-50 hover:bg-stone-100 cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition-colors"
                  >
                    {subiendoComprobante ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#064E3B]" />
                    ) : comprobanteUrl ? (
                      <FileCheck2 className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="truncate">
                      {subiendoComprobante ? "Subiendo..." : comprobanteUrl ? "¡Comprobante Adjunto!" : "Subir Capture"}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            {uploadError && <span className="text-[11px] text-red-600 font-semibold">{uploadError}</span>}
          </div>

          {/* Botón de Confirmación */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-[#14532D] font-display font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#84CC16]/25 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Procesando y generando orden...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmar y Reservar Encargo ({formatoUSD(montoPagarUSD)})</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              🔒 Al confirmar, serás redirigido al rastreo en vivo y chat P2P con el vendedor.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
