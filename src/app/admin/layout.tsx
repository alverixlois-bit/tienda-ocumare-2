import React from "react";
import Link from "next/link";
import { Store, ShieldCheck, ArrowLeft, LayoutDashboard } from "lucide-react";

export const metadata = {
  title: "Panel Administrativo del Vendedor | OcumareHub",
  description: "Panel de control para inventario, tasa BCV, órdenes por encargo y chat P2P en tiempo real.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Admin */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Volver a la tienda"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="h-6 w-[1px] bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
                  Panel del Vendedor
                </span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-wide">
                  OcumareHub • Administración
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Supabase Activo
            </span>

            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
            >
              Ver Tienda Virtual
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </div>

      {/* Footer Admin */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        OcumareHub &copy; {new Date().getFullYear()} — Sistema de Gestión y Ventas por Encargo (Venezuela).
      </footer>
    </div>
  );
}
