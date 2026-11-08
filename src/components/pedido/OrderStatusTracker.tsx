"use client";

import React from "react";
import { Check, Clock, Package, Truck, CheckCircle2 } from "lucide-react";
import { EstadoOrden } from "@/types/database.types";

interface OrderStatusTrackerProps {
  estado: EstadoOrden;
}

export function OrderStatusTracker({ estado }: OrderStatusTrackerProps) {
  // Determinar paso activo (1 a 5)
  let currentStep = 1;
  if (estado === "pendiente" || estado === "pendiente_abono") currentStep = 1;
  else if (estado === "pagada" || estado === "abono_verificado") currentStep = 2;
  else if (estado === "procesando" || estado === "en_preparacion") currentStep = 3;
  else if (estado === "despachado") currentStep = 4;
  else if (estado === "completada" || estado === "entregado") currentStep = 5;

  const pasos = [
    { step: 1, label: "Encargo Creado", desc: "Pendiente Abono 50%", icon: Clock },
    { step: 2, label: "Abono Verificado", desc: "Pago 50% Aprobado", icon: CheckCircle2 },
    { step: 3, label: "En Preparación", desc: "Alistando producto", icon: Package },
    { step: 4, label: "Despachado", desc: "En camino por agencia", icon: Truck },
    { step: 5, label: "Entregado", desc: "Finalizado con éxito", icon: Check },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
        Estado del Envío y Progreso del Encargo
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
        {pasos.map((p, idx) => {
          const Icon = p.icon;
          const isDone = currentStep > p.step;
          const isCurrent = currentStep === p.step;

          return (
            <div key={p.step} className="flex sm:flex-col items-center gap-3 text-left sm:text-center relative">
              {/* Círculo del icono */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold transition-all ${
                  isDone
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : isCurrent
                    ? "bg-cyan-500 text-white ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30"
                    : "bg-slate-950 border border-slate-800 text-slate-600"
                }`}
              >
                {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : <Icon className="w-5 h-5" />}
              </div>

              {/* Textos */}
              <div>
                <span
                  className={`text-xs font-bold block ${
                    isCurrent
                      ? "text-cyan-400"
                      : isDone
                      ? "text-slate-200"
                      : "text-slate-500"
                  }`}
                >
                  {p.label}
                </span>
                <span className="text-[11px] text-slate-400 block sm:mt-0.5">
                  {p.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
