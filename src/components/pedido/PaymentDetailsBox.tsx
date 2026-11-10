"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Smartphone,
  Landmark,
  ShieldCheck,
  DollarSign,
  Coins,
  FileText,
} from "lucide-react";
import { formatoUSD, formatoVES } from "@/utils/currency";
import { ConfiguracionTiendaData } from "@/actions/config";

interface PaymentDetailsBoxProps {
  montoAbonoUsd: string | number;
  montoAbonoVes: string | number;
  tasaBcv: string | number;
  configTienda?: ConfiguracionTiendaData | null;
}

export function PaymentDetailsBox({
  montoAbonoUsd,
  montoAbonoVes,
  tasaBcv,
  configTienda,
}: PaymentDetailsBoxProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, fieldName: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const datosPagoMovil = {
    banco: configTienda?.pago_movil_banco || "0102 - Banco de Venezuela",
    telefono: configTienda?.pago_movil_telefono || "04121234567",
    cedula: configTienda?.pago_movil_cedula || "V-12345678",
  };

  const datosTransferencia = {
    banco: configTienda?.transferencia_banco || "Banesco Banco Universal",
    cuenta: configTienda?.transferencia_cuenta || "0134-0000-00-0000000000",
    titular: configTienda?.transferencia_beneficiario || "OcumareHub Comercio C.A.",
    rif: configTienda?.transferencia_rif || "J-12345678-0",
  };

  const binanceEmail = configTienda?.binance_pay_email?.trim();
  const binanceId = configTienda?.binance_pay_id?.trim();
  const otrosMetodos = configTienda?.otros_metodos_pago?.trim();

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 backdrop-blur shadow-xl space-y-4">
      {/* Encabezado del Pago */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Abono Inicial del 50% para Procesar
            </h3>
            <p className="text-xs text-slate-400">
              Realiza el pago del 50% por Pago Móvil, Transferencia o Cripto
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {formatoUSD(montoAbonoUsd)}
          </span>
          <span className="text-xs font-bold text-slate-300 font-mono block">
            = {formatoVES(montoAbonoVes)} (Tasa BCV: {parseFloat(String(tasaBcv)).toFixed(2)})
          </span>
        </div>
      </div>

      {/* Grid de Métodos de Pago Nacionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pago Móvil */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wide">
            <Smartphone className="w-4 h-4" />
            <span>Opción 1: Pago Móvil (Instantáneo)</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Banco:</span>
              <span className="font-semibold text-white truncate max-w-[180px]">{datosPagoMovil.banco}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Teléfono:</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-white">{datosPagoMovil.telefono}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(datosPagoMovil.telefono, "telefono")}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  title="Copiar teléfono"
                >
                  {copiedField === "telefono" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Cédula:</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-white">{datosPagoMovil.cedula}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(datosPagoMovil.cedula, "cedula")}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  title="Copiar cédula"
                >
                  {copiedField === "cedula" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transferencia Bancaria */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wide">
            <Landmark className="w-4 h-4" />
            <span>Opción 2: Transferencia Bancaria</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Banco:</span>
              <span className="font-semibold text-white truncate max-w-[180px]">{datosTransferencia.banco}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Nº de Cuenta:</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-white truncate max-w-[150px]">
                  {datosTransferencia.cuenta}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(datosTransferencia.cuenta, "cuenta")}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  title="Copiar cuenta"
                >
                  {copiedField === "cuenta" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">RIF / Titular:</span>
              <span className="font-mono text-white text-right truncate max-w-[180px]">
                {datosTransferencia.rif} &bull; {datosTransferencia.titular}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Binance Pay o Métodos Adicionales si están configurados */}
      {(binanceEmail || binanceId || otrosMetodos) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {(binanceEmail || binanceId) && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wide">
                <Coins className="w-4 h-4" />
                <span>Binance Pay (Cripto USDT)</span>
              </div>
              {binanceEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Correo Binance:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-white">{binanceEmail}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(binanceEmail, "binance_email")}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {copiedField === "binance_email" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
              {binanceId && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Binance ID:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-white">{binanceId}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(binanceId, "binance_id")}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {copiedField === "binance_id" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {otrosMetodos && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wide">
                <FileText className="w-4 h-4" />
                <span>Otros Métodos / Instrucciones</span>
              </div>
              <p className="text-slate-300 whitespace-pre-line leading-relaxed text-[11px]">
                {otrosMetodos}
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          Al realizar la transferencia o pago móvil, sube la foto o capture en el chat P2P abajo para que el vendedor verifique tu encargo.
        </span>
      </p>
    </div>
  );
}