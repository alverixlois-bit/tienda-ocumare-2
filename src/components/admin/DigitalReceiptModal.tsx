"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Share2, Copy, Check, Download, QrCode, Printer } from "lucide-react";
import { formatoUSD, formatoVES } from "@/utils/currency";

interface DigitalReceiptModalProps {
  orden: {
    numero: string;
    cliente_nombre: string;
    cliente_telefono?: string | null;
    cliente_cedula?: string | null;
    metodo_entrega?: string | null;
    direccion_entrega?: string | null;
    total_usd: number;
    monto_inicial_usd: number;
    saldo_restante_usd: number;
    estado: string;
    created_at: string;
    referencia_pago?: string | null;
    guia_seguimiento?: string | null;
  };
  tasaBcv: number;
  onClose: () => void;
}

export function DigitalReceiptModal({ orden, tasaBcv, onClose }: DigitalReceiptModalProps) {
  const [copiado, setCopiado] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const abonoUsd = orden.monto_inicial_usd || orden.total_usd / 2;
  const saldoUsd = orden.saldo_restante_usd || orden.total_usd - abonoUsd;
  const fechaStr = new Date(orden.created_at).toLocaleDateString("es-VE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  // ✅ Generar QR real con la librería qrcode
  useEffect(() => {
    if (!qrCanvasRef.current) return;
    const qrUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pedido/${orden.numero}`;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(qrCanvasRef.current!, qrUrl, {
        width: 96,
        margin: 1,
        color: { dark: "#0F172A", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      }).catch(console.warn);
    });
  }, [orden.numero]);

  const shareText =
    `🧾 *COMPROBANTE DIGITAL — BOUTIQUE POR ENCARGO*\n\n` +
    `📌 *Orden:* #${orden.numero}\n` +
    `👤 *Cliente:* ${orden.cliente_nombre}\n` +
    (orden.cliente_telefono ? `📱 *Tel:* ${orden.cliente_telefono}\n` : "") +
    (orden.metodo_entrega ? `🚚 *Modalidad:* ${orden.metodo_entrega.toUpperCase()}\n` : "") +
    (orden.guia_seguimiento ? `📦 *Guía:* ${orden.guia_seguimiento}\n` : "") +
    `\n💵 *Total Encargo:* ${formatoUSD(orden.total_usd)} (${formatoVES(orden.total_usd * tasaBcv)})\n` +
    `✅ *Abono 50% Verificado:* ${formatoUSD(abonoUsd)} (${formatoVES(abonoUsd * tasaBcv)})\n` +
    `⏳ *Saldo 50% Contra Entrega:* ${formatoUSD(saldoUsd)} (${formatoVES(saldoUsd * tasaBcv)})\n` +
    `🏦 *Tasa Oficial BCV:* Bs. ${tasaBcv.toFixed(2)}\n\n` +
    `Rastrea tu encargo: ${typeof window !== "undefined" ? window.location.origin : ""}/pedido/${orden.numero}`;

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(shareText);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (orden.cliente_telefono || "").replace(/\D/g, "");
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith("58") ? cleanPhone : "58" + cleanPhone.replace(/^0/, "")}&text=${encodeURIComponent(shareText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full sm:max-w-lg bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-slate-200 space-y-4 my-0 sm:my-8 max-h-[92dvh] overflow-y-auto">

        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center -mt-2 mb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#064E3B] flex items-center justify-center text-white shadow-sm shrink-0">
              <span className="font-bold text-[#84CC16] text-lg">💎</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-950 text-base leading-tight">BOUTIQUE POR ENCARGO</h2>
              <p className="text-[11px] text-slate-500">R.I.F. J-50291823-1 • Importaciones Directas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {orden.estado === "entregado" ? "FINALIZADO" : "VÁLIDO"}
            </span>
            <button
              type="button" onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Datos del Cliente */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Comprobante Nº:</span>
            <span className="font-mono font-bold text-slate-950">#{orden.numero}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Cliente Receptor:</span>
            <strong className="text-slate-900">{orden.cliente_nombre}</strong>
          </div>
          {orden.cliente_telefono && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">WhatsApp / Teléfono:</span>
              <span className="font-mono text-slate-700">{orden.cliente_telefono}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Fecha de Emisión:</span>
            <span className="font-mono text-slate-700">{fechaStr}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Modalidad de Entrega:</span>
            <span className="font-semibold text-emerald-900 uppercase">{orden.metodo_entrega || "Entrega Personal"}</span>
          </div>
          {orden.guia_seguimiento && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Guía de Despacho:</span>
              <span className="font-mono font-bold text-blue-700">{orden.guia_seguimiento}</span>
            </div>
          )}
        </div>

        {/* Resumen Financiero 50/50 */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-emerald-950 font-bold">
            <span>Modalidad de Pago Dividido:</span>
            <span className="bg-emerald-200 text-emerald-950 text-[10px] px-2 py-0.5 rounded-full">50% Abono / 50% Entrega</span>
          </div>

          {/* Total */}
          <div className="flex justify-between py-1 border-b border-emerald-100">
            <span className="text-slate-600">Total del Encargo:</span>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900 block">{formatoUSD(orden.total_usd)}</span>
              <span className="font-mono text-[10px] text-slate-500">{formatoVES(orden.total_usd * tasaBcv)}</span>
            </div>
          </div>

          {/* Abono */}
          <div className="flex items-center justify-between py-1.5 border-b border-emerald-200">
            <div>
              <span className="font-semibold text-slate-800 block">Abono Inicial 50% (VERIFICADO):</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {orden.referencia_pago ? `Ref: ${orden.referencia_pago}` : "Transferencia / Pago Móvil"}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-800 block">{formatoUSD(abonoUsd)}</span>
              <span className="font-mono text-[10px] text-emerald-700 block">{formatoVES(abonoUsd * tasaBcv)}</span>
            </div>
          </div>

          {/* Saldo */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="font-semibold text-amber-950 block">Saldo Restante 50% (CONTRA ENTREGA):</span>
              <span className="text-[10px] text-slate-500">A cancelar al retirar en divisas o Pago Móvil</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-amber-900 block">{formatoUSD(saldoUsd)}</span>
              <span className="font-mono text-[10px] text-amber-800 block">{formatoVES(saldoUsd * tasaBcv)}</span>
            </div>
          </div>
        </div>

        {/* ✅ QR REAL + Tasa BCV */}
        <div className="p-4 bg-slate-900 rounded-2xl text-white flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[10px] text-[#84CC16] font-bold uppercase tracking-widest block">
              Código QR de Verificación
            </span>
            <p className="text-[11px] text-slate-300 leading-tight">
              Escanea para ver el estatus del encargo en vivo y verificar autenticidad.
            </p>
            <div className="font-mono text-[11px] text-slate-400">
              Tasa BCV Fijada:{" "}
              <strong className="text-[#84CC16]">Bs. {tasaBcv.toFixed(2)} / USD</strong>
            </div>
            <p className="text-[9px] text-slate-500 font-mono break-all">
              /pedido/{orden.numero}
            </p>
          </div>

          {/* Canvas con QR real */}
          <div className="w-24 h-24 bg-white p-1.5 rounded-xl shrink-0 flex items-center justify-center shadow-md">
            <canvas ref={qrCanvasRef} className="w-full h-full rounded-lg" />
          </div>
        </div>

        {/* Talón para Paquete */}
        <div className="border-t-2 border-dashed border-slate-300 pt-3">
          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-300 text-slate-900 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 uppercase tracking-wide text-[11px]">
                📦 Talón de Despacho & Entrega Física
              </span>
              <span className="font-mono text-[9px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                PEGA EN PAQUETE
              </span>
            </div>
            <p className="font-bold text-slate-950">Destinatario: {orden.cliente_nombre}</p>
            <p className="text-slate-600 text-[11px]">
              Orden #{orden.numero} • Destino: {orden.direccion_entrega || "Punto de entrega"}
            </p>
            <p className="text-[10px] text-slate-500 font-mono text-center pt-1">
              ✂ Cortar por la línea punteada para adherir a la caja del pedido
            </p>
          </div>
        </div>

        <p className="font-mono text-[9px] text-slate-400 text-center leading-relaxed">
          Documento mercantil digital. Válido como comprobante privado de encargo y garantía de Boutique Por Encargo.
        </p>

        {/* Acciones */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button" onClick={handleWhatsAppShare}
            className="py-2.5 px-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button" onClick={() => window.print()}
            className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            type="button" onClick={handleCopiarTexto}
            className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiado ? "¡Copiado!" : "Copiar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
