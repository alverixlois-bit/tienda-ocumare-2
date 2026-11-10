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
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import { OrdenInsert, OrdenItemInsert, MetodoEntrega } from "@/types/database.types";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { obtenerConfiguracionTienda, ConfiguracionTiendaData } from "@/actions/config";
import { crearPedidoAction } from "@/actions/orders";

export function CheckoutModal() {
  const router = useRouter();
  const {
    items,
    isCheckoutOpen,
    setIsCheckoutOpen,
    subtotalUSD,
    subtotalVES,
    abonoUSD,
    abonoVES,
    saldoPendienteUSD,
    saldoPendienteVES,
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
    }
  }, [isCheckoutOpen]);

  async function cargarConfigTienda() {
    try {
      const conf = await obtenerConfiguracionTienda();
      if (conf) {
        setConfigTienda(conf);
      }
    } catch (err) {
      console.warn("Aviso al cargar datos bancarios:", err);
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
        .substring(0, file.name.lastIndexOf(".") || file.name.length)
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = `comprobantes/${Date.now()}_${cleanBase}.${ext}`;

      const { data, error } = await supabase.storage
        .from("productos")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (error) {
        console.error("Error al subir comprobante a Supabase Storage:", error);
        setUploadError(`Error de subida: ${error.message}`);
        return;
      }

      const { data: pubData } = supabase.storage.from("productos").getPublicUrl(filePath);
      if (pubData && pubData.publicUrl) {
        setComprobanteUrl(pubData.publicUrl);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar archivo";
      setUploadError(msg);
    } finally {
      setSubiendoComprobante(false);
    }
  }

  if (!isCheckoutOpen) return null;

  async function handleConfirmOrder(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const listaItems = Array.isArray(items) ? items : [];

    if (listaItems.length === 0) {
      setErrorMsg("El carrito está vacío");
      setLoading(false);
      return;
    }

    try {
      const formattedItems = listaItems.map((item) => {
        const precioUsd =
          item.producto.en_oferta && item.producto.precio_oferta
            ? item.producto.precio_oferta
            : item.producto.precio_base;

        return {
          productoId: item.producto.id,
          titulo: item.producto.titulo || item.producto.nombre || "Producto",
          unidadMedida: item.producto.unidad_medida,
          precioUsd,
          cantidad: item.cantidad,
        };
      });

      const res = await crearPedidoAction({
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        metodoEntrega,
        referenciaPago: referenciaPago.trim() || null,
        comprobanteUrl: comprobanteUrl || null,
        notas: notas.trim() || null,
        subtotalUSD,
        subtotalVES,
        abonoUSD,
        abonoVES,
        saldoPendienteUSD,
        saldoPendienteVES,
        tasaBcv,
        items: formattedItems,
      });

      if (!res.success || !res.pedidoId) {
        throw new Error(res.error || "No se pudo crear el pedido");
      }

      // Limpiar carrito y redirigir
      limpiarCarrito();
      setIsCheckoutOpen(false);
      router.push(`/pedido/${res.pedidoId}`);
    } catch (err: unknown) {
      console.error("Error al procesar checkout:", err);
      const msg = err instanceof Error ? err.message : "Error al procesar el encargo";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  // Datos bancarios fallback
  const pagoMovilBanco = configTienda?.pago_movil_banco || "0102 - Banco de Venezuela";
  const pagoMovilTelefono = configTienda?.pago_movil_telefono || "04121234567";
  const pagoMovilCedula = configTienda?.pago_movil_cedula || "V-12345678";

  const transfBanco = configTienda?.transferencia_banco || "Banesco Banco Universal";
  const transfCuenta = configTienda?.transferencia_cuenta || "0134-0000-00-0000000000";
  const transfTitular = configTienda?.transferencia_beneficiario || "OcumareHub C.A.";
  const transfRif = configTienda?.transferencia_rif || "J-12345678-0";

  const binanceEmail = configTienda?.binance_pay_email?.trim();
  const binanceId = configTienda?.binance_pay_id?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white text-base">Finalizar Pedido por Encargo</h2>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirmOrder} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Caja Resumen Financiero 50% Abono */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-300 font-semibold block">
                Abono Requerido para Iniciar Pedido (50%):
              </span>
              <span className="text-xl font-extrabold text-white font-mono">
                {formatoUSD(abonoUSD)}
              </span>
              <span className="text-xs text-emerald-400 font-mono block">
                = {formatoVES(abonoVES)} (Tasa BCV: {tasaBcv.toFixed(2)})
              </span>
            </div>

            <div className="text-right text-xs text-slate-400">
              <span className="block font-medium">Saldo contra entrega:</span>
              <span className="font-mono text-white font-semibold">
                {formatoUSD(saldoPendienteUSD)}
              </span>
            </div>
          </div>

          {/* PASARELA DE PAGO: CUENTAS RECEPTORAS OFICIALES */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              Cuentas Oficiales para el Abono del 50%
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Opción 1: Pago Móvil */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-white text-[11px] text-cyan-300">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Pago Móvil</span>
                </div>
                <p className="text-slate-400 text-[11px] truncate">
                  <span className="text-slate-500">Banco:</span> {pagoMovilBanco}
                </p>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-white font-semibold">{pagoMovilTelefono}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pagoMovilTelefono, "pago_movil_telf")}
                    className="p-1 hover:text-white text-slate-400"
                    title="Copiar teléfono"
                  >
                    {copiedField === "pago_movil_telf" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-300">{pagoMovilCedula}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pagoMovilCedula, "pago_movil_ced")}
                    className="p-1 hover:text-white text-slate-400"
                    title="Copiar Cédula"
                  >
                    {copiedField === "pago_movil_ced" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Opción 2: Transferencia Bancaria */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-white text-[11px] text-teal-300">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Transferencia Bancaria</span>
                </div>
                <p className="text-slate-400 text-[11px] truncate">
                  <span className="text-slate-500">Banco:</span> {transfBanco}
                </p>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-teal-300 font-semibold truncate max-w-[130px]">{transfCuenta}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(transfCuenta, "transf_cta")}
                    className="p-1 hover:text-white text-slate-400"
                    title="Copiar cuenta"
                  >
                    {copiedField === "transf_cta" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-300 truncate max-w-[130px]">{transfRif}</span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{transfTitular}</span>
                </div>
              </div>
            </div>

            {/* Binance Pay si está disponible */}
            {(binanceEmail || binanceId) && (
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Binance Pay: {binanceEmail || binanceId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard((binanceEmail || binanceId)!, "binance_checkout")}
                  className="p-1 hover:text-white text-slate-400"
                  title="Copiar Binance"
                >
                  {copiedField === "binance_checkout" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* DATOS DEL COMPROBANTE Y REFERENCIA DE PAGO */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Reporte del Pago (Opcional o recomendado)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Referencia bancaria */}
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Número de Referencia Bancaria
                </label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej. 123456 o 4 últimos dígitos"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Subida de Capture / Comprobante */}
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Foto o Capture del Pago
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="comprobante-upload"
                  />
                  <label
                    htmlFor="comprobante-upload"
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-dashed border-slate-700 hover:border-cyan-500 rounded-xl text-xs text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    {subiendoComprobante ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>Subiendo...</span>
                      </>
                    ) : comprobanteUrl ? (
                      <>
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold truncate max-w-[140px]">
                          Capture adjunto
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                        <span>Adjuntar Capture</span>
                      </>
                    )}
                  </label>
                </div>
                {uploadError && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{uploadError}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Datos Personales */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nombre y Apellido *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Cédula / RIF *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="V-12345678"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="0412 1234567"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Método de Entrega */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Método de Envío o Entrega *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "zoom", label: "ZOOM" },
                  { id: "mrw", label: "MRW" },
                  { id: "tealca", label: "TEALCA" },
                  { id: "personal", label: "PERSONAL" },
                ] as const
              ).map((metodo) => (
                <button
                  type="button"
                  key={metodo.id}
                  onClick={() => setMetodoEntrega(metodo.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    metodoEntrega === metodo.id
                      ? "bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20"
                      : "bg-slate-950 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {metodo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dirección o Agencia destino */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Dirección de Entrega / Sucursal de Agencia *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ciudad, Agencia receptora o dirección exacta de entrega..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Indicaciones adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles de tallas, colores o especificaciones del encargo..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              disabled={loading || subiendoComprobante}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={loading || subiendoComprobante}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{loading ? "Creando Orden..." : "Confirmar Encargo"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}